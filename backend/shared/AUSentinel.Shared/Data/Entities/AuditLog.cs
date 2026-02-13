using System.ComponentModel.DataAnnotations;

namespace AUSentinel.Shared.Data.Entities;

public class AuditLog
{
    public long Id { get; set; }

    public Guid UserId { get; set; }

    [MaxLength(20)]
    public string Action { get; set; } = string.Empty;

    [MaxLength(100)]
    public string EntityType { get; set; } = string.Empty;

    [MaxLength(100)]
    public string? EntityId { get; set; }

    [MaxLength(50)]
    public string? IpAddress { get; set; }

    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}
