namespace AUSentinel.Api.Data.Entities;

/// <summary>
/// Junction table linking users to their earned badges
/// </summary>
public class UserBadge
{
    public int Id { get; set; }
    public Guid UserId { get; set; }
    public int BadgeId { get; set; }
    public DateTime EarnedAt { get; set; }
    public int Progress { get; set; } // Current progress toward earning the badge
    public bool IsUnlocked { get; set; }

    // Navigation
    public User User { get; set; } = null!;
    public Badge Badge { get; set; } = null!;
}
