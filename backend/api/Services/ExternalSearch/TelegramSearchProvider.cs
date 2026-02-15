using System.Text.Json;

namespace AUSentinel.Api.Services.ExternalSearch;

/// <summary>
/// Hacker News Search Provider - Uses real Algolia-powered HN Search API.
/// Completely free, no API key required, no rate limiting concerns.
/// Searches stories, comments, and discussions from Hacker News.
/// API docs: https://hn.algolia.com/api
/// </summary>
public class TelegramSearchProvider : IExternalSearchProvider
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<TelegramSearchProvider> _logger;

    public string ProviderName => "HackerNews";
    public bool IsConfigured => true; // No API key needed

    public TelegramSearchProvider(
        HttpClient httpClient,
        ILogger<TelegramSearchProvider> logger)
    {
        _httpClient = httpClient;
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
            var items = new List<ExternalSearchItem>();

            // Search stories (articles)
            var storyItems = await SearchStories(query, filters);
            items.AddRange(storyItems);

            // Search comments for deeper discussion intel
            var commentItems = await SearchComments(query, filters);
            items.AddRange(commentItems);

            // Sort by date (newest first) and limit
            result.Items = items
                .OrderByDescending(i => i.PublishedAt)
                .Take(filters.MaxResults)
                .ToList();
            result.TotalResults = result.Items.Count;
            result.Success = true;
            result.SearchedAt = DateTime.UtcNow;

            if (result.TotalResults == 0)
            {
                _logger.LogInformation("HackerNews search: no results for '{Query}'", query);
            }
            else
            {
                _logger.LogInformation("HackerNews search: {Count} results for '{Query}'", result.TotalResults, query);
            }
        }
        catch (Exception ex)
        {
            result.ErrorMessage = $"Hacker News search failed: {ex.Message}";
            _logger.LogError(ex, "HackerNews search failed for query: {Query}", query);
        }

        return result;
    }

    private async Task<List<ExternalSearchItem>> SearchStories(string query, ExternalSearchFilters filters)
    {
        var items = new List<ExternalSearchItem>();

        try
        {
            var encodedQuery = Uri.EscapeDataString(query);
            var maxResults = Math.Min(filters.MaxResults, 20);
            var url = $"https://hn.algolia.com/api/v1/search?query={encodedQuery}&tags=story&hitsPerPage={maxResults}";

            // Add date filters
            if (filters.FromDate.HasValue)
            {
                var fromUnix = new DateTimeOffset(filters.FromDate.Value).ToUnixTimeSeconds();
                url += $"&numericFilters=created_at_i>{fromUnix}";
            }

            var response = await _httpClient.GetAsync(url);
            if (!response.IsSuccessStatusCode) return items;

            var json = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;

            if (!root.TryGetProperty("hits", out var hits)) return items;

            foreach (var hit in hits.EnumerateArray())
            {
                var title = hit.TryGetProperty("title", out var t) && t.ValueKind != JsonValueKind.Null
                    ? t.GetString() ?? "" : "";
                var storyUrl = hit.TryGetProperty("url", out var u) && u.ValueKind != JsonValueKind.Null
                    ? u.GetString() ?? "" : "";
                var author = hit.TryGetProperty("author", out var a) ? a.GetString() ?? "" : "";
                var points = hit.TryGetProperty("points", out var p) && p.ValueKind != JsonValueKind.Null
                    ? p.GetInt32() : 0;
                var numComments = hit.TryGetProperty("num_comments", out var nc) && nc.ValueKind != JsonValueKind.Null
                    ? nc.GetInt32() : 0;
                var objectID = hit.TryGetProperty("objectID", out var oid) ? oid.GetString() ?? "" : "";
                var createdAt = hit.TryGetProperty("created_at", out var ca) && DateTime.TryParse(ca.GetString(), out var caDate)
                    ? caDate : DateTime.UtcNow;

                var hnUrl = $"https://news.ycombinator.com/item?id={objectID}";

                items.Add(new ExternalSearchItem
                {
                    Id = $"hn_story_{objectID}",
                    Title = title,
                    Content = !string.IsNullOrEmpty(storyUrl)
                        ? $"{title} — {storyUrl}"
                        : title,
                    Author = author,
                    Source = "HackerNews",
                    Url = hnUrl,
                    PublishedAt = createdAt,
                    EngagementCount = points,
                    Metadata = new Dictionary<string, object>
                    {
                        ["type"] = "story",
                        ["points"] = points,
                        ["comments"] = numComments,
                        ["story_url"] = storyUrl,
                        ["platform"] = "HackerNews",
                        ["hn_id"] = objectID
                    }
                });
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "HN story search failed");
        }

        return items;
    }

    private async Task<List<ExternalSearchItem>> SearchComments(string query, ExternalSearchFilters filters)
    {
        var items = new List<ExternalSearchItem>();

        try
        {
            var encodedQuery = Uri.EscapeDataString(query);
            var url = $"https://hn.algolia.com/api/v1/search?query={encodedQuery}&tags=comment&hitsPerPage=10";

            if (filters.FromDate.HasValue)
            {
                var fromUnix = new DateTimeOffset(filters.FromDate.Value).ToUnixTimeSeconds();
                url += $"&numericFilters=created_at_i>{fromUnix}";
            }

            var response = await _httpClient.GetAsync(url);
            if (!response.IsSuccessStatusCode) return items;

            var json = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;

            if (!root.TryGetProperty("hits", out var hits)) return items;

            foreach (var hit in hits.EnumerateArray())
            {
                var commentText = hit.TryGetProperty("comment_text", out var ct) && ct.ValueKind != JsonValueKind.Null
                    ? ct.GetString() ?? "" : "";
                // Strip HTML tags from comment
                commentText = System.Text.RegularExpressions.Regex.Replace(commentText, "<[^>]+>", " ");
                commentText = System.Net.WebUtility.HtmlDecode(commentText);
                if (commentText.Length > 500) commentText = commentText[..500] + "...";

                var storyTitle = hit.TryGetProperty("story_title", out var st) && st.ValueKind != JsonValueKind.Null
                    ? st.GetString() ?? "" : "Discussion";
                var author = hit.TryGetProperty("author", out var a) ? a.GetString() ?? "" : "";
                var objectID = hit.TryGetProperty("objectID", out var oid) ? oid.GetString() ?? "" : "";
                var storyId = hit.TryGetProperty("story_id", out var sid) ? sid.GetInt64().ToString() : "";
                var createdAt = hit.TryGetProperty("created_at", out var ca) && DateTime.TryParse(ca.GetString(), out var caDate)
                    ? caDate : DateTime.UtcNow;

                if (string.IsNullOrWhiteSpace(commentText)) continue;

                var hnUrl = $"https://news.ycombinator.com/item?id={objectID}";

                items.Add(new ExternalSearchItem
                {
                    Id = $"hn_comment_{objectID}",
                    Title = $"[Comment] Re: {storyTitle}",
                    Content = commentText,
                    Author = author,
                    Source = "HackerNews",
                    Url = hnUrl,
                    PublishedAt = createdAt,
                    EngagementCount = 0,
                    Metadata = new Dictionary<string, object>
                    {
                        ["type"] = "comment",
                        ["story_title"] = storyTitle,
                        ["story_id"] = storyId,
                        ["platform"] = "HackerNews",
                        ["hn_id"] = objectID
                    }
                });
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "HN comment search failed");
        }

        return items;
    }
}
