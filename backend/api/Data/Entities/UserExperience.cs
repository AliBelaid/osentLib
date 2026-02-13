namespace AUSentinel.Api.Data.Entities;

/// <summary>
/// Tracks user experience points and level progression
/// </summary>
public class UserExperience
{
    public int Id { get; set; }
    public Guid UserId { get; set; }
    public int TotalXp { get; set; }
    public int Level { get; set; }
    public int CurrentLevelXp { get; set; } // XP within current level
    public int NextLevelXp { get; set; } // XP needed for next level
    public DateTime LastActivityAt { get; set; }
    public DateTime CreatedAt { get; set; }

    // Navigation
    public User User { get; set; } = null!;
    public ICollection<UserBadge> UserBadges { get; set; } = new List<UserBadge>();
}
