namespace AUSentinel.AiWorker.Services;

public class RuleBasedClassifier
{
    private static readonly Dictionary<string, string[]> CategoryKeywords = new(StringComparer.OrdinalIgnoreCase)
    {
        ["Security"] = new[] { "military", "army", "soldier", "attack", "bomb", "weapon", "conflict", "war", "militia", "armed", "troops", "defense", "security forces", "peacekeeping", "coup", "rebellion" },
        ["Politics"] = new[] { "president", "parliament", "election", "government", "minister", "policy", "opposition", "diplomat", "summit", "vote", "constitution", "political", "democracy", "sanctions" },
        ["Health"] = new[] { "disease", "outbreak", "epidemic", "virus", "health", "hospital", "vaccine", "WHO", "malaria", "cholera", "ebola", "covid", "pandemic", "medical", "infection" },
        ["Economy"] = new[] { "economy", "trade", "GDP", "inflation", "export", "import", "investment", "debt", "currency", "market", "oil", "mining", "agriculture", "poverty", "unemployment" },
        ["Environment"] = new[] { "climate", "flood", "drought", "deforestation", "pollution", "wildlife", "conservation", "temperature", "rainfall", "disaster", "cyclone", "earthquake", "volcano" },
        ["Technology"] = new[] { "technology", "digital", "internet", "cyber", "AI", "startup", "innovation", "telecom", "mobile", "fintech", "blockchain" },
        ["Society"] = new[] { "education", "women", "children", "humanitarian", "refugee", "migration", "culture", "religion", "community", "protest", "rights" }
    };

    private static readonly Dictionary<string, string[]> ThreatKeywords = new(StringComparer.OrdinalIgnoreCase)
    {
        ["terrorism"] = new[] { "terrorism", "terrorist", "bomb", "explosion", "extremist", "jihadist", "al-shabaab", "boko haram", "ISIS", "Al-Qaeda", "militant" },
        ["unrest"] = new[] { "protest", "riot", "unrest", "civil unrest", "demonstration", "strike", "uprising", "clashes", "violence", "looting" },
        ["epidemic"] = new[] { "outbreak", "epidemic", "pandemic", "virus", "disease spread", "cholera", "ebola", "plague", "infection surge" },
        ["flood"] = new[] { "flood", "flooding", "flash flood", "deluge", "inundation", "dam burst", "overflow" },
        ["drought"] = new[] { "drought", "water shortage", "famine", "crop failure", "desertification", "food crisis" },
        ["famine"] = new[] { "famine", "starvation", "food crisis", "hunger", "malnutrition", "food insecurity" },
        ["cyber"] = new[] { "cyberattack", "hacking", "data breach", "ransomware", "cybercrime", "phishing" }
    };

    private static readonly string[] UrgencyWords = { "urgent", "emergency", "breaking", "critical", "crisis", "catastrophe", "deadly", "massacre", "dozens killed", "hundreds" };

    public ClassificationResult Classify(string title, string body)
    {
        var text = $"{title} {body}".ToLowerInvariant();
        var result = new ClassificationResult { ClassifiedBy = "rule-based" };

        // Detect category
        var bestCategory = "Society";
        var bestCategoryScore = 0;
        foreach (var (category, keywords) in CategoryKeywords)
        {
            var score = keywords.Count(k => text.Contains(k, StringComparison.OrdinalIgnoreCase));
            if (score > bestCategoryScore)
            {
                bestCategoryScore = score;
                bestCategory = category;
            }
        }
        result.Category = bestCategory;

        // Detect threat type
        var bestThreat = "none";
        var bestThreatScore = 0;
        foreach (var (threat, keywords) in ThreatKeywords)
        {
            var score = keywords.Count(k => text.Contains(k, StringComparison.OrdinalIgnoreCase));
            if (score > bestThreatScore)
            {
                bestThreatScore = score;
                bestThreat = threat;
            }
        }
        result.ThreatType = bestThreat;

        // Calculate threat level (0-5)
        if (bestThreat == "none")
        {
            result.ThreatLevel = 0;
        }
        else
        {
            var urgencyScore = UrgencyWords.Count(w => text.Contains(w, StringComparison.OrdinalIgnoreCase));
            result.ThreatLevel = Math.Min(5, bestThreatScore + urgencyScore);
            if (result.ThreatLevel < 1) result.ThreatLevel = 1;
        }

        // Credibility score based on content length and source
        result.CredibilityScore = text.Length > 500 ? 0.7 : text.Length > 200 ? 0.5 : 0.3;

        // Generate summary
        result.Summary = title.Length > 200 ? title[..200] + "..." : title;

        return result;
    }
}
