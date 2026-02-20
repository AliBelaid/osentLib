namespace AUSentinel.Api.Models;

// Request records
public record CreateIntelReportRequest(
    string Title,
    string Content,
    string Type,
    int Severity,
    string? SourceInfo,
    List<string>? AffectedCountryCodes
);

public record UpdateIntelReportRequest(
    string? Title,
    string? Content,
    string? Type,
    int? Severity,
    string? SourceInfo,
    List<string>? AffectedCountryCodes
);

public record UpdateIntelReportStatusRequest(
    string Status
);

public record CreateTimelineEntryRequest(
    string Content
);

public record CreateIntelReportLinkRequest(
    Guid TargetReportId,
    string LinkType
);

// Response records
public record IntelReportDto(
    Guid Id,
    string Title,
    string Content,
    string Type,
    int Severity,
    string Status,
    string? SourceInfo,
    string CountryCode,
    string CreatedByUserId,
    string CreatedByName,
    DateTime CreatedAt,
    DateTime? UpdatedAt,
    DateTime? ClosedAt,
    List<string> AffectedCountryCodes,
    List<IntelReportAttachmentDto> Attachments,
    int TimelineCount
);

public record IntelReportSummaryDto(
    Guid Id,
    string Title,
    string Type,
    int Severity,
    string Status,
    string CountryCode,
    string CreatedByName,
    DateTime CreatedAt,
    int TimelineCount,
    int AttachmentCount
);

public record IntelReportAttachmentDto(
    int Id,
    string FileName,
    string ContentType,
    long SizeBytes,
    DateTime UploadedAt
);

public record IntelTimelineEntryDto(
    int Id,
    Guid IntelReportId,
    string UserId,
    string UserName,
    string Content,
    string EntryType,
    DateTime CreatedAt,
    List<IntelTimelineAttachmentDto> Attachments
);

public record IntelTimelineAttachmentDto(
    int Id,
    string FileName,
    string ContentType,
    long SizeBytes,
    DateTime UploadedAt
);

public record IntelReportLinkDto(
    int Id,
    Guid SourceReportId,
    string SourceReportTitle,
    Guid TargetReportId,
    string TargetReportTitle,
    string LinkType,
    string CreatedByName,
    DateTime CreatedAt
);

public record IntelReportListResult(
    List<IntelReportSummaryDto> Items,
    int Total,
    int Page,
    int PageSize
);
