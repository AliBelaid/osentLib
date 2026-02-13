namespace AUSentinel.Api.Models;

public record NewsSearchRequest
{
    public string? Query { get; init; }
    public string? Country { get; init; }
    public string? Category { get; init; }
    public string? ThreatType { get; init; }
    public int? MinThreatLevel { get; init; }
    public int? MaxThreatLevel { get; init; }
    public DateTime? From { get; init; }
    public DateTime? To { get; init; }
    public string SortBy { get; init; } = "publishedAt";
    public string SortOrder { get; init; } = "desc";
    public int Page { get; init; } = 1;
    public int PageSize { get; init; } = 20;
}

public record NewsArticleDto
{
    public Guid Id { get; init; }
    public string Title { get; init; } = string.Empty;
    public string? Summary { get; init; }
    public string Url { get; init; } = string.Empty;
    public string? ImageUrl { get; init; }
    public string SourceName { get; init; } = string.Empty;
    public string Language { get; init; } = string.Empty;
    public DateTime PublishedAt { get; init; }
    public List<string> CountryTags { get; init; } = new();
    public List<string> Categories { get; init; } = new();
    public string? ThreatType { get; init; }
    public int ThreatLevel { get; init; }
    public double CredibilityScore { get; init; }
    public VoteStatsDto? VoteStats { get; init; }
    public List<EntityDto> Entities { get; init; } = new();
}

public record NewsDetailDto : NewsArticleDto
{
    public string Body { get; init; } = string.Empty;
    public string? UserVote { get; init; }
}

public record VoteStatsDto(int RealCount, int MisleadingCount, int UnsureCount);

public record EntityDto(string Name, string Type);

public record NewsSearchResult
{
    public List<NewsArticleDto> Items { get; init; } = new();
    public long Total { get; init; }
    public Dictionary<string, List<FacetBucket>> Facets { get; init; } = new();
}

public record FacetBucket(string Key, long Count);

public record TrendResult
{
    public List<FacetBucket> TopCategories { get; init; } = new();
    public List<FacetBucket> TopEntities { get; init; } = new();
    public List<FacetBucket> TopCountries { get; init; } = new();
    public List<ThreatLevelBucket> ThreatDistribution { get; init; } = new();
}

public record ThreatLevelBucket(int Level, long Count);
