using System.ComponentModel.DataAnnotations;

namespace AUSentinel.Shared.Data.Entities;

public class AlertDelivery
{
    public int Id { get; set; }

    public int AlertId { get; set; }

    public Guid UserId { get; set; }

    [MaxLength(50)]
    public string Channel { get; set; } = "in-app";

    public bool IsRead { get; set; }

    public DateTime SentAt { get; set; } = DateTime.UtcNow;

    public Alert Alert { get; set; } = null!;
    public User User { get; set; } = null!;
}
