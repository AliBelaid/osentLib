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

// Form-data version that supports file attachment
public class SubmitReportFormRequest
{
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string ReportType { get; set; } = string.Empty;
    public int Urgency { get; set; } = 2;
    public string? AffectedCountry { get; set; }
    public IFormFile? Attachment { get; set; }
}

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
    Guid CreatedByUserId,
    string CreatedByName,
    string? PublishedByName,
    DateTime CreatedAt,
    DateTime? PublishedAt,
    List<BulletinAttachmentDto>? Attachments = null
);

public record BulletinAttachmentDto(
    int Id,
    string FileName,
    string StoragePath,
    string ContentType,
    long FileSize,
    DateTime UploadedAt
);
