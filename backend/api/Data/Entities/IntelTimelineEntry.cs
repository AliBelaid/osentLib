using System.ComponentModel.DataAnnotations;

namespace AUSentinel.Api.Data.Entities;

public class IntelTimelineEntry
{
    public int Id { get; set; }

    public Guid IntelReportId { get; set; }

    public Guid UserId { get; set; }

    public string Content { get; set; } = string.Empty;

    [MaxLength(50)]
    public string EntryType { get; set; } = "comment"; // comment, status_change, creation

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public IntelReport IntelReport { get; set; } = null!;
    public User User { get; set; } = null!;
    public ICollection<IntelTimelineAttachment> Attachments { get; set; } = new List<IntelTimelineAttachment>();
}
