namespace AUSentinel.Api.Data.Entities;

public class ExternalSearchQuery
{
    public int Id { get; set; }
    public Guid UserId { get; set; }
    public string Provider { get; set; } = string.Empty; // Twitter, Reddit, NewsAPI, WebScraper
    public string Query { get; set; } = string.Empty;
    public string? Filters { get; set; } // JSON object with provider-specific filters

    public string Status { get; set; } = "pending"; // pending, processing, completed, failed
    public int ResultsCount { get; set; }
    public string? Results { get; set; } // JSON array of results
    public string? ErrorMessage { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ExecutedAt { get; set; }
    public DateTime? CompletedAt { get; set; }

    // Navigation Properties
    public User User { get; set; } = null!;
}
