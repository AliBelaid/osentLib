namespace AUSentinel.Api.Data.Entities;

public class Bookmark
{
    public int Id { get; set; }
    public Guid UserId { get; set; }
    public Guid ArticleId { get; set; }
    public int? CollectionId { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }

    // Navigation
    public User User { get; set; } = null!;
    public Article Article { get; set; } = null!;
    public BookmarkCollection? Collection { get; set; }
}
