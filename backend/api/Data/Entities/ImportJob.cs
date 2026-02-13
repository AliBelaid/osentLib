namespace AUSentinel.Api.Data.Entities;

public class ImportJob
{
    public int Id { get; set; }
    public Guid UserId { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string ImportType { get; set; } = string.Empty; // articles, users, sources, keywords
    public string Status { get; set; } = "pending"; // pending, processing, completed, failed
    public int TotalRows { get; set; }
    public int ProcessedRows { get; set; }
    public int SuccessCount { get; set; }
    public int FailedCount { get; set; }
    public string? ErrorMessage { get; set; }
    public string? ErrorDetails { get; set; } // JSON array of row-specific errors
    public DateTime CreatedAt { get; set; }
    public DateTime? StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }

    public User User { get; set; } = null!;

    public int GetProgressPercent() => TotalRows > 0 ? (ProcessedRows * 100 / TotalRows) : 0;
}
