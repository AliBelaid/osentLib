namespace AUSentinel.Api.Data.Entities;

/// <summary>
/// Stores user's saved search queries for quick re-execution
/// </summary>
public class SavedSearch
{
    public int Id { get; set; }
    public Guid UserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Query { get; set; } = string.Empty; // The actual search query
    public string? Category { get; set; } // Optional category filter
    public string? ThreatType { get; set; } // Optional threat type filter
    public int? MinThreatLevel { get; set; } // Optional min threat level
    public string? CountryCode { get; set; } // Optional country filter
    public string? SortBy { get; set; } // relevance, date, threat
    public bool IsPublic { get; set; } // Whether this search can be shared with others
    public int ExecutionCount { get; set; } // Track how many times it's been run
    public DateTime LastExecutedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    // Navigation
    public User User { get; set; } = null!;
}
