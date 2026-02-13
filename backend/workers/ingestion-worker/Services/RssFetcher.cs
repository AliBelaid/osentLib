using System.ServiceModel.Syndication;
using System.Xml;
using AUSentinel.Shared.Data.Entities;

namespace AUSentinel.IngestionWorker.Services;

public class RssFetcher
{
    private readonly HttpClient _http;
    private readonly ILogger<RssFetcher> _logger;

    public RssFetcher(HttpClient http, ILogger<RssFetcher> logger)
    {
        _http = http;
        _logger = logger;
    }

    public async Task<List<RawArticle>> FetchAsync(Source source, CancellationToken ct)
    {
        var articles = new List<RawArticle>();

        try
        {
            var response = await _http.GetAsync(source.Url, ct);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("RSS fetch failed for {Source}: {Status}", source.Name, response.StatusCode);
                return articles;
            }

            var stream = await response.Content.ReadAsStreamAsync(ct);
            using var reader = XmlReader.Create(stream);
            var feed = SyndicationFeed.Load(reader);

            foreach (var item in feed.Items)
            {
                var title = item.Title?.Text ?? "";
                var url = item.Links.FirstOrDefault()?.Uri?.ToString() ?? "";
                var body = item.Summary?.Text ?? "";
                var publishedAt = item.PublishDate.UtcDateTime;

                if (publishedAt == DateTime.MinValue)
                    publishedAt = DateTime.UtcNow;

                var countryTags = DetectCountriesFromText(title + " " + body);

                articles.Add(new RawArticle
                {
                    Title = title,
                    Body = StripHtml(body),
                    Url = url,
                    Language = source.Language ?? "en",
                    PublishedAt = publishedAt,
                    CountryTags = countryTags
                });
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error parsing RSS from {Source}", source.Name);
        }

        return articles;
    }

    private static List<string> DetectCountriesFromText(string text)
    {
        var tags = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var map = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["Algeria"] = "DZ", ["Angola"] = "AO", ["Benin"] = "BJ", ["Botswana"] = "BW",
            ["Burkina Faso"] = "BF", ["Burundi"] = "BI", ["Cameroon"] = "CM", ["Chad"] = "TD",
            ["Congo"] = "CG", ["Djibouti"] = "DJ", ["Egypt"] = "EG", ["Eritrea"] = "ER",
            ["Ethiopia"] = "ET", ["Gabon"] = "GA", ["Gambia"] = "GM", ["Ghana"] = "GH",
            ["Guinea"] = "GN", ["Kenya"] = "KE", ["Lesotho"] = "LS", ["Liberia"] = "LR",
            ["Libya"] = "LY", ["Madagascar"] = "MG", ["Malawi"] = "MW", ["Mali"] = "ML",
            ["Mauritania"] = "MR", ["Morocco"] = "MA", ["Mozambique"] = "MZ", ["Namibia"] = "NA",
            ["Niger"] = "NE", ["Nigeria"] = "NG", ["Rwanda"] = "RW", ["Senegal"] = "SN",
            ["Sierra Leone"] = "SL", ["Somalia"] = "SO", ["South Africa"] = "ZA",
            ["South Sudan"] = "SS", ["Sudan"] = "SD", ["Tanzania"] = "TZ", ["Togo"] = "TG",
            ["Tunisia"] = "TN", ["Uganda"] = "UG", ["Zambia"] = "ZM", ["Zimbabwe"] = "ZW"
        };

        foreach (var (name, code) in map)
        {
            if (text.Contains(name, StringComparison.OrdinalIgnoreCase))
                tags.Add(code);
        }

        return tags.ToList();
    }

    private static string StripHtml(string html)
    {
        if (string.IsNullOrEmpty(html)) return "";
        return System.Text.RegularExpressions.Regex.Replace(html, "<[^>]+>", "").Trim();
    }
}
