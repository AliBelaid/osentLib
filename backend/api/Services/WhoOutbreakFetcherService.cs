using System.Xml.Linq;
using AUSentinel.Api.Data;
using AUSentinel.Api.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace AUSentinel.Api.Services;

/// <summary>
/// Fetches disease outbreak news from WHO RSS feed (free, no key).
/// Source: https://www.who.int/feeds/entity/don/en/rss.xml
/// </summary>
public class WhoOutbreakFetcherService
{
    private readonly IServiceProvider _sp;
    private readonly ILogger<WhoOutbreakFetcherService> _logger;

    public WhoOutbreakFetcherService(IServiceProvider sp, ILogger<WhoOutbreakFetcherService> logger)
    {
        _sp = sp;
        _logger = logger;
    }

    public async Task FetchAsync()
    {
        _logger.LogInformation("WHO Outbreak Fetcher: Starting...");

        using var scope = _sp.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var httpFactory = scope.ServiceProvider.GetRequiredService<IHttpClientFactory>();
        var http = httpFactory.CreateClient();
        http.Timeout = TimeSpan.FromSeconds(30);
        http.DefaultRequestHeaders.Add("User-Agent", "AUSentinel/1.0 (OSINT health monitoring)");

        int totalStored = 0;

        try
        {
            var url = "https://www.who.int/feeds/entity/don/en/rss.xml";
            var xml = await http.GetStringAsync(url);
            var doc = XDocument.Parse(xml);

            // Ensure WHO source exists (Id=4)
            var source = await db.Sources.FirstOrDefaultAsync(s => s.Id == 4)
                         ?? db.Sources.Local.FirstOrDefault(s => s.Id == 4);
            if (source == null)
            {
                source = new Source
                {
                    Id = 4,
                    Type = "WHO",
                    Name = "WHO Disease Outbreak News",
                    Url = url,
                    Language = "en",
                    IsActive = true,
                    FetchIntervalMinutes = 120
                };
                db.Sources.Add(source);
                await db.SaveChangesAsync();
            }

            var items = doc.Descendants("item");

            foreach (var item in items)
            {
                var title = item.Element("title")?.Value ?? "";
                if (string.IsNullOrWhiteSpace(title)) continue;

                var link = item.Element("link")?.Value ?? "";
                var description = item.Element("description")?.Value ?? "";
                var dateStr = item.Element("pubDate")?.Value;

                var hash = OsintClassifier.ComputeHash(link.Length > 0 ? link : title);
                if (await db.Articles.AnyAsync(a => a.DedupHash == hash)) continue;
                if (db.Articles.Local.Any(a => a.DedupHash == hash)) continue;

                var publishedAt = DateTime.UtcNow;
                if (!string.IsNullOrEmpty(dateStr) && DateTime.TryParse(dateStr, out var parsed))
                    publishedAt = parsed.ToUniversalTime();

                var fullText = title + " " + description;
                var countryTags = OsintClassifier.ExtractCountries(fullText);

                // WHO outbreak news is always Health category
                var (_, _, baseThreatLevel) = OsintClassifier.ClassifyArticle(fullText);
                var threatLevel = Math.Max(baseThreatLevel, 3); // Minimum 3 for WHO alerts
                var threatType = "epidemic";

                // Check for specific diseases to boost threat
                var titleLower = fullText.ToLower();
                if (titleLower.Contains("ebola") || titleLower.Contains("marburg") ||
                    titleLower.Contains("pandemic") || titleLower.Contains("avian"))
                    threatLevel = 5;
                else if (titleLower.Contains("cholera") || titleLower.Contains("mpox") ||
                         titleLower.Contains("yellow fever") || titleLower.Contains("meningitis"))
                    threatLevel = 4;

                var entities = OsintClassifier.ExtractEntities(title);

                var article = new Article
                {
                    Id = Guid.NewGuid(),
                    Title = title.Length > 500 ? title[..500] : title,
                    Body = description.Length > 0 ? description : title,
                    Url = link,
                    SourceId = source.Id,
                    Language = "en",
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
                    Category = "Health",
                    ThreatType = threatType,
                    ThreatLevel = threatLevel,
                    CredibilityScore = 0.95 + Random.Shared.NextDouble() * 0.05, // WHO = very high credibility
                    Summary = $"[WHO] {(description.Length > 200 ? description[..200] : description)}",
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

                totalStored++;
            }

            if (totalStored > 0)
                await db.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "WHO Outbreak Fetcher: Failed to fetch RSS");
        }

        _logger.LogInformation("WHO Outbreak Fetcher: Done. Stored {Count} articles", totalStored);
    }
}
