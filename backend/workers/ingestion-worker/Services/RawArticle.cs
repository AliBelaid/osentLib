namespace AUSentinel.IngestionWorker.Services;

public class RawArticle
{
    public string Title { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public string Language { get; set; } = "en";
    public DateTime PublishedAt { get; set; }
    public List<string> CountryTags { get; set; } = new();
}
