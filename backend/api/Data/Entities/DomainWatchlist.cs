namespace AUSentinel.Api.Data.Entities;

public class DomainWatchlist
{
    public int Id { get; set; }
    public string Domain { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Status { get; set; } = "Monitor"; // Monitor, Blocked, Trusted
    public int RiskLevel { get; set; } // 1-5
    public string? Tags { get; set; } // JSON array of tags
    public string? Notes { get; set; }

    // Who added it
    public Guid AddedByUserId { get; set; }
    public string? CountryCode { get; set; } // Optional country-specific watchlist

    // Tracking
    public int DetectionCount { get; set; } // How many times domain appeared in articles
    public DateTime? LastSeenAt { get; set; } // Last time domain was detected
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    // Navigation Properties
    public User AddedByUser { get; set; } = null!;
    public Country? Country { get; set; }
}
