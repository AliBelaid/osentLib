namespace AUSentinel.Shared.Data.Entities;

public class UserProfile
{
    public int Id { get; set; }
    public Guid UserId { get; set; }
    public string? Bio { get; set; }  // MaxLength 500
    public string? AvatarUrl { get; set; }  // MaxLength 500
    public string? Organization { get; set; }  // MaxLength 200
    public string? JobTitle { get; set; }  // MaxLength 100
    public string? PhoneNumber { get; set; }  // MaxLength 20
    public string? LinkedInUrl { get; set; }  // MaxLength 200
    public string? TwitterHandle { get; set; }  // MaxLength 50
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    // Navigation
    public User User { get; set; } = null!;
}
