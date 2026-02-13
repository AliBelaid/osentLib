using System.ComponentModel.DataAnnotations;

namespace AUSentinel.Shared.Data.Entities;

public class ArticleEntity
{
    public int Id { get; set; }

    public Guid ArticleId { get; set; }

    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(50)]
    public string Type { get; set; } = string.Empty;

    public Article Article { get; set; } = null!;
}
