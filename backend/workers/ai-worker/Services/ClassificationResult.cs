namespace AUSentinel.AiWorker.Services;

public class ClassificationResult
{
    public string Category { get; set; } = "Society";
    public string ThreatType { get; set; } = "none";
    public int ThreatLevel { get; set; }
    public double CredibilityScore { get; set; } = 0.5;
    public string? Summary { get; set; }
    public string ClassifiedBy { get; set; } = "rule-based";
}
