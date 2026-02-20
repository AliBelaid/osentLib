using System.ComponentModel.DataAnnotations;

namespace AUSentinel.Api.Data.Entities;

public class IntelReport
{
    public Guid Id { get; set; } = Guid.NewGuid();

    [MaxLength(300)]
    public string Title { get; set; } = string.Empty;

    public string Content { get; set; } = string.Empty;

    [MaxLength(50)]
    public string Type { get; set; } = "report"; // threat, incident, surveillance, report

    public int Severity { get; set; } // 0-5

    [MaxLength(20)]
    public string Status { get; set; } = "active"; // active, closed

    [MaxLength(1000)]
    public string? SourceInfo { get; set; }

    [MaxLength(2)]
    public string CountryCode { get; set; } = string.Empty;

    public Guid CreatedByUserId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    public DateTime? ClosedAt { get; set; }

    public User CreatedByUser { get; set; } = null!;
    public Country Country { get; set; } = null!;
    public ICollection<IntelReportCountry> AffectedCountries { get; set; } = new List<IntelReportCountry>();
    public ICollection<IntelReportAttachment> Attachments { get; set; } = new List<IntelReportAttachment>();
    public ICollection<IntelTimelineEntry> TimelineEntries { get; set; } = new List<IntelTimelineEntry>();
    public ICollection<IntelReportLink> SourceLinks { get; set; } = new List<IntelReportLink>();
    public ICollection<IntelReportLink> TargetLinks { get; set; } = new List<IntelReportLink>();
}
