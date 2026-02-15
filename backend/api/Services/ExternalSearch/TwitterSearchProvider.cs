using System.Text.Json;

namespace AUSentinel.Api.Services.ExternalSearch;

public class TwitterSearchProvider : IExternalSearchProvider
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;
    private readonly ILogger<TwitterSearchProvider> _logger;

    public string ProviderName => "Twitter";

    public bool IsConfigured
    {
        get
        {
            var apiKey = _configuration["ExternalApis:Twitter:ApiKey"];
            var apiSecret = _configuration["ExternalApis:Twitter:ApiSecret"];
            return !string.IsNullOrEmpty(apiKey) && !string.IsNullOrEmpty(apiSecret);
        }
    }

    public TwitterSearchProvider(
        HttpClient httpClient,
        IConfiguration configuration,
        ILogger<TwitterSearchProvider> logger)
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

        if (!IsConfigured)
        {
            _logger.LogInformation("Twitter API not configured for '{Query}'", query);
            result.ErrorMessage = "Twitter/X API key not configured. Add your API key in settings to enable real Twitter search.";
            return result;
        }

        try
        {
            // Note: This is a simplified implementation
            // In production, use Tweetinvi or LinqToTwitter library
            // Twitter API v2 endpoint: https://api.twitter.com/2/tweets/search/recent

            var apiKey = _configuration["ExternalApis:Twitter:ApiKey"];
            var bearerToken = _configuration["ExternalApis:Twitter:BearerToken"];

            // Build query parameters
            var queryParams = new Dictionary<string, string>
            {
                ["query"] = BuildTwitterQuery(query, filters),
                ["max_results"] = Math.Min(filters.MaxResults, 100).ToString(),
                ["tweet.fields"] = "created_at,author_id,public_metrics,entities",
                ["user.fields"] = "username,verified",
                ["expansions"] = "author_id"
            };

            if (filters.FromDate.HasValue)
            {
                queryParams["start_time"] = filters.FromDate.Value.ToString("yyyy-MM-ddTHH:mm:ssZ");
            }

            if (filters.ToDate.HasValue)
            {
                queryParams["end_time"] = filters.ToDate.Value.ToString("yyyy-MM-ddTHH:mm:ssZ");
            }

            // Build URL
            var queryString = string.Join("&", queryParams.Select(kvp => $"{kvp.Key}={Uri.EscapeDataString(kvp.Value)}"));
            var url = $"https://api.twitter.com/2/tweets/search/recent?{queryString}";

            // Set authorization header
            _httpClient.DefaultRequestHeaders.Clear();
            _httpClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {bearerToken}");

            var response = await _httpClient.GetAsync(url);

            if (!response.IsSuccessStatusCode)
            {
                var errorContent = await response.Content.ReadAsStringAsync();
                result.ErrorMessage = $"Twitter API error: {response.StatusCode} - {errorContent}";
                _logger.LogError("Twitter API error: {StatusCode} - {Error}", response.StatusCode, errorContent);
                return result;
            }

            var json = await response.Content.ReadAsStringAsync();
            var tweets = ParseTwitterResponse(json);

            result.Items = tweets;
            result.TotalResults = tweets.Count;
            result.Success = true;
            result.SearchedAt = DateTime.UtcNow;

            _logger.LogInformation("Twitter search completed: {Count} results for query '{Query}'", tweets.Count, query);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to search Twitter for query: {Query}", query);
            result.ErrorMessage = ex.Message;
        }

        return result;
    }

    private string BuildTwitterQuery(string query, ExternalSearchFilters filters)
    {
        var twitterQuery = query;

        // Add username filter
        if (!string.IsNullOrEmpty(filters.TwitterUsername))
        {
            twitterQuery += $" from:{filters.TwitterUsername}";
        }

        // Add verified filter
        if (filters.TwitterVerifiedOnly == true)
        {
            twitterQuery += " is:verified";
        }

        // Add language filter
        if (!string.IsNullOrEmpty(filters.Language))
        {
            twitterQuery += $" lang:{filters.Language}";
        }

        // Exclude retweets
        twitterQuery += " -is:retweet";

        return twitterQuery;
    }

    private List<ExternalSearchItem> ParseTwitterResponse(string json)
    {
        var items = new List<ExternalSearchItem>();

        try
        {
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;

            if (!root.TryGetProperty("data", out var dataArray))
            {
                return items;
            }

            // Parse users for lookup
            var users = new Dictionary<string, JsonElement>();
            if (root.TryGetProperty("includes", out var includes) && includes.TryGetProperty("users", out var usersArray))
            {
                foreach (var user in usersArray.EnumerateArray())
                {
                    if (user.TryGetProperty("id", out var userId))
                    {
                        users[userId.GetString()!] = user;
                    }
                }
            }

            foreach (var tweet in dataArray.EnumerateArray())
            {
                var item = new ExternalSearchItem
                {
                    Id = tweet.GetProperty("id").GetString() ?? "",
                    Content = tweet.GetProperty("text").GetString() ?? "",
                    Title = "", // Twitter doesn't have titles, use truncated content
                    Source = "Twitter",
                    Url = $"https://twitter.com/i/web/status/{tweet.GetProperty("id").GetString()}"
                };

                // Get author info
                if (tweet.TryGetProperty("author_id", out var authorId) && users.TryGetValue(authorId.GetString()!, out var user))
                {
                    item.Author = user.GetProperty("username").GetString() ?? "Unknown";
                }

                // Get published date
                if (tweet.TryGetProperty("created_at", out var createdAt))
                {
                    item.PublishedAt = DateTime.Parse(createdAt.GetString()!);
                }

                // Get engagement metrics
                if (tweet.TryGetProperty("public_metrics", out var metrics))
                {
                    var likes = metrics.TryGetProperty("like_count", out var likeCount) ? likeCount.GetInt32() : 0;
                    var retweets = metrics.TryGetProperty("retweet_count", out var retweetCount) ? retweetCount.GetInt32() : 0;
                    item.EngagementCount = likes + retweets;

                    item.Metadata["likes"] = likes;
                    item.Metadata["retweets"] = retweets;
                }

                // Use first 100 chars of content as title
                item.Title = item.Content.Length > 100 ? item.Content.Substring(0, 100) + "..." : item.Content;

                items.Add(item);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to parse Twitter response");
        }

        return items;
    }

}
