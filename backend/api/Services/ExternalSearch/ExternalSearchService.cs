using AUSentinel.Api.Data;
using AUSentinel.Api.Data.Entities;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace AUSentinel.Api.Services.ExternalSearch;

public interface IExternalSearchService
{
    Task<ExternalSearchResult> SearchAsync(string provider, string query, ExternalSearchFilters filters, Guid userId);
    Task<List<ExternalSearchResult>> SearchMultipleProvidersAsync(List<string> providers, string query, ExternalSearchFilters filters, Guid userId);
    Task<List<ExternalSearchQueryDto>> GetSearchHistoryAsync(Guid userId, int page = 1, int pageSize = 20);
    Task<ExternalSearchQueryDto?> GetSearchByIdAsync(int id, Guid userId);
    List<ProviderInfo> GetAvailableProviders();
}

public class ExternalSearchService : IExternalSearchService
{
    private readonly AppDbContext _db;
    private readonly ILogger<ExternalSearchService> _logger;
    private readonly Dictionary<string, IExternalSearchProvider> _providers;

    public ExternalSearchService(
        AppDbContext db,
        ILogger<ExternalSearchService> logger,
        TwitterSearchProvider twitterProvider,
        RedditSearchProvider redditProvider,
        NewsApiProvider newsApiProvider)
    {
        _db = db;
        _logger = logger;

        // Register all providers
        _providers = new Dictionary<string, IExternalSearchProvider>(StringComparer.OrdinalIgnoreCase)
        {
            [twitterProvider.ProviderName] = twitterProvider,
            [redditProvider.ProviderName] = redditProvider,
            [newsApiProvider.ProviderName] = newsApiProvider
        };
    }

    public async Task<ExternalSearchResult> SearchAsync(string provider, string query, ExternalSearchFilters filters, Guid userId)
    {
        if (!_providers.TryGetValue(provider, out var searchProvider))
        {
            return new ExternalSearchResult
            {
                Provider = provider,
                Query = query,
                Success = false,
                ErrorMessage = $"Provider '{provider}' not found"
            };
        }

        // Create search query record
        var searchQuery = new ExternalSearchQuery
        {
            UserId = userId,
            Provider = provider,
            Query = query,
            Filters = JsonSerializer.Serialize(filters),
            Status = "processing",
            CreatedAt = DateTime.UtcNow,
            ExecutedAt = DateTime.UtcNow
        };

        _db.ExternalSearchQueries.Add(searchQuery);
        await _db.SaveChangesAsync();

        try
        {
            // Perform search
            var result = await searchProvider.SearchAsync(query, filters);

            // Update search query record
            searchQuery.Status = result.Success ? "completed" : "failed";
            searchQuery.ResultsCount = result.TotalResults;
            searchQuery.Results = JsonSerializer.Serialize(result.Items);
            searchQuery.ErrorMessage = result.ErrorMessage;
            searchQuery.CompletedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();

            _logger.LogInformation("External search completed: Provider={Provider}, Query={Query}, Results={Count}",
                provider, query, result.TotalResults);

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "External search failed: Provider={Provider}, Query={Query}", provider, query);

            searchQuery.Status = "failed";
            searchQuery.ErrorMessage = ex.Message;
            searchQuery.CompletedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            return new ExternalSearchResult
            {
                Provider = provider,
                Query = query,
                Success = false,
                ErrorMessage = ex.Message
            };
        }
    }

    public async Task<List<ExternalSearchResult>> SearchMultipleProvidersAsync(
        List<string> providers,
        string query,
        ExternalSearchFilters filters,
        Guid userId)
    {
        var tasks = providers.Select(provider => SearchAsync(provider, query, filters, userId));
        var results = await Task.WhenAll(tasks);
        return results.ToList();
    }

    public async Task<List<ExternalSearchQueryDto>> GetSearchHistoryAsync(Guid userId, int page = 1, int pageSize = 20)
    {
        var queries = await _db.ExternalSearchQueries
            .Where(esq => esq.UserId == userId)
            .OrderByDescending(esq => esq.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return queries.Select(MapToDto).ToList();
    }

    public async Task<ExternalSearchQueryDto?> GetSearchByIdAsync(int id, Guid userId)
    {
        var query = await _db.ExternalSearchQueries
            .Include(esq => esq.User)
            .FirstOrDefaultAsync(esq => esq.Id == id && esq.UserId == userId);

        return query != null ? MapToDto(query) : null;
    }

    public List<ProviderInfo> GetAvailableProviders()
    {
        return _providers.Values.Select(p => new ProviderInfo
        {
            Name = p.ProviderName,
            IsConfigured = p.IsConfigured,
            IsAvailable = p.IsConfigured
        }).ToList();
    }

    private ExternalSearchQueryDto MapToDto(ExternalSearchQuery query)
    {
        List<ExternalSearchItem>? items = null;
        if (!string.IsNullOrEmpty(query.Results))
        {
            try
            {
                items = JsonSerializer.Deserialize<List<ExternalSearchItem>>(query.Results);
            }
            catch
            {
                // Ignore deserialization errors
            }
        }

        return new ExternalSearchQueryDto
        {
            Id = query.Id,
            Provider = query.Provider,
            Query = query.Query,
            Status = query.Status,
            ResultsCount = query.ResultsCount,
            Results = items,
            ErrorMessage = query.ErrorMessage,
            CreatedAt = query.CreatedAt,
            ExecutedAt = query.ExecutedAt,
            CompletedAt = query.CompletedAt
        };
    }
}

// DTOs
public record ExternalSearchQueryDto
{
    public int Id { get; init; }
    public string Provider { get; init; } = string.Empty;
    public string Query { get; init; } = string.Empty;
    public string Status { get; init; } = string.Empty;
    public int ResultsCount { get; init; }
    public List<ExternalSearchItem>? Results { get; init; }
    public string? ErrorMessage { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime? ExecutedAt { get; init; }
    public DateTime? CompletedAt { get; init; }
}

public record ProviderInfo
{
    public string Name { get; init; } = string.Empty;
    public bool IsConfigured { get; init; }
    public bool IsAvailable { get; init; }
}
