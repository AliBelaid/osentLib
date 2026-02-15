namespace AUSentinel.Api.Models;

// ─── Email Breach Check (HIBP-style) ───
public record EmailBreachRequest(string Email);
public record EmailBreachResult
{
    public string Email { get; init; } = "";
    public bool Found { get; init; }
    public int TotalBreaches { get; init; }
    public long TotalExposedRecords { get; init; }
    public List<BreachInfo> Breaches { get; init; } = new();
}
public record BreachInfo
{
    public string Name { get; init; } = "";
    public string Domain { get; init; } = "";
    public DateTime BreachDate { get; init; }
    public long PwnCount { get; init; }
    public string Description { get; init; } = "";
    public List<string> DataClasses { get; init; } = new();
    public string Severity { get; init; } = ""; // Critical, High, Medium, Low
    public bool IsVerified { get; init; }
    public string LogoPath { get; init; } = "";
}

// ─── Google Dorks ───
public record GoogleDorkRequest(string Target, string Category);
public record GoogleDorkResult
{
    public string Target { get; init; } = "";
    public string Category { get; init; } = "";
    public List<DorkEntry> Dorks { get; init; } = new();
}
public record DorkEntry
{
    public string Title { get; init; } = "";
    public string Query { get; init; } = "";
    public string Description { get; init; } = "";
    public string Category { get; init; } = "";
    public string Risk { get; init; } = ""; // Info, Low, Medium, High, Critical
}

// ─── Wayback Machine ───
public record WaybackRequest(string Url);
public record WaybackResult
{
    public string Url { get; init; } = "";
    public int TotalSnapshots { get; init; }
    public string? FirstSnapshot { get; init; }
    public string? LastSnapshot { get; init; }
    public List<WaybackSnapshot> Snapshots { get; init; } = new();
}
public record WaybackSnapshot
{
    public string Timestamp { get; init; } = "";
    public DateTime CaptureDate { get; init; }
    public string ArchiveUrl { get; init; } = "";
    public int StatusCode { get; init; }
    public string MimeType { get; init; } = "";
    public long? Length { get; init; }
}

// ─── IP/Domain Intelligence ───
public record DomainIntelRequest(string Target);
public record DomainIntelResult
{
    public string Target { get; init; } = "";
    public string Type { get; init; } = ""; // domain, ip
    public WhoisData? Whois { get; init; }
    public GeoIpData? GeoIp { get; init; }
    public List<OpenPort> OpenPorts { get; init; } = new();
    public List<string> Technologies { get; init; } = new();
    public List<string> Subdomains { get; init; } = new();
    public DnsIntelData? Dns { get; init; }
    public ThreatIntelData? ThreatIntel { get; init; }
    public List<SslCertInfo> SslCerts { get; init; } = new();
}
public record WhoisData
{
    public string Registrar { get; init; } = "";
    public DateTime? CreatedDate { get; init; }
    public DateTime? ExpiresDate { get; init; }
    public string Organization { get; init; } = "";
    public string Country { get; init; } = "";
    public string[] NameServers { get; init; } = Array.Empty<string>();
}
public record GeoIpData
{
    public string Country { get; init; } = "";
    public string CountryCode { get; init; } = "";
    public string City { get; init; } = "";
    public string Region { get; init; } = "";
    public double Latitude { get; init; }
    public double Longitude { get; init; }
    public string Isp { get; init; } = "";
    public string Asn { get; init; } = "";
}
public record OpenPort
{
    public int Port { get; init; }
    public string Protocol { get; init; } = "";
    public string Service { get; init; } = "";
    public string Version { get; init; } = "";
    public string Banner { get; init; } = "";
}
public record DnsIntelData
{
    public List<string> ARecords { get; init; } = new();
    public List<string> AAAARecords { get; init; } = new();
    public List<string> MXRecords { get; init; } = new();
    public List<string> NSRecords { get; init; } = new();
    public List<string> TXTRecords { get; init; } = new();
    public List<string> CNAMERecords { get; init; } = new();
}
public record ThreatIntelData
{
    public int RiskScore { get; init; } // 0-100
    public string RiskLevel { get; init; } = "";
    public bool IsMalicious { get; init; }
    public List<string> Tags { get; init; } = new();
    public List<string> AssociatedMalware { get; init; } = new();
    public int AbuseReports { get; init; }
    public DateTime? LastSeen { get; init; }
}
public record SslCertInfo
{
    public string Subject { get; init; } = "";
    public string Issuer { get; init; } = "";
    public DateTime ValidFrom { get; init; }
    public DateTime ValidTo { get; init; }
    public string SerialNumber { get; init; } = "";
    public string[] SanDomains { get; init; } = Array.Empty<string>();
}

// ─── SpiderFoot Scanner ───
public record SpiderFootScanRequest(string Target, string ScanType); // ScanType: quick, full, passive
public record SpiderFootResult
{
    public string ScanId { get; init; } = "";
    public string Target { get; init; } = "";
    public string Status { get; init; } = "";
    public DateTime StartedAt { get; init; }
    public DateTime? CompletedAt { get; init; }
    public int TotalFindings { get; init; }
    public List<SpiderFootFinding> Findings { get; init; } = new();
    public Dictionary<string, int> ModuleStats { get; init; } = new();
}
public record SpiderFootFinding
{
    public string Module { get; init; } = "";
    public string Type { get; init; } = "";
    public string Data { get; init; } = "";
    public string Severity { get; init; } = ""; // Info, Low, Medium, High, Critical
    public DateTime FoundAt { get; init; }
    public string Source { get; init; } = "";
}

// ─── Maltego Entity Graph ───
public record MaltegoTransformRequest(string EntityType, string EntityValue, string? TransformType);
public record MaltegoGraphResult
{
    public List<MaltegoEntity> Entities { get; init; } = new();
    public List<MaltegoLink> Links { get; init; } = new();
}
public record MaltegoEntity
{
    public string Id { get; init; } = "";
    public string Type { get; init; } = ""; // Person, Email, Domain, IP, Phone, Organization, SocialProfile, Hash, URL, Location
    public string Value { get; init; } = "";
    public string Label { get; init; } = "";
    public Dictionary<string, string> Properties { get; init; } = new();
    public string? Icon { get; init; }
    public int Weight { get; init; } = 1; // For node size
}
public record MaltegoLink
{
    public string Source { get; init; } = "";
    public string Target { get; init; } = "";
    public string Label { get; init; } = "";
    public string Type { get; init; } = ""; // owns, uses, resolves_to, linked_to, etc.
    public int Weight { get; init; } = 1;
}
