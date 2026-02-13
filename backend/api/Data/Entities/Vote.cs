using System.ComponentModel.DataAnnotations;

namespace AUSentinel.Api.Data.Entities;

public class Vote
{
    public int Id { get; set; }

    public Guid ArticleId { get; set; }
    public Guid UserId { get; set; }

    [MaxLength(20)]
    public string VoteType { get; set; } = string.Empty; // REAL, MISLEADING, UNSURE

    [MaxLength(500)]
    public string? Reason { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    public Article Article { get; set; } = null!;
    public User User { get; set; } = null!;
}
