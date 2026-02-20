using System.ComponentModel.DataAnnotations;

namespace AUSentinel.Api.Data.Entities;

public class IntelTimelineAttachment
{
    public int Id { get; set; }

    public int TimelineEntryId { get; set; }

    [MaxLength(500)]
    public string FileName { get; set; } = string.Empty;

    [MaxLength(1000)]
    public string StoragePath { get; set; } = string.Empty;

    [MaxLength(100)]
    public string ContentType { get; set; } = string.Empty;

    public long SizeBytes { get; set; }

    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;

    public IntelTimelineEntry TimelineEntry { get; set; } = null!;
}
