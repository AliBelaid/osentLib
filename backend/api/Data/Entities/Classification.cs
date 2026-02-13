using System.ComponentModel.DataAnnotations;

namespace AUSentinel.Api.Data.Entities;

public class Classification
{
    public int Id { get; set; }

    public Guid ArticleId { get; set; }

    [MaxLength(100)]
    public string Category { get; set; } = string.Empty; // Politics, Security, Health, Economy, Environment, Technology, Society

    [MaxLength(100)]
    public string ThreatType { get; set; } = "none"; // flood, unrest, epidemic, terrorism, cyber, drought, famine, none, unknown

    /// <summary>0=no threat, 1=low, 2=moderate, 3=elevated, 4=high, 5=critical</summary>
    public int ThreatLevel { get; set; }

    /// <summary>0.0 to 1.0 where 1.0 = highly credible</summary>
    public double CredibilityScore { get; set; } = 0.5;

    [MaxLength(500)]
    public string? Summary { get; set; }

    [MaxLength(50)]
    public string ClassifiedBy { get; set; } = "rule-based"; // rule-based, llm

    public DateTime ClassifiedAt { get; set; } = DateTime.UtcNow;

    public Article Article { get; set; } = null!;
}
