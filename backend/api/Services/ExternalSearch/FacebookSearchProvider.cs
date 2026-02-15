using System.Text.Json;

namespace AUSentinel.Api.Services.ExternalSearch;

/// <summary>
/// GitHub Search Provider - Uses real GitHub REST API (no API key required for basic searches).
/// Rate limit: 10 requests/minute unauthenticated, 30/minute with token.
/// Searches repositories, users, code, and issues.
/// </summary>
public class FacebookSearchProvider : IExternalSearchProvider
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;
    private readonly ILogger<FacebookSearchProvider> _logger;

    public string ProviderName => "GitHub";
    public bool IsConfigured => true; // GitHub API works without authentication

    public FacebookSearchProvider(
        HttpClient httpClient,
        IConfiguration configuration,
        ILogger<FacebookSearchProvider> logger)
    {
        _httpClient = httpClient;
        _configuration = configuration;
        _logger = logger;

        // GitHub API requires User-Agent header
        if (!_httpClient.DefaultRequestHeaders.Contains("User-Agent"))
        {
            _httpClient.DefaultRequestHeaders.Add("User-Agent", "AUSentinel-OSINT-Platform");
        }
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

            // Search repositories
            var repoItems = await SearchRepositories(query, filters);
            items.AddRange(repoItems);

            // Search users/organizations
            var userItems = await SearchUsers(query, filters);
            items.AddRange(userItems);

            // Search code (issues with mentions)
            var issueItems = await SearchIssues(query, filters);
            items.AddRange(issueItems);

            result.Items = items.Take(filters.MaxResults).ToList();
            result.TotalResults = result.Items.Count;
            result.Success = true;
            result.SearchedAt = DateTime.UtcNow;

            if (result.TotalResults == 0)
            {
                _logger.LogInformation("GitHub search: no results found for '{Query}'", query);
            }
            else
            {
                _logger.LogInformation("GitHub search: {Count} results for '{Query}'", result.TotalResults, query);
            }
        }
        catch (HttpRequestException ex) when (ex.StatusCode == System.Net.HttpStatusCode.Forbidden)
        {
            result.ErrorMessage = "GitHub API rate limit exceeded. Please wait a moment and try again.";
            _logger.LogWarning("GitHub API rate limit exceeded for query: {Query}", query);
        }
        catch (Exception ex)
        {
            result.ErrorMessage = $"GitHub search failed: {ex.Message}";
            _logger.LogError(ex, "GitHub search failed for query: {Query}", query);
        }

        return result;
    }

    private async Task<List<ExternalSearchItem>> SearchRepositories(string query, ExternalSearchFilters filters)
    {
        var items = new List<ExternalSearchItem>();

        try
        {
            var encodedQuery = Uri.EscapeDataString(query);
            var url = $"https://api.github.com/search/repositories?q={encodedQuery}&sort=stars&order=desc&per_page=10";

            var request = new HttpRequestMessage(HttpMethod.Get, url);
            request.Headers.Add("Accept", "application/vnd.github.v3+json");

            // Use token if available for higher rate limits
            var token = _configuration["ExternalApis:GitHub:Token"];
            if (!string.IsNullOrEmpty(token))
            {
                request.Headers.Add("Authorization", $"token {token}");
            }

            var response = await _httpClient.SendAsync(request);
            if (!response.IsSuccessStatusCode) return items;

            var json = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;

            if (!root.TryGetProperty("items", out var repoItems)) return items;

            foreach (var repo in repoItems.EnumerateArray())
            {
                var name = repo.GetProperty("full_name").GetString() ?? "";
                var description = repo.TryGetProperty("description", out var desc) && desc.ValueKind != JsonValueKind.Null
                    ? desc.GetString() ?? "" : "";
                var htmlUrl = repo.GetProperty("html_url").GetString() ?? "";
                var stars = repo.TryGetProperty("stargazers_count", out var s) ? s.GetInt32() : 0;
                var forks = repo.TryGetProperty("forks_count", out var f) ? f.GetInt32() : 0;
                var language = repo.TryGetProperty("language", out var lang) && lang.ValueKind != JsonValueKind.Null
                    ? lang.GetString() ?? "" : "";
                var owner = repo.TryGetProperty("owner", out var o) && o.TryGetProperty("login", out var login)
                    ? login.GetString() ?? "" : "";
                var avatarUrl = repo.TryGetProperty("owner", out var ow) && ow.TryGetProperty("avatar_url", out var av)
                    ? av.GetString() ?? "" : "";
                var updatedAt = repo.TryGetProperty("updated_at", out var ua) && DateTime.TryParse(ua.GetString(), out var uaDate)
                    ? uaDate : DateTime.UtcNow;
                var topics = new List<string>();
                if (repo.TryGetProperty("topics", out var topicsArr))
                {
                    foreach (var t in topicsArr.EnumerateArray())
                        topics.Add(t.GetString() ?? "");
                }

                items.Add(new ExternalSearchItem
                {
                    Id = $"gh_repo_{name.GetHashCode():X}",
                    Title = $"[Repo] {name}",
                    Content = description,
                    Author = owner,
                    Source = "GitHub",
                    Url = htmlUrl,
                    PublishedAt = updatedAt,
                    EngagementCount = stars,
                    Metadata = new Dictionary<string, object>
                    {
                        ["type"] = "repository",
                        ["stars"] = stars,
                        ["forks"] = forks,
                        ["language"] = language,
                        ["topics"] = string.Join(", ", topics),
                        ["platform"] = "GitHub",
                        ["profile_image"] = avatarUrl
                    }
                });
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "GitHub repo search failed for query");
        }

        return items;
    }

    private async Task<List<ExternalSearchItem>> SearchUsers(string query, ExternalSearchFilters filters)
    {
        var items = new List<ExternalSearchItem>();

        try
        {
            var encodedQuery = Uri.EscapeDataString(query);
            var url = $"https://api.github.com/search/users?q={encodedQuery}&per_page=5";

            var request = new HttpRequestMessage(HttpMethod.Get, url);
            request.Headers.Add("Accept", "application/vnd.github.v3+json");

            var token = _configuration["ExternalApis:GitHub:Token"];
            if (!string.IsNullOrEmpty(token))
            {
                request.Headers.Add("Authorization", $"token {token}");
            }

            var response = await _httpClient.SendAsync(request);
            if (!response.IsSuccessStatusCode) return items;

            var json = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;

            if (!root.TryGetProperty("items", out var userItems)) return items;

            foreach (var user in userItems.EnumerateArray())
            {
                var login = user.GetProperty("login").GetString() ?? "";
                var htmlUrl = user.GetProperty("html_url").GetString() ?? "";
                var avatarUrl = user.TryGetProperty("avatar_url", out var av) ? av.GetString() ?? "" : "";
                var userType = user.TryGetProperty("type", out var ut) ? ut.GetString() ?? "User" : "User";
                var score = user.TryGetProperty("score", out var sc) ? sc.GetDouble() : 0;

                items.Add(new ExternalSearchItem
                {
                    Id = $"gh_user_{login.GetHashCode():X}",
                    Title = $"[{userType}] {login}",
                    Content = $"GitHub {userType.ToLower()}: {login} - Profile at {htmlUrl}",
                    Author = login,
                    Source = "GitHub",
                    Url = htmlUrl,
                    PublishedAt = DateTime.UtcNow,
                    EngagementCount = (int)score,
                    Metadata = new Dictionary<string, object>
                    {
                        ["type"] = "user",
                        ["user_type"] = userType,
                        ["platform"] = "GitHub",
                        ["profile_image"] = avatarUrl,
                        ["relevance_score"] = score
                    }
                });
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "GitHub user search failed for query");
        }

        return items;
    }

    private async Task<List<ExternalSearchItem>> SearchIssues(string query, ExternalSearchFilters filters)
    {
        var items = new List<ExternalSearchItem>();

        try
        {
            var encodedQuery = Uri.EscapeDataString(query);
            var url = $"https://api.github.com/search/issues?q={encodedQuery}&sort=created&order=desc&per_page=5";

            var request = new HttpRequestMessage(HttpMethod.Get, url);
            request.Headers.Add("Accept", "application/vnd.github.v3+json");

            var token = _configuration["ExternalApis:GitHub:Token"];
            if (!string.IsNullOrEmpty(token))
            {
                request.Headers.Add("Authorization", $"token {token}");
            }

            var response = await _httpClient.SendAsync(request);
            if (!response.IsSuccessStatusCode) return items;

            var json = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;

            if (!root.TryGetProperty("items", out var issueItems)) return items;

            foreach (var issue in issueItems.EnumerateArray())
            {
                var title = issue.GetProperty("title").GetString() ?? "";
                var body = issue.TryGetProperty("body", out var b) && b.ValueKind != JsonValueKind.Null
                    ? b.GetString() ?? "" : "";
                if (body.Length > 500) body = body[..500] + "...";
                var htmlUrl = issue.GetProperty("html_url").GetString() ?? "";
                var author = issue.TryGetProperty("user", out var u) && u.TryGetProperty("login", out var login)
                    ? login.GetString() ?? "" : "";
                var avatarUrl = issue.TryGetProperty("user", out var usr) && usr.TryGetProperty("avatar_url", out var av)
                    ? av.GetString() ?? "" : "";
                var state = issue.TryGetProperty("state", out var st) ? st.GetString() ?? "" : "";
                var comments = issue.TryGetProperty("comments", out var c) ? c.GetInt32() : 0;
                var createdAt = issue.TryGetProperty("created_at", out var ca) && DateTime.TryParse(ca.GetString(), out var caDate)
                    ? caDate : DateTime.UtcNow;
                var isPr = htmlUrl.Contains("/pull/");
                var labels = new List<string>();
                if (issue.TryGetProperty("labels", out var labelsArr))
                {
                    foreach (var lbl in labelsArr.EnumerateArray())
                    {
                        if (lbl.TryGetProperty("name", out var lblName))
                            labels.Add(lblName.GetString() ?? "");
                    }
                }

                items.Add(new ExternalSearchItem
                {
                    Id = $"gh_issue_{htmlUrl.GetHashCode():X}",
                    Title = $"[{(isPr ? "PR" : "Issue")}] {title}",
                    Content = body,
                    Author = author,
                    Source = "GitHub",
                    Url = htmlUrl,
                    PublishedAt = createdAt,
                    EngagementCount = comments,
                    Metadata = new Dictionary<string, object>
                    {
                        ["type"] = isPr ? "pull_request" : "issue",
                        ["state"] = state,
                        ["comments"] = comments,
                        ["labels"] = string.Join(", ", labels),
                        ["platform"] = "GitHub",
                        ["profile_image"] = avatarUrl
                    }
                });
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "GitHub issue search failed for query");
        }

        return items;
    }
}
