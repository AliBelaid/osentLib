using System.ComponentModel.DataAnnotations;

namespace AUSentinel.Api.Data.Entities;

public class Role
{
    public int Id { get; set; }

    [MaxLength(50)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(200)]
    public string Description { get; set; } = string.Empty;

    public ICollection<UserRole> UserRoles { get; set; } = new List<UserRole>();
}

public static class RoleNames
{
    public const string Viewer = "Viewer";
    public const string Editor = "Editor";
    public const string CountryAdmin = "CountryAdmin";
    public const string AUAdmin = "AUAdmin";
    public const string DataEntry = "DataEntry";
}
