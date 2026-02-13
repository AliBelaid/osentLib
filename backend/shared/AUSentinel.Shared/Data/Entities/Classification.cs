using System.ComponentModel.DataAnnotations;

namespace AUSentinel.Shared.Data.Entities;

public class Classification
{
    public int Id { get; set; }

    public Guid ArticleId { get; set; }

    [MaxLength(100)]
    public string Category { get; set; } = string.Empty;

    [MaxLength(100)]
    public string ThreatType { get; set; } = "none";

    public int ThreatLevel { get; set; }

    public double CredibilityScore { get; set; } = 0.5;

    [MaxLength(500)]
    public string? Summary { get; set; }

    [MaxLength(50)]
    public string ClassifiedBy { get; set; } = "rule-based";

    public DateTime ClassifiedAt { get; set; } = DateTime.UtcNow;

    public Article Article { get; set; } = null!;
}
