namespace AUSentinel.Shared.Data.Entities;

public class ArticleCountryTag
{
    public Guid ArticleId { get; set; }

    public string CountryCode { get; set; } = string.Empty;

    public Article Article { get; set; } = null!;
    public Country Country { get; set; } = null!;
}
