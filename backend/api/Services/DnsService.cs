using AUSentinel.Api.Data;
using AUSentinel.Api.Data.Entities;
using DnsClient;
using Microsoft.EntityFrameworkCore;
using System.Net;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace AUSentinel.Api.Services;

public interface IDnsService
{
    Task<DnsLookupResult> PerformLookupAsync(string domain, Guid userId);
    Task<DnsLookup?> GetLookupByIdAsync(int id, Guid userId);
    Task<List<DnsLookup>> GetUserLookupsAsync(Guid userId, int page = 1, int pageSize = 20);
    Task<List<string>> ExtractDomainsFromTextAsync(string text);
}

public class DnsService : IDnsService
{
    private readonly AppDbContext _db;
    private readonly ILookupClient _dnsClient;
    private readonly ILogger<DnsService> _logger;
    private readonly HttpClient _httpClient;

    // Suspicious patterns for risk assessment
    private static readonly string[] SuspiciousKeywords = new[]
    {
        "phish", "scam", "hack", "malware", "virus", "trojan",
        "spam", "fake", "fraud", "suspicious", "tempmail", "disposable"
    };

    private static readonly string[] SuspiciousTlds = new[]
    {
        ".tk", ".ml", ".ga", ".cf", ".gq", // Free TLDs often used for malicious purposes
        ".xyz", ".top", ".work", ".click"
    };

    public DnsService(
        AppDbContext db,
        ILogger<DnsService> logger,
        HttpClient httpClient)
    {
        _db = db;
        _logger = logger;
        _httpClient = httpClient;
        _dnsClient = new LookupClient();
    }

    public async Task<DnsLookupResult> PerformLookupAsync(string domain, Guid userId)
    {
        domain = CleanDomain(domain);

        var result = new DnsLookupResult
        {
            Domain = domain,
            Success = false
        };

        try
        {
            // Perform DNS lookups
            var aRecords = await GetARecordsAsync(domain);
            var mxRecords = await GetMxRecordsAsync(domain);
            var txtRecords = await GetTxtRecordsAsync(domain);
            var nsRecords = await GetNsRecordsAsync(domain);

            result.ARecords = aRecords;
            result.MxRecords = mxRecords;
            result.TxtRecords = txtRecords;
            result.NsRecords = nsRecords;
            result.Success = aRecords.Any() || mxRecords.Any() || nsRecords.Any();

            // Get IP geolocation from first A record
            if (aRecords.Any())
            {
                var ipInfo = await GetIpGeolocationAsync(aRecords.First());
                result.IpAddress = ipInfo.IpAddress;
                result.IpCountry = ipInfo.Country;
                result.IpCity = ipInfo.City;
                result.IpIsp = ipInfo.Isp;
            }

            // Perform WHOIS lookup (simplified - in production use a WHOIS library)
            var whoisInfo = await GetWhoisInfoAsync(domain);
            result.WhoisRegistrar = whoisInfo.Registrar;
            result.WhoisCreatedDate = whoisInfo.CreatedDate;
            result.WhoisExpirationDate = whoisInfo.ExpirationDate;
            result.WhoisOrganization = whoisInfo.Organization;
            result.WhoisCountry = whoisInfo.Country;

            // Assess risk
            var riskAssessment = AssessRisk(domain, aRecords, whoisInfo);
            result.RiskScore = riskAssessment.RiskScore;
            result.RiskFactors = riskAssessment.RiskFactors;
            result.IsSuspicious = riskAssessment.IsSuspicious;

            // Save to database
            var dnsLookup = new DnsLookup
            {
                UserId = userId,
                Domain = domain,
                ARecords = JsonSerializer.Serialize(aRecords),
                MxRecords = JsonSerializer.Serialize(mxRecords),
                TxtRecords = JsonSerializer.Serialize(txtRecords),
                NsRecords = JsonSerializer.Serialize(nsRecords),
                WhoisRegistrar = result.WhoisRegistrar,
                WhoisCreatedDate = result.WhoisCreatedDate,
                WhoisExpirationDate = result.WhoisExpirationDate,
                WhoisOrganization = result.WhoisOrganization,
                WhoisCountry = result.WhoisCountry,
                IpAddress = result.IpAddress,
                IpCountry = result.IpCountry,
                IpCity = result.IpCity,
                IpIsp = result.IpIsp,
                RiskScore = result.RiskScore,
                RiskFactors = JsonSerializer.Serialize(result.RiskFactors),
                IsSuspicious = result.IsSuspicious,
                LookedUpAt = DateTime.UtcNow
            };

            _db.DnsLookups.Add(dnsLookup);
            await _db.SaveChangesAsync();

            result.LookupId = dnsLookup.Id;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to perform DNS lookup for domain {Domain}", domain);
            result.ErrorMessage = ex.Message;
        }

        return result;
    }

    public async Task<DnsLookup?> GetLookupByIdAsync(int id, Guid userId)
    {
        return await _db.DnsLookups
            .Include(dl => dl.User)
            .FirstOrDefaultAsync(dl => dl.Id == id && dl.UserId == userId);
    }

    public async Task<List<DnsLookup>> GetUserLookupsAsync(Guid userId, int page = 1, int pageSize = 20)
    {
        return await _db.DnsLookups
            .Where(dl => dl.UserId == userId)
            .OrderByDescending(dl => dl.LookedUpAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();
    }

    public async Task<List<string>> ExtractDomainsFromTextAsync(string text)
    {
        // Extract domains from text using regex
        var domainPattern = @"\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}\b";
        var matches = Regex.Matches(text.ToLowerInvariant(), domainPattern, RegexOptions.IgnoreCase);

        var domains = matches
            .Select(m => m.Value)
            .Distinct()
            .Where(d => !IsCommonDomain(d))
            .ToList();

        return await Task.FromResult(domains);
    }

    private async Task<List<string>> GetARecordsAsync(string domain)
    {
        try
        {
            var result = await _dnsClient.QueryAsync(domain, QueryType.A);
            return result.Answers.ARecords().Select(r => r.Address.ToString()).ToList();
        }
        catch
        {
            return new List<string>();
        }
    }

    private async Task<List<string>> GetMxRecordsAsync(string domain)
    {
        try
        {
            var result = await _dnsClient.QueryAsync(domain, QueryType.MX);
            return result.Answers.MxRecords()
                .OrderBy(r => r.Preference)
                .Select(r => $"{r.Exchange} (priority: {r.Preference})")
                .ToList();
        }
        catch
        {
            return new List<string>();
        }
    }

    private async Task<List<string>> GetTxtRecordsAsync(string domain)
    {
        try
        {
            var result = await _dnsClient.QueryAsync(domain, QueryType.TXT);
            return result.Answers.TxtRecords()
                .SelectMany(r => r.Text)
                .ToList();
        }
        catch
        {
            return new List<string>();
        }
    }

    private async Task<List<string>> GetNsRecordsAsync(string domain)
    {
        try
        {
            var result = await _dnsClient.QueryAsync(domain, QueryType.NS);
            return result.Answers.NsRecords().Select(r => r.NSDName.Value).ToList();
        }
        catch
        {
            return new List<string>();
        }
    }

    private async Task<IpGeolocationInfo> GetIpGeolocationAsync(string ipAddress)
    {
        try
        {
            // Using ip-api.com free API (limited to 45 requests per minute)
            var response = await _httpClient.GetAsync($"http://ip-api.com/json/{ipAddress}");
            if (response.IsSuccessStatusCode)
            {
                var json = await response.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(json);
                var root = doc.RootElement;

                return new IpGeolocationInfo
                {
                    IpAddress = ipAddress,
                    Country = root.GetProperty("country").GetString() ?? "Unknown",
                    City = root.GetProperty("city").GetString() ?? "Unknown",
                    Isp = root.GetProperty("isp").GetString() ?? "Unknown"
                };
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to get IP geolocation for {IpAddress}", ipAddress);
        }

        return new IpGeolocationInfo { IpAddress = ipAddress };
    }

    private async Task<WhoisInfo> GetWhoisInfoAsync(string domain)
    {
        // Simplified WHOIS lookup
        // In production, use a dedicated WHOIS library like Whois.NET
        var whoisInfo = new WhoisInfo();

        try
        {
            // For demonstration, we'll use a simple pattern check
            // In production, query actual WHOIS servers
            whoisInfo.Registrar = "Unknown";
            whoisInfo.Organization = "Unknown";
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to get WHOIS info for {Domain}", domain);
        }

        return await Task.FromResult(whoisInfo);
    }

    private RiskAssessment AssessRisk(string domain, List<string> ipAddresses, WhoisInfo whoisInfo)
    {
        var riskFactors = new List<string>();
        var riskScore = 0;

        // Check for suspicious keywords in domain
        if (SuspiciousKeywords.Any(keyword => domain.Contains(keyword, StringComparison.OrdinalIgnoreCase)))
        {
            riskFactors.Add("Domain contains suspicious keywords");
            riskScore += 30;
        }

        // Check for suspicious TLD
        if (SuspiciousTlds.Any(tld => domain.EndsWith(tld, StringComparison.OrdinalIgnoreCase)))
        {
            riskFactors.Add("Suspicious top-level domain");
            riskScore += 20;
        }

        // Check if domain is newly registered (if WHOIS data available)
        if (whoisInfo.CreatedDate.HasValue && whoisInfo.CreatedDate.Value > DateTime.UtcNow.AddMonths(-3))
        {
            riskFactors.Add("Recently registered domain");
            riskScore += 15;
        }

        // Check for multiple consecutive hyphens (common in phishing)
        if (Regex.IsMatch(domain, @"--+"))
        {
            riskFactors.Add("Multiple consecutive hyphens");
            riskScore += 10;
        }

        // Check for excessive length (phishing domains often long)
        if (domain.Length > 50)
        {
            riskFactors.Add("Unusually long domain name");
            riskScore += 10;
        }

        // Check for IP address in domain name (suspicious)
        if (Regex.IsMatch(domain, @"\d{1,3}[-\.]\d{1,3}[-\.]\d{1,3}"))
        {
            riskFactors.Add("Domain contains IP-like pattern");
            riskScore += 25;
        }

        return new RiskAssessment
        {
            RiskScore = Math.Min(riskScore, 100),
            RiskFactors = riskFactors,
            IsSuspicious = riskScore >= 40
        };
    }

    private string CleanDomain(string domain)
    {
        // Remove protocol if present
        domain = Regex.Replace(domain, @"^https?://", "", RegexOptions.IgnoreCase);

        // Remove path if present
        domain = domain.Split('/')[0];

        // Remove www prefix if present
        domain = Regex.Replace(domain, @"^www\.", "", RegexOptions.IgnoreCase);

        return domain.Trim().ToLowerInvariant();
    }

    private bool IsCommonDomain(string domain)
    {
        // Filter out very common domains to reduce noise
        var commonDomains = new[]
        {
            "google.com", "facebook.com", "twitter.com", "youtube.com",
            "amazon.com", "wikipedia.org", "linkedin.com", "reddit.com",
            "microsoft.com", "apple.com", "bbc.com", "cnn.com"
        };

        return commonDomains.Contains(domain);
    }
}

// Supporting Models
public class DnsLookupResult
{
    public int? LookupId { get; set; }
    public string Domain { get; set; } = string.Empty;
    public bool Success { get; set; }
    public string? ErrorMessage { get; set; }

    public List<string> ARecords { get; set; } = new();
    public List<string> MxRecords { get; set; } = new();
    public List<string> TxtRecords { get; set; } = new();
    public List<string> NsRecords { get; set; } = new();

    public string? WhoisRegistrar { get; set; }
    public DateTime? WhoisCreatedDate { get; set; }
    public DateTime? WhoisExpirationDate { get; set; }
    public string? WhoisOrganization { get; set; }
    public string? WhoisCountry { get; set; }

    public string? IpAddress { get; set; }
    public string? IpCountry { get; set; }
    public string? IpCity { get; set; }
    public string? IpIsp { get; set; }

    public int RiskScore { get; set; }
    public List<string> RiskFactors { get; set; } = new();
    public bool IsSuspicious { get; set; }
}

public class IpGeolocationInfo
{
    public string IpAddress { get; set; } = string.Empty;
    public string Country { get; set; } = "Unknown";
    public string City { get; set; } = "Unknown";
    public string Isp { get; set; } = "Unknown";
}

public class WhoisInfo
{
    public string? Registrar { get; set; }
    public DateTime? CreatedDate { get; set; }
    public DateTime? ExpirationDate { get; set; }
    public string? Organization { get; set; }
    public string? Country { get; set; }
}

public class RiskAssessment
{
    public int RiskScore { get; set; }
    public List<string> RiskFactors { get; set; } = new();
    public bool IsSuspicious { get; set; }
}
