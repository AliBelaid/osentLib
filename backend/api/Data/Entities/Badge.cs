namespace AUSentinel.Api.Data.Entities;

/// <summary>
/// Represents an achievement badge that users can earn
/// </summary>
public class Badge
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string IconUrl { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty; // e.g., "voting", "bulletins", "engagement"
    public int RequiredCount { get; set; } // Number of actions required to earn
    public string Rarity { get; set; } = "common"; // common, rare, epic, legendary
    public DateTime CreatedAt { get; set; }

    // Navigation
    public ICollection<UserBadge> UserBadges { get; set; } = new List<UserBadge>();
}
