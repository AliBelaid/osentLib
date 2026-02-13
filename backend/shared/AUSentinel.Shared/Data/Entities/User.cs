using System.ComponentModel.DataAnnotations;

namespace AUSentinel.Shared.Data.Entities;

public class User
{
    public Guid Id { get; set; } = Guid.NewGuid();

    [MaxLength(100)]
    public string Username { get; set; } = string.Empty;

    [MaxLength(256)]
    public string Email { get; set; } = string.Empty;

    public string PasswordHash { get; set; } = string.Empty;

    [MaxLength(200)]
    public string FullName { get; set; } = string.Empty;

    [MaxLength(2)]
    public string CountryCode { get; set; } = string.Empty;

    [MaxLength(10)]
    public string PreferredLanguage { get; set; } = "en";

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    public Country Country { get; set; } = null!;
    public ICollection<UserRole> UserRoles { get; set; } = new List<UserRole>();
    public ICollection<Vote> Votes { get; set; } = new List<Vote>();
    public UserProfile? Profile { get; set; }
}
