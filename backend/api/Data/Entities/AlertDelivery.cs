using System.ComponentModel.DataAnnotations;

namespace AUSentinel.Api.Data.Entities;

public class AlertDelivery
{
    public int Id { get; set; }

    public int AlertId { get; set; }

    public Guid UserId { get; set; }

    [MaxLength(20)]
    public string Channel { get; set; } = "in-app"; // in-app

    public bool IsRead { get; set; }

    public DateTime DeliveredAt { get; set; } = DateTime.UtcNow;
    public DateTime? ReadAt { get; set; }

    public Alert Alert { get; set; } = null!;
    public User User { get; set; } = null!;
}
