namespace AUSentinel.Api.Models;

// Saved Search Models
public record SavedSearchDto(
    int Id,
    Guid UserId,
    string Name,
    string? Description,
    string Query,
    string? Category,
    string? ThreatType,
    int? MinThreatLevel,
    string? CountryCode,
    string? SortBy,
    bool IsPublic,
    int ExecutionCount,
    DateTime LastExecutedAt,
    DateTime CreatedAt,
    DateTime? UpdatedAt
);

public record CreateSavedSearchRequest(
    string Name,
    string? Description,
    string Query,
    string? Category,
    string? ThreatType,
    int? MinThreatLevel,
    string? CountryCode,
    string? SortBy,
    bool? IsPublic
);

public record UpdateSavedSearchRequest(
    string? Name,
    string? Description,
    string? Query,
    string? Category,
    string? ThreatType,
    int? MinThreatLevel,
    string? CountryCode,
    string? SortBy,
    bool? IsPublic
);

// Keyword List Models
public record KeywordListDto(
    int Id,
    Guid UserId,
    string Name,
    string? Description,
    List<string> Keywords,
    string Category,
    bool IsPublic,
    int UsageCount,
    DateTime CreatedAt,
    DateTime? UpdatedAt
);

public record CreateKeywordListRequest(
    string Name,
    string? Description,
    List<string> Keywords,
    string? Category,
    bool? IsPublic
);

public record UpdateKeywordListRequest(
    string? Name,
    string? Description,
    List<string>? Keywords,
    string? Category,
    bool? IsPublic
);

// Query Parser Models
public record ParseQueryRequest(
    string Query
);

public record ParseQueryResponse(
    string OriginalQuery,
    bool IsValid,
    string? ValidationError,
    bool HasAdvancedSyntax,
    string OpenSearchQuery,
    Dictionary<string, List<string>> FieldSearches,
    List<string> Phrases,
    List<string> Terms
);
