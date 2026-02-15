using System.Security.Cryptography;
using System.Text;

namespace AUSentinel.Api.Services;

/// <summary>
/// Shared OSINT classification utilities used by all fetcher services.
/// </summary>
public static class OsintClassifier
{
    public static readonly Dictionary<string, string> AfricaCountryMap = new(StringComparer.OrdinalIgnoreCase)
    {
        ["algeria"] = "DZ", ["angola"] = "AO", ["benin"] = "BJ", ["botswana"] = "BW",
        ["burkina faso"] = "BF", ["burundi"] = "BI", ["cameroon"] = "CM", ["chad"] = "TD",
        ["congo"] = "CG", ["drc"] = "CD", ["dr congo"] = "CD", ["democratic republic of congo"] = "CD",
        ["egypt"] = "EG", ["cairo"] = "EG", ["ethiopia"] = "ET", ["addis ababa"] = "ET",
        ["gabon"] = "GA", ["ghana"] = "GH", ["guinea"] = "GN", ["ivory coast"] = "CI",
        ["cote d'ivoire"] = "CI", ["kenya"] = "KE", ["nairobi"] = "KE", ["libya"] = "LY",
        ["tripoli"] = "LY", ["madagascar"] = "MG", ["mali"] = "ML", ["morocco"] = "MA",
        ["mozambique"] = "MZ", ["namibia"] = "NA", ["niger"] = "NE", ["nigeria"] = "NG",
        ["lagos"] = "NG", ["abuja"] = "NG", ["rwanda"] = "RW", ["kigali"] = "RW",
        ["senegal"] = "SN", ["dakar"] = "SN", ["somalia"] = "SO", ["mogadishu"] = "SO",
        ["south africa"] = "ZA", ["johannesburg"] = "ZA", ["pretoria"] = "ZA", ["cape town"] = "ZA",
        ["south sudan"] = "SS", ["sudan"] = "SD", ["khartoum"] = "SD",
        ["tanzania"] = "TZ", ["dar es salaam"] = "TZ", ["togo"] = "TG",
        ["tunisia"] = "TN", ["tunis"] = "TN", ["uganda"] = "UG", ["kampala"] = "UG",
        ["zambia"] = "ZM", ["zimbabwe"] = "ZW", ["harare"] = "ZW",
        ["eritrea"] = "ER", ["djibouti"] = "DJ", ["malawi"] = "MW",
        ["mauritania"] = "MR", ["sierra leone"] = "SL", ["liberia"] = "LR",
        ["gambia"] = "GM", ["guinea-bissau"] = "GW", ["comoros"] = "KM",
        ["seychelles"] = "SC", ["mauritius"] = "MU", ["lesotho"] = "LS",
        ["eswatini"] = "SZ", ["equatorial guinea"] = "GQ", ["central african republic"] = "CF",
        ["sao tome"] = "ST", ["cabo verde"] = "CV", ["african union"] = "ET",
        ["sahel"] = "ML", ["horn of africa"] = "ET", ["sahara"] = "EH"
    };

    public static readonly Dictionary<string, string> Iso3ToIso2 = new(StringComparer.OrdinalIgnoreCase)
    {
        ["NGA"] = "NG", ["ETH"] = "ET", ["SDN"] = "SD", ["SSD"] = "SS",
        ["COD"] = "CD", ["SOM"] = "SO", ["KEN"] = "KE", ["ZAF"] = "ZA",
        ["MLI"] = "ML", ["MOZ"] = "MZ", ["TCD"] = "TD", ["CMR"] = "CM",
        ["NER"] = "NE", ["BFA"] = "BF", ["EGY"] = "EG", ["LBY"] = "LY",
        ["DZA"] = "DZ", ["MAR"] = "MA", ["TUN"] = "TN", ["UGA"] = "UG",
        ["RWA"] = "RW", ["TZA"] = "TZ", ["MWI"] = "MW", ["ZMB"] = "ZM",
        ["ZWE"] = "ZW", ["AGO"] = "AO", ["SEN"] = "SN", ["GHA"] = "GH",
        ["CIV"] = "CI", ["GIN"] = "GN", ["SLE"] = "SL", ["LBR"] = "LR",
        ["BDI"] = "BI", ["ERI"] = "ER", ["DJI"] = "DJ", ["GAB"] = "GA",
        ["COG"] = "CG", ["CAF"] = "CF", ["BEN"] = "BJ", ["TGO"] = "TG",
        ["GMB"] = "GM", ["GNB"] = "GW", ["MRT"] = "MR", ["MDG"] = "MG",
        ["NAM"] = "NA", ["BWA"] = "BW", ["LSO"] = "LS", ["SWZ"] = "SZ",
        ["COM"] = "KM", ["SYC"] = "SC", ["MUS"] = "MU", ["CPV"] = "CV",
        ["STP"] = "ST", ["GNQ"] = "GQ", ["ESH"] = "EH"
    };

    private static readonly Dictionary<string, (string Category, string ThreatType, int MinThreat)> ThreatKeywords = new(StringComparer.OrdinalIgnoreCase)
    {
        ["terrorism"] = ("Security", "terrorism", 5), ["terrorist"] = ("Security", "terrorism", 5),
        ["al-shabaab"] = ("Security", "terrorism", 5), ["boko haram"] = ("Security", "terrorism", 5),
        ["isis"] = ("Security", "terrorism", 5), ["militant"] = ("Security", "terrorism", 4),
        ["extremist"] = ("Security", "terrorism", 4), ["insurgent"] = ("Security", "unrest", 4),
        ["armed attack"] = ("Security", "terrorism", 5), ["bomb"] = ("Security", "terrorism", 4),
        ["explosion"] = ("Security", "terrorism", 4), ["kidnap"] = ("Security", "terrorism", 4),
        ["protest"] = ("Security", "unrest", 3), ["riot"] = ("Security", "unrest", 4),
        ["conflict"] = ("Security", "unrest", 3), ["civil war"] = ("Security", "unrest", 5),
        ["coup"] = ("Politics", "unrest", 5), ["military takeover"] = ("Politics", "unrest", 5),
        ["violence"] = ("Security", "unrest", 3), ["clash"] = ("Security", "unrest", 3),
        ["rebel"] = ("Security", "unrest", 4), ["war"] = ("Security", "unrest", 4),
        ["epidemic"] = ("Health", "epidemic", 4), ["pandemic"] = ("Health", "epidemic", 5),
        ["outbreak"] = ("Health", "epidemic", 4), ["cholera"] = ("Health", "epidemic", 4),
        ["ebola"] = ("Health", "epidemic", 5), ["malaria"] = ("Health", "epidemic", 3),
        ["disease"] = ("Health", "epidemic", 3), ["mpox"] = ("Health", "epidemic", 3),
        ["flood"] = ("Environment", "flood", 4), ["flooding"] = ("Environment", "flood", 4),
        ["drought"] = ("Environment", "drought", 4), ["famine"] = ("Environment", "famine", 5),
        ["cyclone"] = ("Environment", "flood", 4), ["earthquake"] = ("Environment", "flood", 4),
        ["humanitarian"] = ("Society", "famine", 3), ["crisis"] = ("Society", "unknown", 3),
        ["cyber attack"] = ("Technology", "cyber", 4), ["cyberattack"] = ("Technology", "cyber", 4),
        ["hacking"] = ("Technology", "cyber", 3), ["data breach"] = ("Technology", "cyber", 4),
        ["ransomware"] = ("Technology", "cyber", 4),
        ["election"] = ("Politics", "none", 2), ["president"] = ("Politics", "none", 1),
        ["government"] = ("Politics", "none", 1), ["parliament"] = ("Politics", "none", 1),
        ["minister"] = ("Politics", "none", 1), ["diplomatic"] = ("Politics", "none", 1),
        ["sanctions"] = ("Politics", "none", 2),
        ["economy"] = ("Economy", "none", 1), ["inflation"] = ("Economy", "none", 2),
        ["trade"] = ("Economy", "none", 1), ["investment"] = ("Economy", "none", 1),
        ["oil"] = ("Economy", "none", 1), ["mining"] = ("Economy", "none", 1),
    };

    public static (string Category, string ThreatType, int ThreatLevel) ClassifyArticle(string title)
    {
        var titleLower = title.ToLower();
        string bestCategory = "Politics";
        string bestThreatType = "none";
        int bestThreatLevel = 1;

        foreach (var (keyword, (category, threatType, minThreat)) in ThreatKeywords)
        {
            if (titleLower.Contains(keyword.ToLower()) && minThreat > bestThreatLevel)
            {
                bestCategory = category;
                bestThreatType = threatType;
                bestThreatLevel = minThreat;
            }
        }

        return (bestCategory, bestThreatType, bestThreatLevel);
    }

    public static List<string> ExtractCountries(string text)
    {
        var countries = new List<string>();
        var textLower = text.ToLower();

        foreach (var (name, code) in AfricaCountryMap)
        {
            if (textLower.Contains(name))
                countries.Add(code);
        }

        if (countries.Count == 0)
            countries.Add("ET");

        return countries.Distinct().ToList();
    }

    public static List<(string Name, string Type)> ExtractEntities(string title)
    {
        var entities = new List<(string, string)>();

        var orgs = new[] { "African Union", "AU", "ECOWAS", "UN", "WHO", "IMF", "World Bank", "NATO", "EU", "OCHA", "UNHCR", "UNICEF" };
        foreach (var org in orgs)
        {
            if (title.Contains(org, StringComparison.OrdinalIgnoreCase))
                entities.Add((org, "Organization"));
        }

        foreach (var (name, _) in AfricaCountryMap.Where(x => x.Key.Length > 3))
        {
            if (title.Contains(name, StringComparison.OrdinalIgnoreCase))
                entities.Add((char.ToUpper(name[0]) + name[1..], "Location"));
        }

        return entities.DistinctBy(e => e.Item1).Take(5).ToList();
    }

    public static string ComputeHash(string input)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(input));
        return Convert.ToHexString(bytes)[..16];
    }

    public static string MapIso3ToIso2(string iso3)
    {
        return Iso3ToIso2.TryGetValue(iso3, out var iso2) ? iso2 : "";
    }
}
