using System.ComponentModel.DataAnnotations;

namespace AUSentinel.Shared.Data.Entities;

public class Country
{
    [MaxLength(2)]
    public string Code { get; set; } = string.Empty;

    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(100)]
    public string NameArabic { get; set; } = string.Empty;

    [MaxLength(50)]
    public string Region { get; set; } = string.Empty;

    public ICollection<User> Users { get; set; } = new List<User>();
    public ICollection<ArticleCountryTag> ArticleCountryTags { get; set; } = new List<ArticleCountryTag>();
}
