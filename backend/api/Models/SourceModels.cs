namespace AUSentinel.Api.Models;

public record CreateSourceRequest(
    string Type,
    string Name,
    string Url,
    string? CountryCode,
    string? Language,
    int FetchIntervalMinutes
);

public record SourceDto(
    int Id,
    string Type,
    string Name,
    string Url,
    string? CountryCode,
    string? Language,
    bool IsActive,
    int FetchIntervalMinutes,
    DateTime? LastFetchedAt
);
