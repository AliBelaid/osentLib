using System.ComponentModel.DataAnnotations;

namespace AUSentinel.Api.Data.Entities;

public class Bulletin
{
    public Guid Id { get; set; } = Guid.NewGuid();

    [MaxLength(300)]
    public string Title { get; set; } = string.Empty;

    public string Content { get; set; } = string.Empty;

    [MaxLength(2)]
    public string CountryCode { get; set; } = string.Empty;

    [MaxLength(20)]
    public string Status { get; set; } = "draft"; // draft, review, published

    public int Severity { get; set; } // 0–5

    [MaxLength(100)]
    public string? Category { get; set; }

    public Guid CreatedByUserId { get; set; }
    public Guid? PublishedByUserId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    public DateTime? PublishedAt { get; set; }

    public User CreatedByUser { get; set; } = null!;
    public User? PublishedByUser { get; set; }
    public Country Country { get; set; } = null!;
    public ICollection<BulletinAttachment> Attachments { get; set; } = new List<BulletinAttachment>();
}
