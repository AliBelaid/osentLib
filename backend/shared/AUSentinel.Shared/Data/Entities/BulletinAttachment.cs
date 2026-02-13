using System.ComponentModel.DataAnnotations;

namespace AUSentinel.Shared.Data.Entities;

public class BulletinAttachment
{
    public int Id { get; set; }

    public Guid BulletinId { get; set; }

    [MaxLength(256)]
    public string FileName { get; set; } = string.Empty;

    [MaxLength(1000)]
    public string StoragePath { get; set; } = string.Empty;

    [MaxLength(100)]
    public string ContentType { get; set; } = string.Empty;

    public long FileSize { get; set; }

    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;

    public Bulletin Bulletin { get; set; } = null!;
}
