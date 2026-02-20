using AUSentinel.Api.Data;
using AUSentinel.Api.Data.Entities;
using AUSentinel.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace AUSentinel.Api.Services;

public interface INewsService
{
    Task<NewsSearchResult> SearchAsync(NewsSearchRequest request, string? countryScope);
    Task<NewsDetailDto?> GetDetailAsync(Guid articleId, Guid? userId);
    Task<TrendResult> GetTrendsAsync(string? country, string period);
    Task<List<NewsArticleDto>> GetImportantAsync(string? country, int count);
}

public class NewsService : INewsService
{
    private readonly IOpenSearchService _search;
    private readonly AppDbContext _db;
    private readonly ILogger<NewsService> _logger;

    public NewsService(IOpenSearchService search, AppDbContext db, ILogger<NewsService> logger)
    {
        _search = search;
        _db = db;
        _logger = logger;
    }

    public async Task<NewsSearchResult> SearchAsync(NewsSearchRequest request, string? countryScope)
    {
        try
        {
            var result = await _search.SearchAsync(request, countryScope);
            if (result.Items.Count > 0) return result;
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "OpenSearch unavailable, falling back to DB");
        }

        // DB fallback
        return await SearchFromDbAsync(request, countryScope);
    }

    public async Task<NewsDetailDto?> GetDetailAsync(Guid articleId, Guid? userId)
    {
        var article = await _db.Articles
            .Include(a => a.Source)
            .Include(a => a.Classification)
            .Include(a => a.CountryTags)
            .Include(a => a.Entities)
            .Include(a => a.Votes)
            .FirstOrDefaultAsync(a => a.Id == articleId);

        if (article == null) return null;

        var voteStats = new VoteStatsDto(
            article.Votes.Count(v => v.VoteType == "REAL"),
            article.Votes.Count(v => v.VoteType == "MISLEADING"),
            article.Votes.Count(v => v.VoteType == "UNSURE")
        );

        string? userVote = null;
        if (userId.HasValue)
        {
            userVote = article.Votes.FirstOrDefault(v => v.UserId == userId.Value)?.VoteType;
        }

        return new NewsDetailDto
        {
            Id = article.Id,
            Title = article.Title,
            Body = article.Body,
            Summary = article.Classification?.Summary,
            Url = article.Url,
            ImageUrl = article.ImageUrl,
            SourceName = article.Source.Name,
            Language = article.Language,
            PublishedAt = article.PublishedAt,
            CountryTags = article.CountryTags.Select(ct => ct.CountryCode).ToList(),
            Categories = article.Classification != null ? new List<string> { article.Classification.Category } : new(),
            ThreatType = article.Classification?.ThreatType,
            ThreatLevel = article.Classification?.ThreatLevel ?? 0,
            CredibilityScore = article.Classification?.CredibilityScore ?? 0.5,
            VoteStats = voteStats,
            UserVote = userVote,
            Entities = article.Entities.Select(e => new EntityDto(e.Name, e.Type)).ToList()
        };
    }

    public async Task<TrendResult> GetTrendsAsync(string? country, string period)
    {
        try
        {
            var result = await _search.GetTrendsAsync(country, period);
            if (result.TopCategories.Count > 0 || result.ThreatDistribution.Count > 0) return result;
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "OpenSearch unavailable for trends, falling back to DB");
        }

        // DB fallback
        return await GetTrendsFromDbAsync(country, period);
    }

    public async Task<List<NewsArticleDto>> GetImportantAsync(string? country, int count)
    {
        try
        {
            var request = new NewsSearchRequest
            {
                Country = country,
                MinThreatLevel = 3,
                SortBy = "threatLevel",
                SortOrder = "desc",
                PageSize = count
            };

            var result = await _search.SearchAsync(request, country);
            if (result.Items.Count > 0) return result.Items;
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "OpenSearch unavailable for important, falling back to DB");
        }

        // DB fallback
        return await GetImportantFromDbAsync(country, count);
    }

    // ── DB Fallback Methods ──

    private async Task<NewsSearchResult> SearchFromDbAsync(NewsSearchRequest request, string? countryScope)
    {
        var query = _db.Articles
            .Include(a => a.Source)
            .Include(a => a.Classification)
            .Include(a => a.CountryTags)
            .Include(a => a.Entities)
            .AsQueryable();

        var scope = countryScope ?? request.Country;
        if (!string.IsNullOrEmpty(scope))
            query = query.Where(a => a.CountryTags.Any(ct => ct.CountryCode == scope));

        if (!string.IsNullOrEmpty(request.Query))
            query = query.Where(a => EF.Functions.Like(a.Title, $"%{request.Query}%")
                                  || EF.Functions.Like(a.Body, $"%{request.Query}%")
                                  || (a.Classification != null && EF.Functions.Like(a.Classification.Summary, $"%{request.Query}%")));

        if (!string.IsNullOrEmpty(request.Category))
            query = query.Where(a => a.Classification != null && a.Classification.Category == request.Category);

        if (!string.IsNullOrEmpty(request.ThreatType))
            query = query.Where(a => a.Classification != null && a.Classification.ThreatType == request.ThreatType);

        if (request.MinThreatLevel.HasValue)
            query = query.Where(a => a.Classification != null && a.Classification.ThreatLevel >= request.MinThreatLevel.Value);

        if (request.From.HasValue)
            query = query.Where(a => a.PublishedAt >= request.From.Value);

        if (request.To.HasValue)
            query = query.Where(a => a.PublishedAt <= request.To.Value);

        var total = await query.CountAsync();

        query = request.SortBy switch
        {
            "relevance" when !string.IsNullOrEmpty(request.Query) => query
                .OrderByDescending(a => a.Title.Contains(request.Query) ? 1 : 0)
                .ThenByDescending(a => a.Classification != null ? a.Classification.ThreatLevel : 0)
                .ThenByDescending(a => a.PublishedAt),
            "threatLevel" => request.SortOrder == "asc"
                ? query.OrderBy(a => a.Classification != null ? a.Classification.ThreatLevel : 0)
                : query.OrderByDescending(a => a.Classification != null ? a.Classification.ThreatLevel : 0),
            "credibilityScore" => request.SortOrder == "asc"
                ? query.OrderBy(a => a.Classification != null ? a.Classification.CredibilityScore : 0)
                : query.OrderByDescending(a => a.Classification != null ? a.Classification.CredibilityScore : 0),
            _ => request.SortOrder == "asc"
                ? query.OrderBy(a => a.PublishedAt)
                : query.OrderByDescending(a => a.PublishedAt)
        };

        var rawItems = await query
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync();
        var items = rawItems.Select(a => MapToDto(a)).ToList();

        // Compute facets from all matching articles — project to anon types so EF can translate
        var allArticles = _db.Articles.Include(a => a.Classification).Include(a => a.CountryTags).Where(a => a.Classification != null);
        var facets = new Dictionary<string, List<FacetBucket>>
        {
            ["categories"] = (await allArticles.GroupBy(a => a.Classification!.Category)
                .Select(g => new { Key = g.Key, Count = g.Count() }).OrderByDescending(g => g.Count).Take(20).ToListAsync())
                .Select(g => new FacetBucket(g.Key, g.Count)).ToList(),
            ["countries"] = (await allArticles.SelectMany(a => a.CountryTags).GroupBy(ct => ct.CountryCode)
                .Select(g => new { Key = g.Key, Count = g.Count() }).OrderByDescending(g => g.Count).Take(20).ToListAsync())
                .Select(g => new FacetBucket(g.Key, g.Count)).ToList(),
            ["threatLevels"] = (await allArticles.GroupBy(a => a.Classification!.ThreatLevel)
                .Select(g => new { Key = g.Key.ToString(), Count = g.Count() }).OrderBy(g => g.Key).ToListAsync())
                .Select(g => new FacetBucket(g.Key, g.Count)).ToList(),
            ["threatTypes"] = (await allArticles.Where(a => a.Classification!.ThreatType != "none").GroupBy(a => a.Classification!.ThreatType)
                .Select(g => new { Key = g.Key, Count = g.Count() }).OrderByDescending(g => g.Count).Take(20).ToListAsync())
                .Select(g => new FacetBucket(g.Key, g.Count)).ToList()
        };

        return new NewsSearchResult { Items = items, Total = total, Facets = facets };
    }

    private async Task<TrendResult> GetTrendsFromDbAsync(string? country, string period)
    {
        var cutoff = period == "7d" ? DateTime.UtcNow.AddDays(-7) : DateTime.UtcNow.AddHours(-24);

        var query = _db.Articles
            .Include(a => a.Classification)
            .Include(a => a.CountryTags)
            .Include(a => a.Entities)
            .Where(a => a.Classification != null && a.PublishedAt >= cutoff);

        if (!string.IsNullOrEmpty(country))
            query = query.Where(a => a.CountryTags.Any(ct => ct.CountryCode == country));

        // If 24h filter yields nothing, use all data
        if (!await query.AnyAsync())
        {
            query = _db.Articles
                .Include(a => a.Classification)
                .Include(a => a.CountryTags)
                .Include(a => a.Entities)
                .Where(a => a.Classification != null);

            if (!string.IsNullOrEmpty(country))
                query = query.Where(a => a.CountryTags.Any(ct => ct.CountryCode == country));
        }

        var topCategories = await query
            .GroupBy(a => a.Classification!.Category)
            .Select(g => new FacetBucket(g.Key, g.Count()))
            .OrderByDescending(f => f.Count)
            .Take(10)
            .ToListAsync();

        var topCountries = await query
            .SelectMany(a => a.CountryTags)
            .GroupBy(ct => ct.CountryCode)
            .Select(g => new FacetBucket(g.Key, g.Count()))
            .OrderByDescending(f => f.Count)
            .Take(10)
            .ToListAsync();

        var topEntities = await query
            .SelectMany(a => a.Entities)
            .GroupBy(e => e.Name)
            .Select(g => new FacetBucket(g.Key, g.Count()))
            .OrderByDescending(f => f.Count)
            .Take(10)
            .ToListAsync();

        var threatDist = await query
            .GroupBy(a => a.Classification!.ThreatLevel)
            .Select(g => new ThreatLevelBucket(g.Key, g.Count()))
            .OrderBy(t => t.Level)
            .ToListAsync();

        return new TrendResult
        {
            TopCategories = topCategories,
            TopEntities = topEntities,
            TopCountries = topCountries,
            ThreatDistribution = threatDist
        };
    }

    private async Task<List<NewsArticleDto>> GetImportantFromDbAsync(string? country, int count)
    {
        var query = _db.Articles
            .Include(a => a.Source)
            .Include(a => a.Classification)
            .Include(a => a.CountryTags)
            .Include(a => a.Entities)
            .Where(a => a.Classification != null && a.Classification.ThreatLevel >= 3);

        if (!string.IsNullOrEmpty(country))
            query = query.Where(a => a.CountryTags.Any(ct => ct.CountryCode == country));

        var results = await query
            .OrderByDescending(a => a.Classification!.ThreatLevel)
            .ThenByDescending(a => a.PublishedAt)
            .Take(count)
            .Select(a => MapToDto(a))
            .ToListAsync();

        // If not enough high-threat articles, fill with recent articles
        if (results.Count < count)
        {
            var existingIds = results.Select(r => r.Id).ToHashSet();
            var filler = await _db.Articles
                .Include(a => a.Source)
                .Include(a => a.Classification)
                .Include(a => a.CountryTags)
                .Include(a => a.Entities)
                .Where(a => !existingIds.Contains(a.Id))
                .OrderByDescending(a => a.PublishedAt)
                .Take(count - results.Count)
                .Select(a => MapToDto(a))
                .ToListAsync();
            results.AddRange(filler);
        }

        return results;
    }

    private static NewsArticleDto MapToDto(Article a) => new()
    {
        Id = a.Id,
        Title = a.Title,
        Summary = a.Classification?.Summary,
        Url = a.Url,
        ImageUrl = a.ImageUrl,
        SourceName = a.Source.Name,
        Language = a.Language,
        PublishedAt = a.PublishedAt,
        CountryTags = a.CountryTags.Select(ct => ct.CountryCode).ToList(),
        Categories = a.Classification != null ? new List<string> { a.Classification.Category } : new(),
        ThreatType = a.Classification?.ThreatType,
        ThreatLevel = a.Classification?.ThreatLevel ?? 0,
        CredibilityScore = a.Classification?.CredibilityScore ?? 0.5,
        Entities = a.Entities.Select(e => new EntityDto(e.Name, e.Type)).ToList()
    };
}
