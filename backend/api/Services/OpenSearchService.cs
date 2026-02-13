using System.Text;
using System.Text.Json;
using AUSentinel.Api.Models;

namespace AUSentinel.Api.Services;

public interface IOpenSearchService
{
    Task<NewsSearchResult> SearchAsync(NewsSearchRequest request, string? countryScope);
    Task<TrendResult> GetTrendsAsync(string? country, string period);
    Task<NewsArticleDto?> GetByIdAsync(string articleId);
    Task UpsertArticleAsync(string articleId, object document);
}

public class OpenSearchService : IOpenSearchService
{
    private readonly HttpClient _http;
    private readonly string _baseUrl;
    private readonly ILogger<OpenSearchService> _logger;

    public OpenSearchService(IConfiguration config, ILogger<OpenSearchService> logger)
    {
        _baseUrl = config["OpenSearch:Url"] ?? "http://localhost:9200";
        _http = new HttpClient { BaseAddress = new Uri(_baseUrl) };
        _logger = logger;
    }

    public async Task<NewsSearchResult> SearchAsync(NewsSearchRequest request, string? countryScope)
    {
        var must = new List<object>();
        var filter = new List<object>();

        if (!string.IsNullOrEmpty(request.Query))
        {
            must.Add(new
            {
                multi_match = new
                {
                    query = request.Query,
                    fields = new[] { "title^3", "body", "summary", "title.english^2" },
                    type = "best_fields"
                }
            });
        }

        // Country scoping
        if (!string.IsNullOrEmpty(countryScope))
        {
            filter.Add(new { term = new { countryTags = countryScope } });
        }
        else if (!string.IsNullOrEmpty(request.Country))
        {
            filter.Add(new { term = new { countryTags = request.Country } });
        }

        if (!string.IsNullOrEmpty(request.Category))
            filter.Add(new { term = new { categories = request.Category } });

        if (!string.IsNullOrEmpty(request.ThreatType))
            filter.Add(new { term = new { threatType = request.ThreatType } });

        if (request.MinThreatLevel.HasValue)
            filter.Add(new { range = new { threatLevel = new { gte = request.MinThreatLevel.Value } } });

        if (request.MaxThreatLevel.HasValue)
            filter.Add(new { range = new { threatLevel = new { lte = request.MaxThreatLevel.Value } } });

        if (request.From.HasValue)
            filter.Add(new { range = new { publishedAt = new { gte = request.From.Value.ToString("o") } } });

        if (request.To.HasValue)
            filter.Add(new { range = new { publishedAt = new { lte = request.To.Value.ToString("o") } } });

        var sortField = request.SortBy switch
        {
            "threatLevel" => "threatLevel",
            "credibilityScore" => "credibilityScore",
            _ => "publishedAt"
        };

        var query = new
        {
            from = (request.Page - 1) * request.PageSize,
            size = request.PageSize,
            query = new
            {
                @bool = new
                {
                    must = must.Count > 0 ? must : new List<object> { new { match_all = new { } } },
                    filter
                }
            },
            sort = new object[] { new Dictionary<string, object> { [sortField] = new { order = request.SortOrder } } },
            aggs = new
            {
                categories = new { terms = new { field = "categories", size = 20 } },
                countries = new { terms = new { field = "countryTags", size = 60 } },
                threatLevels = new { terms = new { field = "threatLevel", size = 6 } },
                threatTypes = new { terms = new { field = "threatType", size = 20 } }
            }
        };

        var json = JsonSerializer.Serialize(query);
        var response = await _http.PostAsync("/au-news/_search",
            new StringContent(json, Encoding.UTF8, "application/json"));

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogWarning("OpenSearch search failed: {Status}", response.StatusCode);
            return new NewsSearchResult();
        }

        var body = await response.Content.ReadAsStringAsync();
        var doc = JsonDocument.Parse(body);
        var root = doc.RootElement;

        var hits = root.GetProperty("hits");
        var total = hits.GetProperty("total").GetProperty("value").GetInt64();
        var items = new List<NewsArticleDto>();

        foreach (var hit in hits.GetProperty("hits").EnumerateArray())
        {
            var src = hit.GetProperty("_source");
            items.Add(ParseArticle(src));
        }

        var facets = new Dictionary<string, List<FacetBucket>>();
        if (root.TryGetProperty("aggregations", out var aggs))
        {
            facets["categories"] = ParseBuckets(aggs, "categories");
            facets["countries"] = ParseBuckets(aggs, "countries");
            facets["threatLevels"] = ParseBuckets(aggs, "threatLevels");
            facets["threatTypes"] = ParseBuckets(aggs, "threatTypes");
        }

        return new NewsSearchResult { Items = items, Total = total, Facets = facets };
    }

    public async Task<TrendResult> GetTrendsAsync(string? country, string period)
    {
        var rangeFilter = period switch
        {
            "7d" => "now-7d/d",
            _ => "now-24h"
        };

        var filter = new List<object>
        {
            new { range = new { publishedAt = new { gte = rangeFilter } } }
        };

        if (!string.IsNullOrEmpty(country))
            filter.Add(new { term = new { countryTags = country } });

        var query = new
        {
            size = 0,
            query = new { @bool = new { filter } },
            aggs = new
            {
                topCategories = new { terms = new { field = "categories", size = 10 } },
                topEntities = new
                {
                    nested = new { path = "entities" },
                    aggs = new
                    {
                        names = new { terms = new { field = "entities.name.keyword", size = 10 } }
                    }
                },
                topCountries = new { terms = new { field = "countryTags", size = 10 } },
                threatDistribution = new { terms = new { field = "threatLevel", size = 6 } }
            }
        };

        var json = JsonSerializer.Serialize(query);
        var response = await _http.PostAsync("/au-news/_search",
            new StringContent(json, Encoding.UTF8, "application/json"));

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogWarning("OpenSearch trend query failed: {Status}", response.StatusCode);
            return new TrendResult();
        }

        var body = await response.Content.ReadAsStringAsync();
        var doc = JsonDocument.Parse(body);
        var aggs = doc.RootElement.GetProperty("aggregations");

        var topCategories = ParseBuckets(aggs, "topCategories");
        var topCountries = ParseBuckets(aggs, "topCountries");

        var topEntities = new List<FacetBucket>();
        if (aggs.TryGetProperty("topEntities", out var entAgg) &&
            entAgg.TryGetProperty("names", out var namesAgg))
        {
            topEntities = ParseBuckets(aggs.GetProperty("topEntities"), "names");
        }

        var threatDist = new List<ThreatLevelBucket>();
        foreach (var bucket in ParseBuckets(aggs, "threatDistribution"))
        {
            if (int.TryParse(bucket.Key, out var level))
                threatDist.Add(new ThreatLevelBucket(level, bucket.Count));
        }

        return new TrendResult
        {
            TopCategories = topCategories,
            TopEntities = topEntities,
            TopCountries = topCountries,
            ThreatDistribution = threatDist
        };
    }

    public async Task<NewsArticleDto?> GetByIdAsync(string articleId)
    {
        var query = new
        {
            query = new { term = new { articleId } }
        };

        var json = JsonSerializer.Serialize(query);
        var response = await _http.PostAsync("/au-news/_search",
            new StringContent(json, Encoding.UTF8, "application/json"));

        if (!response.IsSuccessStatusCode) return null;

        var body = await response.Content.ReadAsStringAsync();
        var doc = JsonDocument.Parse(body);
        var hits = doc.RootElement.GetProperty("hits").GetProperty("hits");

        if (hits.GetArrayLength() == 0) return null;

        return ParseArticle(hits[0].GetProperty("_source"));
    }

    public async Task UpsertArticleAsync(string articleId, object document)
    {
        var json = JsonSerializer.Serialize(document);
        var response = await _http.PutAsync($"/au-news/_doc/{articleId}",
            new StringContent(json, Encoding.UTF8, "application/json"));

        if (!response.IsSuccessStatusCode)
        {
            var error = await response.Content.ReadAsStringAsync();
            _logger.LogError("OpenSearch upsert failed for {Id}: {Error}", articleId, error);
        }
    }

    private static NewsArticleDto ParseArticle(JsonElement src)
    {
        return new NewsArticleDto
        {
            Id = src.TryGetProperty("articleId", out var id) ? Guid.Parse(id.GetString()!) : Guid.Empty,
            Title = src.TryGetProperty("title", out var t) ? t.GetString() ?? "" : "",
            Summary = src.TryGetProperty("summary", out var s) ? s.GetString() : null,
            Url = src.TryGetProperty("url", out var u) ? u.GetString() ?? "" : "",
            ImageUrl = src.TryGetProperty("imageUrl", out var img) ? img.GetString() : null,
            SourceName = src.TryGetProperty("sourceName", out var sn) ? sn.GetString() ?? "" : "",
            Language = src.TryGetProperty("language", out var l) ? l.GetString() ?? "en" : "en",
            PublishedAt = src.TryGetProperty("publishedAt", out var p) ? p.GetDateTime() : DateTime.MinValue,
            CountryTags = src.TryGetProperty("countryTags", out var ct) ? ct.EnumerateArray().Select(x => x.GetString()!).ToList() : new(),
            Categories = src.TryGetProperty("categories", out var cats) ? cats.EnumerateArray().Select(x => x.GetString()!).ToList() : new(),
            ThreatType = src.TryGetProperty("threatType", out var tt) ? tt.GetString() : null,
            ThreatLevel = src.TryGetProperty("threatLevel", out var tl) ? tl.GetInt32() : 0,
            CredibilityScore = src.TryGetProperty("credibilityScore", out var cs) ? cs.GetDouble() : 0.5,
            VoteStats = src.TryGetProperty("voteStats", out var vs) ? new VoteStatsDto(
                vs.TryGetProperty("realCount", out var rc) ? rc.GetInt32() : 0,
                vs.TryGetProperty("misleadingCount", out var mc) ? mc.GetInt32() : 0,
                vs.TryGetProperty("unsureCount", out var uc) ? uc.GetInt32() : 0
            ) : null,
            Entities = src.TryGetProperty("entities", out var ents)
                ? ents.EnumerateArray().Select(e => new EntityDto(
                    e.TryGetProperty("name", out var en) ? en.GetString() ?? "" : "",
                    e.TryGetProperty("type", out var et) ? et.GetString() ?? "" : ""
                )).ToList()
                : new()
        };
    }

    private static List<FacetBucket> ParseBuckets(JsonElement aggs, string name)
    {
        if (!aggs.TryGetProperty(name, out var agg)) return new();
        if (!agg.TryGetProperty("buckets", out var buckets)) return new();

        return buckets.EnumerateArray().Select(b => new FacetBucket(
            b.GetProperty("key").ToString(),
            b.GetProperty("doc_count").GetInt64()
        )).ToList();
    }
}
