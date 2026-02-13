using System.Text.Json;
using AUSentinel.Shared.Data.Entities;

namespace AUSentinel.IngestionWorker.Services;

public class GdeltFetcher
{
    private readonly HttpClient _http;
    private readonly ILogger<GdeltFetcher> _logger;

    private static readonly string[] AfricanCountries =
    {
        "Algeria", "Angola", "Benin", "Botswana", "Burkina Faso", "Burundi",
        "Cameroon", "Chad", "Congo", "Djibouti", "Egypt", "Eritrea", "Ethiopia",
        "Gabon", "Gambia", "Ghana", "Guinea", "Kenya", "Lesotho", "Liberia",
        "Libya", "Madagascar", "Malawi", "Mali", "Mauritania", "Morocco",
        "Mozambique", "Namibia", "Niger", "Nigeria", "Rwanda", "Senegal",
        "Sierra Leone", "Somalia", "South Africa", "South Sudan", "Sudan",
        "Tanzania", "Togo", "Tunisia", "Uganda", "Zambia", "Zimbabwe"
    };

    public GdeltFetcher(HttpClient http, ILogger<GdeltFetcher> logger)
    {
        _http = http;
        _logger = logger;
    }

    public async Task<List<RawArticle>> FetchAsync(Source source, CancellationToken ct)
    {
        var articles = new List<RawArticle>();
        var query = "sourcelang:eng sourcecountry:africa";
        var url = $"{source.Url}?query={Uri.EscapeDataString(query)}&mode=artlist&maxrecords=50&format=json";

        try
        {
            var response = await _http.GetAsync(url, ct);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("GDELT API returned {Status}", response.StatusCode);
                return articles;
            }

            var json = await response.Content.ReadAsStringAsync(ct);
            var doc = JsonDocument.Parse(json);

            if (!doc.RootElement.TryGetProperty("articles", out var articlesArray))
                return articles;

            foreach (var item in articlesArray.EnumerateArray())
            {
                var title = item.TryGetProperty("title", out var t) ? t.GetString() ?? "" : "";
                var articleUrl = item.TryGetProperty("url", out var u) ? u.GetString() ?? "" : "";
                var imageUrl = item.TryGetProperty("socialimage", out var img) ? img.GetString() : null;
                var lang = item.TryGetProperty("language", out var l) ? l.GetString() ?? "en" : "en";
                var dateStr = item.TryGetProperty("seendate", out var d) ? d.GetString() : null;
                var domain = item.TryGetProperty("domain", out var dom) ? dom.GetString() ?? "" : "";
                var sourceCountry = item.TryGetProperty("sourcecountry", out var sc) ? sc.GetString() ?? "" : "";

                var publishedAt = DateTime.UtcNow;
                if (dateStr != null && DateTime.TryParseExact(dateStr, "yyyyMMdd'T'HHmmss'Z'",
                    System.Globalization.CultureInfo.InvariantCulture,
                    System.Globalization.DateTimeStyles.AssumeUniversal, out var parsed))
                {
                    publishedAt = parsed.ToUniversalTime();
                }

                var countryTags = DetectCountries(title, sourceCountry);

                articles.Add(new RawArticle
                {
                    Title = title,
                    Body = "",
                    Url = articleUrl,
                    ImageUrl = imageUrl,
                    Language = lang.Length > 10 ? "en" : lang,
                    PublishedAt = publishedAt,
                    CountryTags = countryTags
                });
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching from GDELT");
        }

        return articles;
    }

    private static List<string> DetectCountries(string title, string sourceCountry)
    {
        var tags = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var countryMap = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
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

        foreach (var (name, code) in countryMap)
        {
            if (title.Contains(name, StringComparison.OrdinalIgnoreCase))
                tags.Add(code);
        }

        if (!string.IsNullOrEmpty(sourceCountry) && countryMap.TryGetValue(sourceCountry, out var sc))
            tags.Add(sc);

        return tags.ToList();
    }
}
