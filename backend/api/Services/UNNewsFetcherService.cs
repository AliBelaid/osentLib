using System.Xml.Linq;
using AUSentinel.Api.Data;
using AUSentinel.Api.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace AUSentinel.Api.Services;

/// <summary>
/// Fetches news from UN News Africa RSS feed (free, no key).
/// Source: https://news.un.org/feed/subscribe/en/news/region/africa/feed/rss.xml
/// </summary>
public class UNNewsFetcherService
{
    private readonly IServiceProvider _sp;
    private readonly ILogger<UNNewsFetcherService> _logger;

    public UNNewsFetcherService(IServiceProvider sp, ILogger<UNNewsFetcherService> logger)
    {
        _sp = sp;
        _logger = logger;
    }

    public async Task FetchAsync()
    {
        _logger.LogInformation("UN News Fetcher: Starting...");

        using var scope = _sp.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var httpFactory = scope.ServiceProvider.GetRequiredService<IHttpClientFactory>();
        var http = httpFactory.CreateClient();
        http.Timeout = TimeSpan.FromSeconds(30);
        http.DefaultRequestHeaders.Add("User-Agent", "AUSentinel/1.0 (OSINT UN monitoring)");

        int totalStored = 0;

        // Fetch from multiple UN RSS feeds
        var feeds = new[]
        {
            ("https://news.un.org/feed/subscribe/en/news/region/africa/feed/rss.xml", "UN News Africa"),
            ("https://news.un.org/feed/subscribe/en/news/topic/peace-and-security/feed/rss.xml", "UN Peace & Security"),
            ("https://news.un.org/feed/subscribe/en/news/topic/humanitarian-aid/feed/rss.xml", "UN Humanitarian"),
        };

        // Ensure UN source exists (Id=5)
        var source = await db.Sources.FirstOrDefaultAsync(s => s.Id == 5)
                     ?? db.Sources.Local.FirstOrDefault(s => s.Id == 5);
        if (source == null)
        {
            source = new Source
            {
                Id = 5,
                Type = "UNNews",
                Name = "UN News",
                Url = "https://news.un.org",
                Language = "en",
                IsActive = true,
                FetchIntervalMinutes = 60
            };
            db.Sources.Add(source);
            await db.SaveChangesAsync();
        }

        foreach (var (feedUrl, feedName) in feeds)
        {
            try
            {
                var xml = await http.GetStringAsync(feedUrl);
                var doc = XDocument.Parse(xml);

                var items = doc.Descendants("item");

                foreach (var item in items)
                {
                    var title = item.Element("title")?.Value ?? "";
                    if (string.IsNullOrWhiteSpace(title)) continue;

                    var link = item.Element("link")?.Value ?? "";
                    var description = item.Element("description")?.Value ?? "";
                    var dateStr = item.Element("pubDate")?.Value;

                    // Strip HTML from description
                    description = System.Text.RegularExpressions.Regex.Replace(description, "<[^>]+>", "").Trim();

                    var hash = OsintClassifier.ComputeHash(link.Length > 0 ? link : title);
                    if (await db.Articles.AnyAsync(a => a.DedupHash == hash)) continue;
                    if (db.Articles.Local.Any(a => a.DedupHash == hash)) continue;

                    var publishedAt = DateTime.UtcNow;
                    if (!string.IsNullOrEmpty(dateStr) && DateTime.TryParse(dateStr, out var parsed))
                        publishedAt = parsed.ToUniversalTime();

                    var fullText = title + " " + description;
                    var (category, threatType, threatLevel) = OsintClassifier.ClassifyArticle(fullText);
                    var countryTags = OsintClassifier.ExtractCountries(fullText);
                    var entities = OsintClassifier.ExtractEntities(title);

                    // Boost threat for peace/security feed
                    if (feedName.Contains("Security") && threatLevel < 3)
                        threatLevel = 3;
                    if (feedName.Contains("Humanitarian") && threatLevel < 3)
                        threatLevel = 3;

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
                        Category = category,
                        ThreatType = threatType,
                        ThreatLevel = threatLevel,
                        CredibilityScore = 0.9 + Random.Shared.NextDouble() * 0.1, // UN = high credibility
                        Summary = $"[{feedName}] {(description.Length > 200 ? description[..200] : description)}",
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
                _logger.LogWarning(ex, "UN News Fetcher: Failed for feed {Feed}", feedName);
            }

            await Task.Delay(300);
        }

        _logger.LogInformation("UN News Fetcher: Done. Stored {Count} articles", totalStored);
    }
}
