using System.Xml.Linq;
using AUSentinel.Api.Data;
using AUSentinel.Api.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace AUSentinel.Api.Services;

public class AllAfricaFetcherService
{
    private readonly IServiceProvider _sp;
    private readonly ILogger<AllAfricaFetcherService> _logger;

    public AllAfricaFetcherService(IServiceProvider sp, ILogger<AllAfricaFetcherService> logger)
    {
        _sp = sp;
        _logger = logger;
    }

    public async Task FetchAsync()
    {
        _logger.LogInformation("AllAfrica Fetcher: Starting...");

        using var scope = _sp.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var httpFactory = scope.ServiceProvider.GetRequiredService<IHttpClientFactory>();
        var http = httpFactory.CreateClient();
        http.Timeout = TimeSpan.FromSeconds(30);
        http.DefaultRequestHeaders.Add("User-Agent", "AUSentinel/1.0 (OSINT monitoring for African Union)");

        int totalStored = 0;

        try
        {
            var url = "https://allafrica.com/tools/headlines/rdf/latest/headlines.rdf";
            var xml = await http.GetStringAsync(url);
            var doc = XDocument.Parse(xml);

            XNamespace rss = "http://purl.org/rss/1.0/";
            XNamespace dc = "http://purl.org/dc/elements/1.1/";
            XNamespace rdf = "http://www.w3.org/1999/02/22-rdf-syntax-ns#";

            var source = await db.Sources.FirstOrDefaultAsync(s => s.Id == 2)
                         ?? db.Sources.Local.FirstOrDefault(s => s.Id == 2);
            if (source == null)
            {
                _logger.LogWarning("AllAfrica source not found in DB");
                return;
            }

            var items = doc.Descendants(rss + "item");

            foreach (var item in items)
            {
                var title = item.Element(rss + "title")?.Value ?? "";
                if (string.IsNullOrWhiteSpace(title)) continue;

                var link = item.Attribute(rdf + "about")?.Value
                           ?? item.Element(rss + "link")?.Value ?? "";
                var description = item.Element(rss + "description")?.Value ?? "";
                var dateStr = item.Element(dc + "date")?.Value;

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
                    CredibilityScore = 0.65 + Random.Shared.NextDouble() * 0.25,
                    Summary = (description.Length > 200 ? description[..200] : description),
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
            _logger.LogWarning(ex, "AllAfrica Fetcher: Failed to fetch RSS");
        }

        _logger.LogInformation("AllAfrica Fetcher: Done. Stored {Count} articles", totalStored);
    }
}
