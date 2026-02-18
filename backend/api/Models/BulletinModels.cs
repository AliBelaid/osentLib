namespace AUSentinel.Api.Models;

public record CreateBulletinRequest(
    string Title,
    string Content,
    int Severity,
    string? Category
);

public record SubmitReportRequest(
    string Title,
    string Content,
    string ReportType,
    int Urgency,
    string? AffectedCountry
);

public record UpdateBulletinRequest(
    string? Title,
    string? Content,
    int? Severity,
    string? Category
);

public record BulletinDto(
    Guid Id,
    string Title,
    string Content,
    string CountryCode,
    string Status,
    int Severity,
    string? Category,
    string CreatedByName,
    string? PublishedByName,
    DateTime CreatedAt,
    DateTime? PublishedAt
);
