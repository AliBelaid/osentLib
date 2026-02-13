using System.ComponentModel.DataAnnotations;

namespace AUSentinel.Api.Data.Entities;

public class Country
{
    [MaxLength(2)]
    public string Code { get; set; } = string.Empty;

    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(100)]
    public string NameArabic { get; set; } = string.Empty;

    [MaxLength(10)]
    public string Region { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;

    public ICollection<User> Users { get; set; } = new List<User>();
    public ICollection<ArticleCountryTag> Articles { get; set; } = new List<ArticleCountryTag>();
}
