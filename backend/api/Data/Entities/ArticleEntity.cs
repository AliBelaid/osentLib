using System.ComponentModel.DataAnnotations;

namespace AUSentinel.Api.Data.Entities;

public class ArticleEntity
{
    public int Id { get; set; }

    public Guid ArticleId { get; set; }

    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(50)]
    public string Type { get; set; } = string.Empty; // Person, Organization, Location

    public Article Article { get; set; } = null!;
}
