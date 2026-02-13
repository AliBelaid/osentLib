namespace AUSentinel.Api.Data.Entities;

public class DnsLookup
{
    public int Id { get; set; }
    public Guid UserId { get; set; }
    public string Domain { get; set; } = string.Empty;

    // DNS Records (stored as JSON)
    public string? ARecords { get; set; } // JSON array of IP addresses
    public string? MxRecords { get; set; } // JSON array of mail servers
    public string? TxtRecords { get; set; } // JSON array of TXT records
    public string? NsRecords { get; set; } // JSON array of nameservers

    // WHOIS Data
    public string? WhoisRegistrar { get; set; }
    public DateTime? WhoisCreatedDate { get; set; }
    public DateTime? WhoisExpirationDate { get; set; }
    public string? WhoisOrganization { get; set; }
    public string? WhoisCountry { get; set; }

    // IP Geolocation (from first A record)
    public string? IpAddress { get; set; }
    public string? IpCountry { get; set; }
    public string? IpCity { get; set; }
    public string? IpIsp { get; set; }

    // Risk Assessment
    public int RiskScore { get; set; } // 0-100
    public string? RiskFactors { get; set; } // JSON array of detected risk factors
    public bool IsSuspicious { get; set; }

    public DateTime LookedUpAt { get; set; } = DateTime.UtcNow;

    // Navigation Properties
    public User User { get; set; } = null!;
}
