using System.ComponentModel.DataAnnotations;

namespace AUSentinel.Api.Data.Entities;

public class IntelReportLink
{
    public int Id { get; set; }

    public Guid SourceReportId { get; set; }

    public Guid TargetReportId { get; set; }

    [MaxLength(50)]
    public string LinkType { get; set; } = "related"; // related, follow-up, duplicate, supersedes

    public Guid CreatedByUserId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public IntelReport SourceReport { get; set; } = null!;
    public IntelReport TargetReport { get; set; } = null!;
    public User CreatedByUser { get; set; } = null!;
}
