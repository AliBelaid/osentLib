using System.ComponentModel.DataAnnotations;

namespace AUSentinel.Shared.Data.Entities;

public class Alert
{
    public int Id { get; set; }

    public int AlertRuleId { get; set; }

    public Guid? ArticleId { get; set; }

    [MaxLength(300)]
    public string Title { get; set; } = string.Empty;

    [MaxLength(1000)]
    public string Message { get; set; } = string.Empty;

    public int Severity { get; set; }

    [MaxLength(2)]
    public string CountryCode { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? AcknowledgedAt { get; set; }
    public Guid? AcknowledgedByUserId { get; set; }

    public AlertRule AlertRule { get; set; } = null!;
    public Article? Article { get; set; }
    public ICollection<AlertDelivery> Deliveries { get; set; } = new List<AlertDelivery>();
}
