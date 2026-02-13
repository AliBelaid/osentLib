namespace AUSentinel.Api.Data.Entities;

/// <summary>
/// Stores reusable collections of keywords for searching
/// </summary>
public class KeywordList
{
    public int Id { get; set; }
    public Guid UserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Keywords { get; set; } = string.Empty; // Comma-separated keywords
    public string Category { get; set; } = "general"; // security, politics, health, economy, etc.
    public bool IsPublic { get; set; } // Whether this list can be shared
    public int UsageCount { get; set; } // Track how many times it's been used
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    // Navigation
    public User User { get; set; } = null!;

    /// <summary>
    /// Get keywords as a list
    /// </summary>
    public List<string> GetKeywordsList()
    {
        return Keywords
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .ToList();
    }

    /// <summary>
    /// Set keywords from a list
    /// </summary>
    public void SetKeywordsList(List<string> keywords)
    {
        Keywords = string.Join(", ", keywords);
    }
}
