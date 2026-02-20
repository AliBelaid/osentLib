using System.ComponentModel.DataAnnotations;

namespace AUSentinel.Shared.Data.Entities;

public class Incident
{
    public Guid Id { get; set; } = Guid.NewGuid();

    [MaxLength(300)]
    public string Title { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    [MaxLength(20)]
    public string Severity { get; set; } = "medium"; // critical, high, medium, low

    [MaxLength(30)]
    public string Status { get; set; } = "open"; // open, investigating, contained, resolved, closed

    [MaxLength(50)]
    public string Sector { get; set; } = string.Empty; // Government, Banking, Telecom, etc.

    [MaxLength(50)]
    public string IncidentType { get; set; } = string.Empty; // Ransomware, DDoS, DataBreach, etc.

    [MaxLength(2)]
    public string CountryCode { get; set; } = string.Empty;

    [MaxLength(200)]
    public string? Source { get; set; }

    // JSON arrays stored as text
    public string AffectedSystems { get; set; } = "[]";
    public string Iocs { get; set; } = "[]";

    // Optional file attachment
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

    // Navigation
    public User ReportedByUser { get; set; } = null!;
    public User? AssignedToUser { get; set; }
    public Country Country { get; set; } = null!;
}
