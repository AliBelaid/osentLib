namespace AUSentinel.Api.Services.ExternalSearch;

public interface IExternalSearchProvider
{
    string ProviderName { get; }
    bool IsConfigured { get; }
    Task<ExternalSearchResult> SearchAsync(string query, ExternalSearchFilters filters);
}

public class ExternalSearchResult
{
    public bool Success { get; set; }
    public string Provider { get; set; } = string.Empty;
    public string Query { get; set; } = string.Empty;
    public List<ExternalSearchItem> Items { get; set; } = new();
    public int TotalResults { get; set; }
    public string? ErrorMessage { get; set; }
    public DateTime SearchedAt { get; set; } = DateTime.UtcNow;
}

public class ExternalSearchItem
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;
    public string Author { get; set; } = string.Empty;
    public string Source { get; set; } = string.Empty;
    public DateTime PublishedAt { get; set; }
    public int EngagementCount { get; set; } // Likes, retweets, upvotes, etc.
    public Dictionary<string, object> Metadata { get; set; } = new();
}

public class ExternalSearchFilters
{
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
    public string? Language { get; set; }
    public int MaxResults { get; set; } = 20;

    // Twitter-specific
    public string? TwitterUsername { get; set; }
    public bool? TwitterVerifiedOnly { get; set; }

    // Reddit-specific
    public string? RedditSubreddit { get; set; }
    public string? RedditSortBy { get; set; } // hot, new, top, relevance

    // NewsAPI-specific
    public string? NewsApiSources { get; set; }
    public string? NewsApiDomains { get; set; }
}
