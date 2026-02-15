using System.Text.Json;

namespace AUSentinel.Api.Services.ExternalSearch;

public class NewsApiProvider : IExternalSearchProvider
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;
    private readonly ILogger<NewsApiProvider> _logger;

    public string ProviderName => "NewsAPI";

    public bool IsConfigured
    {
        get
        {
            var apiKey = _configuration["ExternalApis:NewsApi:ApiKey"];
            return !string.IsNullOrEmpty(apiKey);
        }
    }

    public NewsApiProvider(
        HttpClient httpClient,
        IConfiguration configuration,
        ILogger<NewsApiProvider> logger)
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
            _logger.LogInformation("NewsAPI not configured for '{Query}'", query);
            result.ErrorMessage = "NewsAPI key not configured. Get a free key at newsapi.org and add it to settings.";
            return result;
        }

        try
        {
            var apiKey = _configuration["ExternalApis:NewsApi:ApiKey"];

            // Build query parameters
            var queryParams = new Dictionary<string, string>
            {
                ["q"] = query,
                ["pageSize"] = Math.Min(filters.MaxResults, 100).ToString(),
                ["apiKey"] = apiKey!,
                ["sortBy"] = "relevancy"
            };

            // Add date filters
            if (filters.FromDate.HasValue)
            {
                queryParams["from"] = filters.FromDate.Value.ToString("yyyy-MM-dd");
            }

            if (filters.ToDate.HasValue)
            {
                queryParams["to"] = filters.ToDate.Value.ToString("yyyy-MM-dd");
            }

            // Add language filter
            if (!string.IsNullOrEmpty(filters.Language))
            {
                queryParams["language"] = filters.Language;
            }

            // Add sources filter
            if (!string.IsNullOrEmpty(filters.NewsApiSources))
            {
                queryParams["sources"] = filters.NewsApiSources;
            }

            // Add domains filter
            if (!string.IsNullOrEmpty(filters.NewsApiDomains))
            {
                queryParams["domains"] = filters.NewsApiDomains;
            }

            // Build URL
            var queryString = string.Join("&", queryParams.Select(kvp => $"{kvp.Key}={Uri.EscapeDataString(kvp.Value)}"));
            var url = $"https://newsapi.org/v2/everything?{queryString}";

            var response = await _httpClient.GetAsync(url);

            if (!response.IsSuccessStatusCode)
            {
                var errorContent = await response.Content.ReadAsStringAsync();
                result.ErrorMessage = $"NewsAPI error: {response.StatusCode} - {errorContent}";
                _logger.LogError("NewsAPI error: {StatusCode} - {Error}", response.StatusCode, errorContent);
                return result;
            }

            var json = await response.Content.ReadAsStringAsync();
            var articles = ParseNewsApiResponse(json);

            result.Items = articles;
            result.TotalResults = articles.Count;
            result.Success = true;
            result.SearchedAt = DateTime.UtcNow;

            _logger.LogInformation("NewsAPI search completed: {Count} results for query '{Query}'", articles.Count, query);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to search NewsAPI for query: {Query}", query);
            result.ErrorMessage = ex.Message;
        }

        return result;
    }

    private List<ExternalSearchItem> ParseNewsApiResponse(string json)
    {
        var items = new List<ExternalSearchItem>();

        try
        {
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;

            if (root.GetProperty("status").GetString() != "ok")
            {
                return items;
            }

            if (!root.TryGetProperty("articles", out var articles))
            {
                return items;
            }

            foreach (var article in articles.EnumerateArray())
            {
                var item = new ExternalSearchItem
                {
                    Title = article.TryGetProperty("title", out var title) ? title.GetString() ?? "" : "",
                    Content = article.TryGetProperty("description", out var desc) ? desc.GetString() ?? "" : "",
                    Url = article.TryGetProperty("url", out var url) ? url.GetString() ?? "" : "",
                    Source = "NewsAPI"
                };

                // Get source name
                if (article.TryGetProperty("source", out var source) && source.TryGetProperty("name", out var sourceName))
                {
                    item.Author = sourceName.GetString() ?? "Unknown";
                    item.Metadata["source_id"] = source.TryGetProperty("id", out var sourceId) ? sourceId.GetString() : "";
                }

                // Get author
                if (article.TryGetProperty("author", out var author))
                {
                    var authorName = author.GetString();
                    if (!string.IsNullOrEmpty(authorName))
                    {
                        item.Metadata["author"] = authorName;
                    }
                }

                // Get published date
                if (article.TryGetProperty("publishedAt", out var publishedAt))
                {
                    if (DateTime.TryParse(publishedAt.GetString(), out var pubDate))
                    {
                        item.PublishedAt = pubDate;
                    }
                }

                // Get image URL
                if (article.TryGetProperty("urlToImage", out var imageUrl))
                {
                    var imgUrl = imageUrl.GetString();
                    if (!string.IsNullOrEmpty(imgUrl))
                    {
                        item.Metadata["image_url"] = imgUrl;
                    }
                }

                // Get full content if available
                if (article.TryGetProperty("content", out var content))
                {
                    var fullContent = content.GetString();
                    if (!string.IsNullOrEmpty(fullContent))
                    {
                        item.Metadata["full_content"] = fullContent;
                    }
                }

                // Generate ID from URL
                item.Id = Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes(item.Url)).Substring(0, 20);

                // NewsAPI doesn't provide engagement metrics
                item.EngagementCount = 0;

                items.Add(item);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to parse NewsAPI response");
        }

        return items;
    }

}
