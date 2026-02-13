namespace AUSentinel.Api.Data.Entities;

public class UserProfile
{
    public int Id { get; set; }
    public Guid UserId { get; set; }
    public string? Bio { get; set; }
    public string? AvatarUrl { get; set; }
    public string? Organization { get; set; }
    public string? JobTitle { get; set; }
    public string? PhoneNumber { get; set; }
    public string? LinkedInUrl { get; set; }
    public string? TwitterHandle { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    // Navigation
    public User User { get; set; } = null!;
}
