namespace AUSentinel.Api.Data.Entities;

/// <summary>
/// Logs user activities for XP calculation and analytics
/// </summary>
public class ActivityLog
{
    public int Id { get; set; }
    public Guid UserId { get; set; }
    public string ActivityType { get; set; } = string.Empty; // "vote", "bookmark", "bulletin_create", "bulletin_publish", "alert_acknowledge"
    public int XpAwarded { get; set; }
    public string? EntityType { get; set; } // e.g., "Article", "Bulletin"
    public Guid? EntityId { get; set; } // ID of the related entity
    public string? Metadata { get; set; } // JSON string for additional context
    public DateTime CreatedAt { get; set; }

    // Navigation
    public User User { get; set; } = null!;
}
