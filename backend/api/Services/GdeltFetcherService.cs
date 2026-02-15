using System.Text.Json;
using AUSentinel.Api.Data;
using AUSentinel.Api.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace AUSentinel.Api.Services;

/// <summary>
/// Fetches real OSINT articles from the GDELT Project API (free, public).
/// </summary>
public class GdeltFetcherService
{
    private readonly IServiceProvider _sp;
    private readonly ILogger<GdeltFetcherService> _logger;

    public GdeltFetcherService(IServiceProvider sp, ILogger<GdeltFetcherService> logger)
    {
        _sp = sp;
        _logger = logger;
    }

    public async Task FetchAsync()
    {
        _logger.LogInformation("GDELT Fetcher: Starting OSINT data fetch...");

        using var scope = _sp.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var httpFactory = scope.ServiceProvider.GetRequiredService<IHttpClientFactory>();
        var http = httpFactory.CreateClient();
        http.Timeout = TimeSpan.FromSeconds(30);

        var queries = new[]
        {
            "africa security threat",
            "africa conflict crisis",
            "africa terrorism attack",
            "africa health epidemic",
            "africa election politics",
            "africa economy trade",
            "africa flood drought disaster",
            "africa cyber attack",
            "nigeria kenya south africa egypt",
            "sahel horn africa crisis"
        };

        int totalFetched = 0;

        foreach (var query in queries)
        {
            try
            {
                var articles = await FetchGdeltArticles(http, query);
                totalFetched += await StoreArticles(db, articles);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "GDELT Fetcher: Failed for query '{Query}'", query);
            }

            await Task.Delay(500);
        }

        await GenerateAlerts(db);

        _logger.LogInformation("GDELT Fetcher: Done. Stored {Count} articles total", totalFetched);
    }

    private async Task<List<GdeltArticle>> FetchGdeltArticles(HttpClient http, string query)
    {
        var url = $"https://api.gdeltproject.org/api/v2/doc/doc?query={Uri.EscapeDataString(query)}&mode=artlist&maxrecords=25&format=json&sort=datedesc";

        var response = await http.GetAsync(url);
        if (!response.IsSuccessStatusCode)
        {
            _logger.LogWarning("GDELT API returned {Status} for query: {Query}", response.StatusCode, query);
            return new();
        }

        var json = await response.Content.ReadAsStringAsync();
        if (string.IsNullOrWhiteSpace(json) || json.Trim().StartsWith("<!"))
            return new();

        try
        {
            var doc = JsonDocument.Parse(json);
            if (!doc.RootElement.TryGetProperty("articles", out var articlesArray))
                return new();

            var articles = new List<GdeltArticle>();
            foreach (var item in articlesArray.EnumerateArray())
            {
                articles.Add(new GdeltArticle
                {
                    Title = item.TryGetProperty("title", out var t) ? t.GetString() ?? "" : "",
                    Url = item.TryGetProperty("url", out var u) ? u.GetString() ?? "" : "",
                    Source = item.TryGetProperty("domain", out var d) ? d.GetString() ?? "" : "",
                    Language = item.TryGetProperty("language", out var l) ? l.GetString() ?? "English" : "English",
                    SeenDate = item.TryGetProperty("seendate", out var sd) ? sd.GetString() ?? "" : "",
                    SocialImage = item.TryGetProperty("socialimage", out var si) ? si.GetString() : null,
                    SourceCountry = item.TryGetProperty("sourcecountry", out var sc) ? sc.GetString() ?? "" : "",
                });
            }
            return articles;
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(ex, "Failed to parse GDELT JSON for query: {Query}", query);
            return new();
        }
    }

    private async Task<int> StoreArticles(AppDbContext db, List<GdeltArticle> gdeltArticles)
    {
        int stored = 0;
        var source = await db.Sources.FirstOrDefaultAsync(s => s.Id == 1)
                     ?? db.Sources.Local.FirstOrDefault(s => s.Id == 1);

        if (source == null) return 0;

        foreach (var ga in gdeltArticles)
        {
            if (string.IsNullOrWhiteSpace(ga.Title) || string.IsNullOrWhiteSpace(ga.Url))
                continue;

            var hash = OsintClassifier.ComputeHash(ga.Url);
            if (await db.Articles.AnyAsync(a => a.DedupHash == hash)) continue;
            if (db.Articles.Local.Any(a => a.DedupHash == hash)) continue;

            var publishedAt = ParseGdeltDate(ga.SeenDate);
            var (category, threatType, threatLevel) = OsintClassifier.ClassifyArticle(ga.Title);
            var countryTags = OsintClassifier.ExtractCountries(ga.Title + " " + ga.SourceCountry);
            var entities = OsintClassifier.ExtractEntities(ga.Title);

            var lang = ga.Language?.ToLower() switch
            {
                "english" => "en",
                "french" => "fr",
                "arabic" => "ar",
                "portuguese" => "pt",
                "spanish" => "es",
                _ => "en"
            };

            var article = new Article
            {
                Id = Guid.NewGuid(),
                Title = ga.Title.Length > 500 ? ga.Title[..500] : ga.Title,
                Body = ga.Title,
                Url = ga.Url,
                ImageUrl = ga.SocialImage,
                SourceId = source.Id,
                Language = lang,
                PublishedAt = publishedAt,
                IngestedAt = DateTime.UtcNow,
                DedupHash = hash,
                IsProcessed = true,
                IsIndexed = false
            };

            db.Articles.Add(article);

            db.Classifications.Add(new Classification
            {
                ArticleId = article.Id,
                Category = category,
                ThreatType = threatType,
                ThreatLevel = threatLevel,
                CredibilityScore = 0.6 + Random.Shared.NextDouble() * 0.3,
                Summary = ga.Title.Length > 200 ? ga.Title[..200] : ga.Title,
                ClassifiedBy = "rule-based",
                ClassifiedAt = DateTime.UtcNow
            });

            foreach (var code in countryTags.Distinct())
            {
                db.ArticleCountryTags.Add(new ArticleCountryTag
                {
                    ArticleId = article.Id,
                    CountryCode = code
                });
            }

            foreach (var (name, type) in entities)
            {
                db.ArticleEntities.Add(new ArticleEntity
                {
                    ArticleId = article.Id,
                    Name = name,
                    Type = type
                });
            }

            stored++;
        }

        if (stored > 0)
            await db.SaveChangesAsync();

        return stored;
    }

    private async Task GenerateAlerts(AppDbContext db)
    {
        var adminId = Guid.Parse("00000000-0000-0000-0000-000000000001");
        var rule = await db.AlertRules.FirstOrDefaultAsync();
        if (rule == null)
        {
            rule = new AlertRule
            {
                Id = 1,
                Name = "High Threat Auto-Alert",
                CountryCode = "ET",
                MinThreatLevel = 4,
                IsActive = true,
                CreatedByUserId = adminId,
                CreatedAt = DateTime.UtcNow
            };
            db.AlertRules.Add(rule);
            await db.SaveChangesAsync();
        }

        var highThreat = await db.Articles
            .Include(a => a.Classification)
            .Include(a => a.CountryTags)
            .Where(a => a.Classification != null && a.Classification.ThreatLevel >= 4)
            .OrderByDescending(a => a.PublishedAt)
            .Take(20)
            .ToListAsync();

        var existingAlertArticleIds = await db.Alerts
            .Where(a => a.ArticleId != null)
            .Select(a => a.ArticleId)
            .ToListAsync();

        int alertsCreated = 0;
        foreach (var article in highThreat)
        {
            if (existingAlertArticleIds.Contains(article.Id)) continue;

            var countryCode = article.CountryTags.FirstOrDefault()?.CountryCode ?? "ET";
            db.Alerts.Add(new Alert
            {
                AlertRuleId = rule.Id,
                ArticleId = article.Id,
                Title = article.Classification!.ThreatType switch
                {
                    "terrorism" => $"SECURITY ALERT: {article.Title[..Math.Min(100, article.Title.Length)]}",
                    "unrest" => $"UNREST ALERT: {article.Title[..Math.Min(100, article.Title.Length)]}",
                    "epidemic" => $"HEALTH ALERT: {article.Title[..Math.Min(100, article.Title.Length)]}",
                    "flood" => $"DISASTER ALERT: {article.Title[..Math.Min(100, article.Title.Length)]}",
                    "cyber" => $"CYBER ALERT: {article.Title[..Math.Min(100, article.Title.Length)]}",
                    _ => $"ALERT: {article.Title[..Math.Min(100, article.Title.Length)]}"
                },
                Message = $"Threat level {article.Classification.ThreatLevel} {article.Classification.ThreatType} detected in {article.Classification.Category}. Source: {article.Url}",
                Severity = article.Classification.ThreatLevel,
                CountryCode = countryCode,
                IsActive = true,
                CreatedAt = article.PublishedAt
            });
            alertsCreated++;
        }

        if (alertsCreated > 0)
        {
            await db.SaveChangesAsync();
            _logger.LogInformation("GDELT Fetcher: Created {Count} alerts from high-threat articles", alertsCreated);
        }
    }

    private static DateTime ParseGdeltDate(string gdeltDate)
    {
        if (DateTime.TryParseExact(gdeltDate, "yyyyMMdd'T'HHmmss'Z'",
            System.Globalization.CultureInfo.InvariantCulture,
            System.Globalization.DateTimeStyles.AssumeUniversal, out var dt))
            return dt.ToUniversalTime();

        if (DateTime.TryParse(gdeltDate, out var dt2))
            return dt2.ToUniversalTime();

        return DateTime.UtcNow;
    }

    private class GdeltArticle
    {
        public string Title { get; set; } = "";
        public string Url { get; set; } = "";
        public string Source { get; set; } = "";
        public string Language { get; set; } = "English";
        public string SeenDate { get; set; } = "";
        public string? SocialImage { get; set; }
        public string SourceCountry { get; set; } = "";
    }
}
