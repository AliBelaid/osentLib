using System.Text.Json;
using AUSentinel.Api.Data;
using AUSentinel.Api.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace AUSentinel.Api.Services;

public class ReliefWebFetcherService
{
    private readonly IServiceProvider _sp;
    private readonly ILogger<ReliefWebFetcherService> _logger;

    private static readonly string[] TargetCountries =
    {
        "Nigeria", "Ethiopia", "Sudan", "Democratic Republic of the Congo",
        "Somalia", "Kenya", "South Africa", "Mali", "Mozambique", "Chad",
        "Cameroon", "Niger", "Burkina Faso", "South Sudan", "Libya"
    };

    public ReliefWebFetcherService(IServiceProvider sp, ILogger<ReliefWebFetcherService> logger)
    {
        _sp = sp;
        _logger = logger;
    }

    public async Task FetchAsync()
    {
        _logger.LogInformation("ReliefWeb Fetcher: Starting...");

        using var scope = _sp.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var httpFactory = scope.ServiceProvider.GetRequiredService<IHttpClientFactory>();
        var http = httpFactory.CreateClient();
        http.Timeout = TimeSpan.FromSeconds(30);
        http.DefaultRequestHeaders.Add("User-Agent", "AUSentinel/1.0 (OSINT monitoring)");

        int totalStored = 0;

        foreach (var country in TargetCountries)
        {
            try
            {
                var url = $"https://api.reliefweb.int/v2/reports?appname=ausentinel&limit=20" +
                          $"&filter[field]=country&filter[value][]={Uri.EscapeDataString(country)}" +
                          $"&fields[include][]=title&fields[include][]=body-html&fields[include][]=date.original" +
                          $"&fields[include][]=country.iso3&fields[include][]=country.name" +
                          $"&fields[include][]=source.name&fields[include][]=disaster_type.name" +
                          $"&fields[include][]=url&sort[]=date:desc";

                var response = await http.GetAsync(url);
                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("ReliefWeb API {Status} for {Country}", response.StatusCode, country);
                    continue;
                }

                var json = await response.Content.ReadAsStringAsync();
                var doc = JsonDocument.Parse(json);

                if (!doc.RootElement.TryGetProperty("data", out var dataArray))
                    continue;

                var source = await db.Sources.FirstOrDefaultAsync(s => s.Id == 3)
                             ?? db.Sources.Local.FirstOrDefault(s => s.Id == 3);
                if (source == null) continue;

                foreach (var item in dataArray.EnumerateArray())
                {
                    if (!item.TryGetProperty("fields", out var fields)) continue;

                    var title = fields.TryGetProperty("title", out var t) ? t.GetString() ?? "" : "";
                    if (string.IsNullOrWhiteSpace(title)) continue;

                    var articleUrl = fields.TryGetProperty("url", out var u) ? u.GetString() ?? "" : "";
                    var body = fields.TryGetProperty("body-html", out var b) ? b.GetString() ?? title : title;

                    var hash = OsintClassifier.ComputeHash(articleUrl.Length > 0 ? articleUrl : title);
                    if (await db.Articles.AnyAsync(a => a.DedupHash == hash)) continue;
                    if (db.Articles.Local.Any(a => a.DedupHash == hash)) continue;

                    var publishedAt = DateTime.UtcNow;
                    if (fields.TryGetProperty("date", out var dateObj) &&
                        dateObj.TryGetProperty("original", out var dateStr) &&
                        DateTime.TryParse(dateStr.GetString(), out var parsed))
                        publishedAt = parsed.ToUniversalTime();

                    // Extract countries from response
                    var countryTags = new List<string>();
                    if (fields.TryGetProperty("country", out var countries))
                    {
                        foreach (var c in countries.EnumerateArray())
                        {
                            if (c.TryGetProperty("iso3", out var iso3))
                            {
                                var iso2 = OsintClassifier.MapIso3ToIso2(iso3.GetString() ?? "");
                                if (!string.IsNullOrEmpty(iso2))
                                    countryTags.Add(iso2);
                            }
                        }
                    }
                    if (countryTags.Count == 0)
                        countryTags = OsintClassifier.ExtractCountries(title);

                    // Check for disaster type to boost classification
                    string? disasterType = null;
                    if (fields.TryGetProperty("disaster_type", out var dt))
                    {
                        foreach (var d in dt.EnumerateArray())
                        {
                            disasterType = d.TryGetProperty("name", out var dn) ? dn.GetString() : null;
                            break;
                        }
                    }

                    var classText = title + " " + (disasterType ?? "");
                    var (category, threatType, threatLevel) = OsintClassifier.ClassifyArticle(classText);

                    // Boost threat level for humanitarian content
                    if (threatLevel < 3 && disasterType != null)
                        threatLevel = 3;

                    var sourceName = "";
                    if (fields.TryGetProperty("source", out var srcArr))
                    {
                        foreach (var s in srcArr.EnumerateArray())
                        {
                            sourceName = s.TryGetProperty("name", out var sn) ? sn.GetString() ?? "" : "";
                            break;
                        }
                    }

                    var article = new Article
                    {
                        Id = Guid.NewGuid(),
                        Title = title.Length > 500 ? title[..500] : title,
                        Body = body.Length > 5000 ? body[..5000] : body,
                        Url = articleUrl,
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
                        Category = category,
                        ThreatType = threatType,
                        ThreatLevel = threatLevel,
                        CredibilityScore = 0.8 + Random.Shared.NextDouble() * 0.15,
                        Summary = (sourceName.Length > 0 ? $"[{sourceName}] " : "") +
                                  (title.Length > 200 ? title[..200] : title),
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

                    foreach (var (name, type) in OsintClassifier.ExtractEntities(title))
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
                _logger.LogWarning(ex, "ReliefWeb Fetcher: Failed for {Country}", country);
            }

            await Task.Delay(300);
        }

        _logger.LogInformation("ReliefWeb Fetcher: Done. Stored {Count} articles", totalStored);
    }
}
