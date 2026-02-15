using AUSentinel.Api.Data;
using AUSentinel.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace AUSentinel.Api.Services;

public interface IStatsService
{
    Task<List<CountryStatsDto>> GetCountryStatsAsync(string? region = null);
    Task<List<ThreatActivityDto>> GetThreatFeedAsync(int limit = 50);
    Task<List<TimelineBucketDto>> GetTimelineAsync(DateTime? from = null, DateTime? to = null, string granularity = "day");
    Task<DashboardSummaryDto> GetDashboardSummaryAsync(string? category = null, string? region = null, string? period = null);
}

public class StatsService : IStatsService
{
    private readonly AppDbContext _db;

    public StatsService(AppDbContext db) => _db = db;

    public async Task<DashboardSummaryDto> GetDashboardSummaryAsync(string? category = null, string? region = null, string? period = null)
    {
        // Determine date range from period
        var now = DateTime.UtcNow;
        DateTime? fromDate = period switch
        {
            "24h" => now.AddHours(-24),
            "7d" => now.AddDays(-7),
            "30d" => now.AddDays(-30),
            _ => null
        };

        // Get country codes for region filtering
        List<string>? regionCodes = null;
        if (!string.IsNullOrEmpty(region))
        {
            regionCodes = await _db.Countries
                .Where(c => c.Region == region && c.IsActive)
                .Select(c => c.Code)
                .ToListAsync();
        }

        // Base query for articles
        var articlesQuery = _db.Articles.AsQueryable();
        if (fromDate.HasValue)
            articlesQuery = articlesQuery.Where(a => a.PublishedAt >= fromDate.Value);
        if (!string.IsNullOrEmpty(category))
            articlesQuery = articlesQuery.Where(a => a.Classification != null && a.Classification.Category == category);
        if (regionCodes != null)
            articlesQuery = articlesQuery.Where(a => a.CountryTags.Any(ct => regionCodes.Contains(ct.CountryCode)));

        var totalArticles = await articlesQuery.CountAsync();

        // Alerts
        var alertsQuery = _db.Alerts.AsQueryable();
        if (fromDate.HasValue)
            alertsQuery = alertsQuery.Where(a => a.CreatedAt >= fromDate.Value);
        if (regionCodes != null)
            alertsQuery = alertsQuery.Where(a => regionCodes.Contains(a.CountryCode));

        var totalAlerts = await alertsQuery.CountAsync();
        var activeAlerts = await alertsQuery.CountAsync(a => a.IsActive);

        // Load articles with classification for reuse (client evaluation for InMemory)
        var articlesWithClassification = await articlesQuery
            .Include(a => a.Classification)
            .Where(a => a.Classification != null)
            .ToListAsync();

        // Average threat level
        var avgThreat = articlesWithClassification.Count > 0
            ? articlesWithClassification.Average(a => (double)a.Classification!.ThreatLevel)
            : 0;

        // Articles by source — client evaluation for InMemory compatibility
        var articlesWithSource = await articlesQuery.Include(a => a.Source).ToListAsync();
        var articlesBySource = articlesWithSource
            .Where(a => a.Source != null)
            .GroupBy(a => new { a.Source.Name, a.Source.Type })
            .Select(g => new SourceCountDto(g.Key.Name, g.Key.Type, g.Count()))
            .OrderByDescending(x => x.Count)
            .ToList();

        // Top countries — use client evaluation for InMemory compatibility
        var topCountriesQuery = _db.ArticleCountryTags
            .Include(ct => ct.Article).ThenInclude(a => a.Classification)
            .AsQueryable();
        if (fromDate.HasValue)
            topCountriesQuery = topCountriesQuery.Where(ct => ct.Article.PublishedAt >= fromDate.Value);
        if (!string.IsNullOrEmpty(category))
            topCountriesQuery = topCountriesQuery.Where(ct => ct.Article.Classification != null && ct.Article.Classification.Category == category);
        if (regionCodes != null)
            topCountriesQuery = topCountriesQuery.Where(ct => regionCodes.Contains(ct.CountryCode));

        var topCountriesRaw = await topCountriesQuery.ToListAsync();
        var topCountries = topCountriesRaw
            .GroupBy(ct => ct.CountryCode)
            .Select(g => new FacetBucketDto(g.Key, g.Count()))
            .OrderByDescending(x => x.Count)
            .Take(15)
            .ToList();

        // Top categories
        var topCategories = articlesWithClassification
            .GroupBy(a => a.Classification!.Category)
            .Select(g => new FacetBucketDto(g.Key, g.Count()))
            .OrderByDescending(x => x.Count)
            .ToList();

        // Threat distribution — client evaluation
        var threatDist = articlesWithClassification
            .GroupBy(a => a.Classification!.ThreatLevel)
            .Select(x => new { Level = x.Key, Count = x.Count() })
            .OrderBy(x => x.Level)
            .Select(x => new ThreatLevelDistDto(
            x.Level,
            x.Count,
            x.Level switch
            {
                1 => "Low",
                2 => "Guarded",
                3 => "Elevated",
                4 => "High",
                5 => "Critical",
                _ => "Unknown"
            })).ToList();

        // Recent timeline (last 7 days, daily) — client evaluation
        var timelineFrom = now.AddDays(-7);
        var timelineArticles = await articlesQuery
            .Where(a => a.PublishedAt >= timelineFrom)
            .ToListAsync();
        var timeline = timelineArticles
            .GroupBy(a => a.PublishedAt.Date)
            .Select(g => new TimelinePointDto(g.Key.ToString("yyyy-MM-dd"), g.Count()))
            .OrderBy(x => x.Date)
            .ToList();

        // OSINT source info
        var sources = await _db.Sources.Where(s => s.IsActive).ToListAsync();
        var sourceArticleCounts = await _db.Articles
            .GroupBy(a => a.SourceId)
            .Select(g => new { SourceId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.SourceId, x => x.Count);

        var osintSources = sources.Select(s => new OsintSourceInfoDto(
            s.Name,
            s.Type,
            s.Url,
            s.Type switch
            {
                "GDELT" => "Global Database of Events, Language and Tone. Monitors worldwide news media in 100+ languages.",
                "AllAfrica" => "Largest aggregator of African news and information. Covers all 54 African countries.",
                "ReliefWeb" => "UN OCHA humanitarian information service. Reports on crises, disasters and conflicts.",
                "WHO" => "World Health Organization Disease Outbreak News. Official health emergency alerts.",
                "UNNews" => "United Nations News Service. Peace, security, humanitarian and development coverage.",
                _ => "OSINT data source"
            },
            s.IsActive,
            sourceArticleCounts.GetValueOrDefault(s.Id, 0),
            s.LastFetchedAt
        )).ToList();

        return new DashboardSummaryDto(
            totalArticles,
            totalAlerts,
            activeAlerts,
            Math.Round(avgThreat, 2),
            articlesBySource,
            topCountries,
            topCategories,
            threatDist,
            timeline,
            osintSources
        );
    }

    public async Task<List<CountryStatsDto>> GetCountryStatsAsync(string? region = null)
    {
        var countriesQuery = _db.Countries.Where(c => c.IsActive);
        if (!string.IsNullOrEmpty(region))
            countriesQuery = countriesQuery.Where(c => c.Region == region);

        var countries = await countriesQuery.ToListAsync();

        var alertsByCountry = await _db.Alerts
            .GroupBy(a => a.CountryCode)
            .Select(g => new { CountryCode = g.Key, Total = g.Count(), Active = g.Count(a => a.IsActive) })
            .ToDictionaryAsync(x => x.CountryCode, x => new { x.Total, x.Active });

        var articlesByCountry = await _db.ArticleCountryTags
            .GroupBy(a => a.CountryCode)
            .Select(g => new { CountryCode = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.CountryCode, x => x.Count);

        var threatTagEntities = await _db.ArticleCountryTags
            .Include(act => act.Article).ThenInclude(a => a.Classification)
            .Where(act => act.Article.Classification != null)
            .ToListAsync();

        var threatByCountry = threatTagEntities
            .GroupBy(act => act.CountryCode)
            .ToDictionary(
                g => g.Key,
                g => new
                {
                    Avg = g.Average(x => (double)x.Article.Classification!.ThreatLevel),
                    Max = g.Max(x => x.Article.Classification!.ThreatLevel)
                });

        return countries.Select(c =>
        {
            alertsByCountry.TryGetValue(c.Code, out var alerts);
            articlesByCountry.TryGetValue(c.Code, out var artCount);
            threatByCountry.TryGetValue(c.Code, out var threat);

            return new CountryStatsDto(
                c.Code,
                c.Name,
                c.NameArabic,
                c.Region,
                alerts?.Total ?? 0,
                artCount,
                threat?.Avg ?? 0,
                threat?.Max ?? 0,
                alerts?.Active ?? 0
            );
        }).ToList();
    }

    public async Task<List<ThreatActivityDto>> GetThreatFeedAsync(int limit = 50)
    {
        var highAlerts = await _db.Alerts
            .Where(a => a.Severity >= 3)
            .OrderByDescending(a => a.CreatedAt)
            .Take(limit)
            .Select(a => new ThreatActivityDto(
                a.Id,
                "alert",
                a.Title,
                a.Severity,
                a.CountryCode,
                a.CountryCode,
                a.CreatedAt,
                "alert"
            ))
            .ToListAsync();

        var highArticleEntities = await _db.Articles
            .Include(a => a.Classification)
            .Include(a => a.CountryTags)
            .Where(a => a.Classification != null && a.Classification.ThreatLevel >= 3)
            .OrderByDescending(a => a.PublishedAt)
            .Take(limit)
            .ToListAsync();

        var highArticles = highArticleEntities
            .SelectMany(a => a.CountryTags.Select(ct => new ThreatActivityDto(
                0,
                "article",
                a.Title,
                a.Classification!.ThreatLevel,
                ct.CountryCode,
                ct.CountryCode,
                a.PublishedAt,
                a.Classification!.Category
            )))
            .ToList();

        return highAlerts
            .Concat(highArticles)
            .OrderByDescending(t => t.Timestamp)
            .Take(limit)
            .ToList();
    }

    public async Task<List<TimelineBucketDto>> GetTimelineAsync(DateTime? from = null, DateTime? to = null, string granularity = "day")
    {
        var fromDate = from ?? DateTime.UtcNow.AddDays(-30);
        var toDate = to ?? DateTime.UtcNow;

        var alertBuckets = await _db.Alerts
            .Where(a => a.CreatedAt >= fromDate && a.CreatedAt <= toDate)
            .GroupBy(a => new { a.CreatedAt.Date, a.CountryCode })
            .Select(g => new TimelineBucketDto(
                g.Key.Date,
                g.Key.CountryCode,
                g.Count(),
                0,
                0
            ))
            .ToListAsync();

        var articleTagEntities = await _db.ArticleCountryTags
            .Include(act => act.Article).ThenInclude(a => a.Classification)
            .Where(act => act.Article.PublishedAt >= fromDate && act.Article.PublishedAt <= toDate)
            .ToListAsync();

        var articleBuckets = articleTagEntities
            .GroupBy(act => new { act.Article.PublishedAt.Date, act.CountryCode })
            .Select(g => new TimelineBucketDto(
                g.Key.Date,
                g.Key.CountryCode,
                0,
                g.Count(),
                g.Average(x => x.Article.Classification != null ? (double)x.Article.Classification.ThreatLevel : 0)
            ))
            .ToList();

        var merged = alertBuckets
            .Concat(articleBuckets)
            .GroupBy(b => new { b.Date, b.CountryCode })
            .Select(g => new TimelineBucketDto(
                g.Key.Date,
                g.Key.CountryCode,
                g.Sum(x => x.AlertCount),
                g.Sum(x => x.ArticleCount),
                g.Average(x => x.AvgThreatLevel)
            ))
            .OrderBy(b => b.Date)
            .ThenBy(b => b.CountryCode)
            .ToList();

        return merged;
    }
}
