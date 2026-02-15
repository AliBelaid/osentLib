namespace AUSentinel.Api.Models;

public record CountryStatsDto(
    string CountryCode,
    string Name,
    string NameArabic,
    string Region,
    int AlertCount,
    int ArticleCount,
    double AvgThreatLevel,
    int MaxThreatLevel,
    int ActiveAlertCount
);

public record ThreatActivityDto(
    int Id,
    string Type,
    string Title,
    int Severity,
    string SourceCountryCode,
    string TargetCountryCode,
    DateTime Timestamp,
    string Category
);

public record TimelineBucketDto(
    DateTime Date,
    string CountryCode,
    int AlertCount,
    int ArticleCount,
    double AvgThreatLevel
);

public record DashboardSummaryDto(
    int TotalArticles,
    int TotalAlerts,
    int ActiveAlerts,
    double AvgThreatLevel,
    List<SourceCountDto> ArticlesBySource,
    List<FacetBucketDto> TopCountries,
    List<FacetBucketDto> TopCategories,
    List<ThreatLevelDistDto> ThreatDistribution,
    List<TimelinePointDto> RecentTimeline,
    List<OsintSourceInfoDto> OsintSources
);

public record SourceCountDto(string SourceName, string SourceType, int Count);
public record FacetBucketDto(string Key, int Count);
public record ThreatLevelDistDto(int Level, int Count, string Label);
public record TimelinePointDto(string Date, int Count);
public record OsintSourceInfoDto(
    string Name,
    string Type,
    string Url,
    string Description,
    bool IsActive,
    int ArticleCount,
    DateTime? LastFetchedAt
);
