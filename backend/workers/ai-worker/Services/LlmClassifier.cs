using System.Text;
using System.Text.Json;

namespace AUSentinel.AiWorker.Services;

public class LlmClassifier
{
    private readonly HttpClient _http;
    private readonly IConfiguration _config;
    private readonly ILogger<LlmClassifier> _logger;

    public LlmClassifier(HttpClient http, IConfiguration config, ILogger<LlmClassifier> logger)
    {
        _http = http;
        _config = config;
        _logger = logger;
    }

    public async Task<ClassificationResult> ClassifyAsync(string title, string body, CancellationToken ct)
    {
        var endpoint = _config["LLM:Endpoint"];
        if (string.IsNullOrEmpty(endpoint))
            return new ClassificationResult { ClassifiedBy = "rule-based" };

        var truncatedBody = body.Length > 2000 ? body[..2000] : body;
        var prompt = "Classify this news article. Respond with JSON only.\n\n" +
            $"Title: {title}\nBody: {truncatedBody}\n\n" +
            "Respond with this exact JSON format:\n" +
            "{ \"category\": \"Politics|Security|Health|Economy|Environment|Technology|Society\", " +
            "\"threatType\": \"terrorism|unrest|epidemic|flood|drought|famine|cyber|none\", " +
            "\"threatLevel\": 0-5, \"credibilityScore\": 0.0-1.0, \"summary\": \"One sentence summary\" }";

        var payload = new { prompt, max_tokens = 500, temperature = 0.1 };

        try
        {
            var json = JsonSerializer.Serialize(payload);
            var response = await _http.PostAsync(endpoint,
                new StringContent(json, Encoding.UTF8, "application/json"), ct);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("LLM endpoint returned {Status}", response.StatusCode);
                return new ClassificationResult { ClassifiedBy = "rule-based" };
            }

            var responseBody = await response.Content.ReadAsStringAsync(ct);
            var doc = JsonDocument.Parse(responseBody);

            // Try to extract from common LLM response formats
            var text = "";
            if (doc.RootElement.TryGetProperty("response", out var resp))
                text = resp.GetString() ?? "";
            else if (doc.RootElement.TryGetProperty("choices", out var choices) &&
                     choices.GetArrayLength() > 0)
            {
                var first = choices[0];
                if (first.TryGetProperty("text", out var t))
                    text = t.GetString() ?? "";
                else if (first.TryGetProperty("message", out var msg) &&
                         msg.TryGetProperty("content", out var content))
                    text = content.GetString() ?? "";
            }

            // Parse the JSON from the response
            var jsonStart = text.IndexOf('{');
            var jsonEnd = text.LastIndexOf('}');
            if (jsonStart >= 0 && jsonEnd > jsonStart)
            {
                var extracted = text[jsonStart..(jsonEnd + 1)];
                var parsed = JsonDocument.Parse(extracted);
                var root = parsed.RootElement;

                return new ClassificationResult
                {
                    Category = root.TryGetProperty("category", out var cat) ? cat.GetString() ?? "Society" : "Society",
                    ThreatType = root.TryGetProperty("threatType", out var tt) ? tt.GetString() ?? "none" : "none",
                    ThreatLevel = root.TryGetProperty("threatLevel", out var tl) ? tl.GetInt32() : 0,
                    CredibilityScore = root.TryGetProperty("credibilityScore", out var cs) ? cs.GetDouble() : 0.5,
                    Summary = root.TryGetProperty("summary", out var s) ? s.GetString() : null,
                    ClassifiedBy = "llm"
                };
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error calling LLM endpoint");
        }

        return new ClassificationResult { ClassifiedBy = "rule-based" };
    }
}
