using System.ComponentModel.DataAnnotations;

namespace AUSentinel.Api.Data.Entities;

public class AlertRule
{
    public int Id { get; set; }

    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(2)]
    public string CountryCode { get; set; } = string.Empty;

    [MaxLength(100)]
    public string? Category { get; set; }

    [MaxLength(100)]
    public string? ThreatType { get; set; }

    public int MinThreatLevel { get; set; } = 3;

    [MaxLength(500)]
    public string? Keywords { get; set; }

    public bool IsActive { get; set; } = true;

    public Guid CreatedByUserId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public User CreatedByUser { get; set; } = null!;
    public Country Country { get; set; } = null!;
    public ICollection<Alert> Alerts { get; set; } = new List<Alert>();
}
