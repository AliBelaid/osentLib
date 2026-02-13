namespace AUSentinel.Api.Models;

public record CreateAlertRuleRequest(
    string Name,
    string? Category,
    string? ThreatType,
    int MinThreatLevel,
    string? Keywords
);

public record AlertRuleDto(
    int Id,
    string Name,
    string CountryCode,
    string? Category,
    string? ThreatType,
    int MinThreatLevel,
    string? Keywords,
    bool IsActive,
    DateTime CreatedAt
);

public record AlertDto(
    int Id,
    string Title,
    string Message,
    int Severity,
    string CountryCode,
    bool IsActive,
    DateTime CreatedAt,
    Guid? ArticleId,
    DateTime? AcknowledgedAt
);
