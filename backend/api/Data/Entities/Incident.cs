using System.ComponentModel.DataAnnotations;

namespace AUSentinel.Api.Data.Entities;

public class Incident
{
    public Guid Id { get; set; } = Guid.NewGuid();

    [MaxLength(300)]
    public string Title { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    [MaxLength(20)]
    public string Severity { get; set; } = "medium";

    [MaxLength(30)]
    public string Status { get; set; } = "open";

    [MaxLength(50)]
    public string Sector { get; set; } = string.Empty;

    [MaxLength(50)]
    public string IncidentType { get; set; } = string.Empty;

    [MaxLength(2)]
    public string CountryCode { get; set; } = string.Empty;

    [MaxLength(200)]
    public string? Source { get; set; }

    public string AffectedSystems { get; set; } = "[]";
    public string Iocs { get; set; } = "[]";

    [MaxLength(500)]
    public string? AttachmentPath { get; set; }

    [MaxLength(256)]
    public string? AttachmentName { get; set; }

    [MaxLength(100)]
    public string? AttachmentContentType { get; set; }

    public int ContainmentPercent { get; set; } = 0;

    public Guid ReportedByUserId { get; set; }

    public Guid? AssignedToUserId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }

    public DateTime? ResolvedAt { get; set; }

    public User ReportedByUser { get; set; } = null!;
    public User? AssignedToUser { get; set; }
    public Country Country { get; set; } = null!;
}
