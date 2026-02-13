namespace AUSentinel.Api.Data.Entities;

public class BookmarkCollection
{
    public int Id { get; set; }
    public Guid UserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Color { get; set; } = "#4CAF50";
    public DateTime CreatedAt { get; set; }

    // Navigation
    public User User { get; set; } = null!;
    public ICollection<Bookmark> Bookmarks { get; set; } = new List<Bookmark>();
}
