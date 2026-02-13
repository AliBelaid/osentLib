using System.ComponentModel.DataAnnotations;

namespace AUSentinel.Api.Data.Entities;

public class Article
{
    public Guid Id { get; set; } = Guid.NewGuid();

    [MaxLength(512)]
    public string Title { get; set; } = string.Empty;

    public string Body { get; set; } = string.Empty;

    [MaxLength(2000)]
    public string Url { get; set; } = string.Empty;

    [MaxLength(2000)]
    public string? ImageUrl { get; set; }

    public int SourceId { get; set; }

    [MaxLength(10)]
    public string Language { get; set; } = "en";

    public DateTime PublishedAt { get; set; }
    public DateTime IngestedAt { get; set; } = DateTime.UtcNow;

    [MaxLength(64)]
    public string DedupHash { get; set; } = string.Empty;

    public bool IsProcessed { get; set; }
    public bool IsIndexed { get; set; }

    public Source Source { get; set; } = null!;
    public Classification? Classification { get; set; }
    public ICollection<ArticleEntity> Entities { get; set; } = new List<ArticleEntity>();
    public ICollection<ArticleCountryTag> CountryTags { get; set; } = new List<ArticleCountryTag>();
    public ICollection<Vote> Votes { get; set; } = new List<Vote>();
}
