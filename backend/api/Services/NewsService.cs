using AUSentinel.Api.Data;
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

    public NewsService(IOpenSearchService search, AppDbContext db)
    {
        _search = search;
        _db = db;
    }

    public Task<NewsSearchResult> SearchAsync(NewsSearchRequest request, string? countryScope)
        => _search.SearchAsync(request, countryScope);

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

    public Task<TrendResult> GetTrendsAsync(string? country, string period)
        => _search.GetTrendsAsync(country, period);

    public async Task<List<NewsArticleDto>> GetImportantAsync(string? country, int count)
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
        return result.Items;
    }
}
