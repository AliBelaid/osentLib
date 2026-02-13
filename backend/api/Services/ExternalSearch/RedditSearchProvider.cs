using System.Text.Json;

namespace AUSentinel.Api.Services.ExternalSearch;

public class RedditSearchProvider : IExternalSearchProvider
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;
    private readonly ILogger<RedditSearchProvider> _logger;

    public string ProviderName => "Reddit";

    public bool IsConfigured
    {
        get
        {
            var clientId = _configuration["ExternalApis:Reddit:ClientId"];
            var clientSecret = _configuration["ExternalApis:Reddit:ClientSecret"];
            return !string.IsNullOrEmpty(clientId) && !string.IsNullOrEmpty(clientSecret);
        }
    }

    public RedditSearchProvider(
        HttpClient httpClient,
        IConfiguration configuration,
        ILogger<RedditSearchProvider> logger)
    {
        _httpClient = httpClient;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<ExternalSearchResult> SearchAsync(string query, ExternalSearchFilters filters)
    {
        var result = new ExternalSearchResult
        {
            Provider = ProviderName,
            Query = query,
            Success = false
        };

        try
        {
            // Reddit allows unauthenticated searches via JSON API
            // For rate limiting and better features, authentication is recommended

            string url;
            if (!string.IsNullOrEmpty(filters.RedditSubreddit))
            {
                // Search within specific subreddit
                url = $"https://www.reddit.com/r/{filters.RedditSubreddit}/search.json";
            }
            else
            {
                // Global search
                url = "https://www.reddit.com/search.json";
            }

            // Build query parameters
            var queryParams = new Dictionary<string, string>
            {
                ["q"] = query,
                ["limit"] = Math.Min(filters.MaxResults, 100).ToString(),
                ["sort"] = filters.RedditSortBy ?? "relevance",
                ["type"] = "link" // Only search posts, not comments
            };

            // Add time filter if date range specified
            if (filters.FromDate.HasValue || filters.ToDate.HasValue)
            {
                // Reddit doesn't support exact date ranges, use time filter instead
                var daysAgo = (DateTime.UtcNow - (filters.FromDate ?? DateTime.UtcNow.AddDays(-7))).Days;
                if (daysAgo <= 1) queryParams["t"] = "day";
                else if (daysAgo <= 7) queryParams["t"] = "week";
                else if (daysAgo <= 30) queryParams["t"] = "month";
                else if (daysAgo <= 365) queryParams["t"] = "year";
                else queryParams["t"] = "all";
            }

            var queryString = string.Join("&", queryParams.Select(kvp => $"{kvp.Key}={Uri.EscapeDataString(kvp.Value)}"));
            var fullUrl = $"{url}?{queryString}";

            // Set user agent (Reddit requires a descriptive user agent)
            _httpClient.DefaultRequestHeaders.Clear();
            _httpClient.DefaultRequestHeaders.Add("User-Agent", "AUSentinel/1.0 (News Monitoring Platform)");

            var response = await _httpClient.GetAsync(fullUrl);

            if (!response.IsSuccessStatusCode)
            {
                var errorContent = await response.Content.ReadAsStringAsync();
                result.ErrorMessage = $"Reddit API error: {response.StatusCode} - {errorContent}";
                _logger.LogError("Reddit API error: {StatusCode} - {Error}", response.StatusCode, errorContent);
                return result;
            }

            var json = await response.Content.ReadAsStringAsync();
            var posts = ParseRedditResponse(json);

            result.Items = posts;
            result.TotalResults = posts.Count;
            result.Success = true;
            result.SearchedAt = DateTime.UtcNow;

            _logger.LogInformation("Reddit search completed: {Count} results for query '{Query}'", posts.Count, query);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to search Reddit for query: {Query}", query);
            result.ErrorMessage = ex.Message;
        }

        return result;
    }

    private List<ExternalSearchItem> ParseRedditResponse(string json)
    {
        var items = new List<ExternalSearchItem>();

        try
        {
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;

            if (!root.TryGetProperty("data", out var data) || !data.TryGetProperty("children", out var children))
            {
                return items;
            }

            foreach (var child in children.EnumerateArray())
            {
                if (!child.TryGetProperty("data", out var post))
                    continue;

                var item = new ExternalSearchItem
                {
                    Id = post.GetProperty("id").GetString() ?? "",
                    Title = post.GetProperty("title").GetString() ?? "",
                    Content = post.TryGetProperty("selftext", out var selftext) ? selftext.GetString() ?? "" : "",
                    Source = "Reddit",
                    Author = post.TryGetProperty("author", out var author) ? author.GetString() ?? "Unknown" : "Unknown"
                };

                // Get URL
                if (post.TryGetProperty("permalink", out var permalink))
                {
                    item.Url = $"https://www.reddit.com{permalink.GetString()}";
                }

                // Get published date (Reddit uses Unix timestamp)
                if (post.TryGetProperty("created_utc", out var createdUtc))
                {
                    var timestamp = createdUtc.GetDouble();
                    item.PublishedAt = DateTimeOffset.FromUnixTimeSeconds((long)timestamp).UtcDateTime;
                }

                // Get engagement metrics
                var upvotes = post.TryGetProperty("ups", out var ups) ? ups.GetInt32() : 0;
                var comments = post.TryGetProperty("num_comments", out var numComments) ? numComments.GetInt32() : 0;
                item.EngagementCount = upvotes + comments;

                item.Metadata["upvotes"] = upvotes;
                item.Metadata["comments"] = comments;
                item.Metadata["subreddit"] = post.TryGetProperty("subreddit", out var subreddit) ? subreddit.GetString() : "";

                // Add award count if present
                if (post.TryGetProperty("total_awards_received", out var awards))
                {
                    item.Metadata["awards"] = awards.GetInt32();
                }

                // If no selftext, try to get a preview
                if (string.IsNullOrEmpty(item.Content))
                {
                    item.Content = item.Title; // Use title as content for link posts
                }

                items.Add(item);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to parse Reddit response");
        }

        return items;
    }
}
