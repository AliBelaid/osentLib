using System.ComponentModel.DataAnnotations;

namespace AUSentinel.Api.Data.Entities;

public class Source
{
    public int Id { get; set; }

    [MaxLength(50)]
    public string Type { get; set; } = string.Empty; // GDELT, RSS, MediaCloud

    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(1000)]
    public string Url { get; set; } = string.Empty;

    [MaxLength(2)]
    public string? CountryCode { get; set; }

    [MaxLength(50)]
    public string? Language { get; set; }

    public bool IsActive { get; set; } = true;

    public int FetchIntervalMinutes { get; set; } = 10;

    public DateTime? LastFetchedAt { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<Article> Articles { get; set; } = new List<Article>();
}
