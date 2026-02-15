using System.Net;
using System.Text.Json;

namespace AUSentinel.Api.Services.ExternalSearch;

/// <summary>
/// Threat Intelligence Provider - Uses REAL free APIs:
/// 1. Shodan InternetDB (https://internetdb.shodan.io/{ip}) - Real open ports, vulns, hostnames
/// 2. crt.sh (https://crt.sh/?q=domain&output=json) - Real SSL certificate transparency logs
/// 3. URLScan.io (https://urlscan.io/api/v1/search/) - Real URL/domain scan results
/// All free, no API key required.
/// </summary>
public class DarkWebSearchProvider : IExternalSearchProvider
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<DarkWebSearchProvider> _logger;

    public string ProviderName => "ThreatIntel";
    public bool IsConfigured => true; // All APIs are free

    public DarkWebSearchProvider(
        HttpClient httpClient,
        ILogger<DarkWebSearchProvider> logger)
    {
        _httpClient = httpClient;
        _logger = logger;

        if (!_httpClient.DefaultRequestHeaders.Contains("User-Agent"))
        {
            _httpClient.DefaultRequestHeaders.Add("User-Agent", "AUSentinel-OSINT-Platform");
        }
    }

    public async Task<ExternalSearchResult> SearchAsync(string query, ExternalSearchFilters filters)
    {
        var result = new ExternalSearchResult
        {
            Provider = ProviderName,
            Query = query,
            Success = false
        };

        try
        {
            var items = new List<ExternalSearchItem>();

            // Determine if query is an IP, domain, or general term
            var isIp = IPAddress.TryParse(query, out _);
            var isDomain = !isIp && query.Contains('.') && !query.Contains(' ');

            if (isIp)
            {
                // Shodan InternetDB for IP intelligence
                var shodanItems = await SearchShodanInternetDB(query);
                items.AddRange(shodanItems);
            }
            else if (isDomain)
            {
                // crt.sh for certificate transparency
                var certItems = await SearchCrtSh(query, filters);
                items.AddRange(certItems);

                // URLScan.io for domain scan results
                var urlScanItems = await SearchUrlScan(query, filters);
                items.AddRange(urlScanItems);

                // Also try to resolve domain to IP and check Shodan
                try
                {
                    var entry = await Dns.GetHostEntryAsync(query);
                    var ip = entry.AddressList.FirstOrDefault(a => a.AddressFamily == System.Net.Sockets.AddressFamily.InterNetwork);
                    if (ip != null)
                    {
                        var shodanItems = await SearchShodanInternetDB(ip.ToString());
                        items.AddRange(shodanItems);
                    }
                }
                catch { /* DNS resolution failed - skip Shodan */ }
            }
            else
            {
                // General search - use URLScan.io
                var urlScanItems = await SearchUrlScan(query, filters);
                items.AddRange(urlScanItems);
            }

            result.Items = items.Take(filters.MaxResults).ToList();
            result.TotalResults = result.Items.Count;
            result.Success = true;
            result.SearchedAt = DateTime.UtcNow;

            if (result.TotalResults == 0)
            {
                _logger.LogInformation("ThreatIntel search: no results for '{Query}'", query);
            }
            else
            {
                _logger.LogInformation("ThreatIntel search: {Count} results for '{Query}'", result.TotalResults, query);
            }
        }
        catch (Exception ex)
        {
            result.ErrorMessage = $"Threat intelligence search failed: {ex.Message}";
            _logger.LogError(ex, "ThreatIntel search failed for query: {Query}", query);
        }

        return result;
    }

    /// <summary>
    /// Shodan InternetDB - Free API, no key needed.
    /// Returns real open ports, vulnerabilities, hostnames, and CPEs for an IP.
    /// </summary>
    private async Task<List<ExternalSearchItem>> SearchShodanInternetDB(string ip)
    {
        var items = new List<ExternalSearchItem>();

        try
        {
            var response = await _httpClient.GetAsync($"https://internetdb.shodan.io/{ip}");

            if (response.StatusCode == HttpStatusCode.NotFound)
            {
                // IP not in Shodan database - this is valid, return empty
                return items;
            }

            if (!response.IsSuccessStatusCode) return items;

            var json = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;

            // Extract ports
            var ports = new List<int>();
            if (root.TryGetProperty("ports", out var portsArr))
            {
                foreach (var port in portsArr.EnumerateArray())
                    ports.Add(port.GetInt32());
            }

            // Extract vulnerabilities (CVEs)
            var vulns = new List<string>();
            if (root.TryGetProperty("vulns", out var vulnsArr))
            {
                foreach (var vuln in vulnsArr.EnumerateArray())
                    vulns.Add(vuln.GetString() ?? "");
            }

            // Extract hostnames
            var hostnames = new List<string>();
            if (root.TryGetProperty("hostnames", out var hostsArr))
            {
                foreach (var host in hostsArr.EnumerateArray())
                    hostnames.Add(host.GetString() ?? "");
            }

            // Extract CPEs (software identifiers)
            var cpes = new List<string>();
            if (root.TryGetProperty("cpes", out var cpesArr))
            {
                foreach (var cpe in cpesArr.EnumerateArray())
                    cpes.Add(cpe.GetString() ?? "");
            }

            // Create result for open ports
            if (ports.Count > 0)
            {
                items.Add(new ExternalSearchItem
                {
                    Id = $"shodan_ports_{ip.GetHashCode():X}",
                    Title = $"[Shodan] Open Ports on {ip}",
                    Content = $"Detected {ports.Count} open ports: {string.Join(", ", ports)}. " +
                              (hostnames.Count > 0 ? $"Hostnames: {string.Join(", ", hostnames)}. " : "") +
                              (cpes.Count > 0 ? $"Software: {string.Join(", ", cpes.Take(5))}." : ""),
                    Author = "Shodan InternetDB",
                    Source = "ThreatIntel",
                    Url = $"https://www.shodan.io/host/{ip}",
                    PublishedAt = DateTime.UtcNow,
                    EngagementCount = ports.Count,
                    Metadata = new Dictionary<string, object>
                    {
                        ["type"] = "port_scan",
                        ["ip"] = ip,
                        ["ports"] = string.Join(", ", ports),
                        ["hostnames"] = string.Join(", ", hostnames),
                        ["cpes"] = string.Join(", ", cpes),
                        ["platform"] = "Shodan",
                        ["threat_level"] = ports.Count > 10 ? "HIGH" : ports.Count > 5 ? "MEDIUM" : "LOW"
                    }
                });
            }

            // Create result for vulnerabilities
            if (vulns.Count > 0)
            {
                var severity = vulns.Count > 10 ? "CRITICAL" : vulns.Count > 5 ? "HIGH" : "MEDIUM";
                items.Add(new ExternalSearchItem
                {
                    Id = $"shodan_vulns_{ip.GetHashCode():X}",
                    Title = $"[CVE] {vulns.Count} Vulnerabilities found on {ip}",
                    Content = $"Known vulnerabilities detected: {string.Join(", ", vulns.Take(10))}" +
                              (vulns.Count > 10 ? $" and {vulns.Count - 10} more." : "."),
                    Author = "Shodan InternetDB",
                    Source = "ThreatIntel",
                    Url = $"https://www.shodan.io/host/{ip}",
                    PublishedAt = DateTime.UtcNow,
                    EngagementCount = vulns.Count,
                    Metadata = new Dictionary<string, object>
                    {
                        ["type"] = "vulnerability",
                        ["ip"] = ip,
                        ["vulns"] = string.Join(", ", vulns),
                        ["vuln_count"] = vulns.Count,
                        ["platform"] = "Shodan",
                        ["threat_level"] = severity,
                        ["category"] = "CVE"
                    }
                });
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Shodan InternetDB lookup failed for {Ip}", ip);
        }

        return items;
    }

    /// <summary>
    /// crt.sh - Certificate Transparency Log search.
    /// Free, no key. Returns real SSL certificates for a domain (discovers subdomains).
    /// </summary>
    private async Task<List<ExternalSearchItem>> SearchCrtSh(string domain, ExternalSearchFilters filters)
    {
        var items = new List<ExternalSearchItem>();

        try
        {
            var encodedDomain = Uri.EscapeDataString($"%.{domain}");
            var url = $"https://crt.sh/?q={encodedDomain}&output=json";

            var response = await _httpClient.GetAsync(url);
            if (!response.IsSuccessStatusCode) return items;

            var json = await response.Content.ReadAsStringAsync();
            if (string.IsNullOrWhiteSpace(json) || json == "[]") return items;

            var certs = JsonSerializer.Deserialize<List<JsonElement>>(json) ?? new();

            // Group by unique common names (subdomains)
            var uniqueDomains = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            var certEntries = new List<(string commonName, string issuer, string notBefore, string notAfter, long id)>();

            foreach (var cert in certs.Take(100))
            {
                var commonName = cert.TryGetProperty("common_name", out var cn) ? cn.GetString() ?? "" : "";
                var nameValue = cert.TryGetProperty("name_value", out var nv) ? nv.GetString() ?? "" : "";
                var issuer = cert.TryGetProperty("issuer_name", out var iss) ? iss.GetString() ?? "" : "";
                var notBefore = cert.TryGetProperty("not_before", out var nb) ? nb.GetString() ?? "" : "";
                var notAfter = cert.TryGetProperty("not_after", out var na) ? na.GetString() ?? "" : "";
                var certId = cert.TryGetProperty("id", out var id) ? id.GetInt64() : 0;

                // Extract all domains from name_value (may contain multiple newline-separated)
                var names = nameValue.Split('\n', StringSplitOptions.RemoveEmptyEntries);
                foreach (var name in names)
                {
                    var trimmed = name.Trim();
                    if (!string.IsNullOrEmpty(trimmed))
                        uniqueDomains.Add(trimmed);
                }

                if (!string.IsNullOrEmpty(commonName))
                {
                    uniqueDomains.Add(commonName);
                    certEntries.Add((commonName, issuer, notBefore, notAfter, certId));
                }
            }

            // Subdomain discovery result
            if (uniqueDomains.Count > 0)
            {
                var subdomainList = uniqueDomains.OrderBy(d => d).ToList();
                items.Add(new ExternalSearchItem
                {
                    Id = $"crtsh_subs_{domain.GetHashCode():X}",
                    Title = $"[crt.sh] {uniqueDomains.Count} Subdomains discovered for {domain}",
                    Content = $"Certificate Transparency logs reveal {uniqueDomains.Count} unique domains/subdomains: " +
                              string.Join(", ", subdomainList.Take(20)) +
                              (subdomainList.Count > 20 ? $" and {subdomainList.Count - 20} more." : "."),
                    Author = "crt.sh / Certificate Transparency",
                    Source = "ThreatIntel",
                    Url = $"https://crt.sh/?q=%.{domain}",
                    PublishedAt = DateTime.UtcNow,
                    EngagementCount = uniqueDomains.Count,
                    Metadata = new Dictionary<string, object>
                    {
                        ["type"] = "certificate_transparency",
                        ["domain"] = domain,
                        ["subdomain_count"] = uniqueDomains.Count,
                        ["subdomains"] = string.Join(", ", subdomainList.Take(50)),
                        ["platform"] = "crt.sh",
                        ["category"] = "Subdomain Discovery"
                    }
                });
            }

            // Recent certificates
            foreach (var entry in certEntries.DistinctBy(e => e.commonName).Take(5))
            {
                var isExpired = DateTime.TryParse(entry.notAfter, out var expiry) && expiry < DateTime.UtcNow;
                items.Add(new ExternalSearchItem
                {
                    Id = $"crtsh_cert_{entry.id}",
                    Title = $"[SSL] Certificate for {entry.commonName}" + (isExpired ? " (EXPIRED)" : ""),
                    Content = $"SSL Certificate: CN={entry.commonName}, Issuer: {entry.issuer}, " +
                              $"Valid: {entry.notBefore} to {entry.notAfter}" +
                              (isExpired ? " [WARNING: Certificate has expired]" : ""),
                    Author = entry.issuer,
                    Source = "ThreatIntel",
                    Url = $"https://crt.sh/?id={entry.id}",
                    PublishedAt = DateTime.TryParse(entry.notBefore, out var issued) ? issued : DateTime.UtcNow,
                    EngagementCount = 0,
                    Metadata = new Dictionary<string, object>
                    {
                        ["type"] = "ssl_certificate",
                        ["common_name"] = entry.commonName,
                        ["issuer"] = entry.issuer,
                        ["not_before"] = entry.notBefore,
                        ["not_after"] = entry.notAfter,
                        ["expired"] = isExpired,
                        ["platform"] = "crt.sh",
                        ["threat_level"] = isExpired ? "HIGH" : "LOW"
                    }
                });
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "crt.sh search failed for {Domain}", domain);
        }

        return items;
    }

    /// <summary>
    /// URLScan.io - Free URL/domain scanning and intelligence.
    /// No API key needed for search. Returns real scan results.
    /// </summary>
    private async Task<List<ExternalSearchItem>> SearchUrlScan(string query, ExternalSearchFilters filters)
    {
        var items = new List<ExternalSearchItem>();

        try
        {
            var isDomain = query.Contains('.') && !query.Contains(' ');
            var searchQuery = isDomain ? $"domain:{query}" : query;
            var encodedQuery = Uri.EscapeDataString(searchQuery);
            var url = $"https://urlscan.io/api/v1/search/?q={encodedQuery}&size=10";

            var request = new HttpRequestMessage(HttpMethod.Get, url);
            var response = await _httpClient.SendAsync(request);
            if (!response.IsSuccessStatusCode) return items;

            var json = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;

            if (!root.TryGetProperty("results", out var results)) return items;

            foreach (var scanResult in results.EnumerateArray())
            {
                var task = scanResult.TryGetProperty("task", out var t) ? t : default;
                var page = scanResult.TryGetProperty("page", out var p) ? p : default;
                var stats = scanResult.TryGetProperty("stats", out var s) ? s : default;

                var scanUrl = task.ValueKind != JsonValueKind.Undefined && task.TryGetProperty("url", out var su)
                    ? su.GetString() ?? "" : "";
                var scanDomain = page.ValueKind != JsonValueKind.Undefined && page.TryGetProperty("domain", out var sd)
                    ? sd.GetString() ?? "" : "";
                var scanIp = page.ValueKind != JsonValueKind.Undefined && page.TryGetProperty("ip", out var si)
                    ? si.GetString() ?? "" : "";
                var server = page.ValueKind != JsonValueKind.Undefined && page.TryGetProperty("server", out var sv)
                    ? sv.GetString() ?? "" : "";
                var country = page.ValueKind != JsonValueKind.Undefined && page.TryGetProperty("country", out var co)
                    ? co.GetString() ?? "" : "";
                var statusCode = page.ValueKind != JsonValueKind.Undefined && page.TryGetProperty("status", out var sc)
                    ? sc.GetInt32().ToString() : "";
                var resultUrl = scanResult.TryGetProperty("result", out var ru) ? ru.GetString() ?? "" : "";
                var scanTime = task.ValueKind != JsonValueKind.Undefined && task.TryGetProperty("time", out var st2)
                    && DateTime.TryParse(st2.GetString(), out var scanDate) ? scanDate : DateTime.UtcNow;

                var isMalicious = page.ValueKind != JsonValueKind.Undefined
                    && page.TryGetProperty("tlsIssuer", out _); // basic check

                var uniqueIps = stats.ValueKind != JsonValueKind.Undefined && stats.TryGetProperty("uniqIPs", out var ui)
                    ? ui.GetInt32() : 0;

                if (string.IsNullOrEmpty(scanDomain) && string.IsNullOrEmpty(scanUrl)) continue;

                items.Add(new ExternalSearchItem
                {
                    Id = $"urlscan_{scanDomain.GetHashCode():X}_{scanTime.Ticks}",
                    Title = $"[URLScan] Scan of {scanDomain}",
                    Content = $"Domain: {scanDomain}, IP: {scanIp}, Server: {server}, " +
                              $"Country: {country}, Status: {statusCode}" +
                              (uniqueIps > 0 ? $", Connected to {uniqueIps} unique IPs" : ""),
                    Author = "URLScan.io",
                    Source = "ThreatIntel",
                    Url = resultUrl,
                    PublishedAt = scanTime,
                    EngagementCount = uniqueIps,
                    Metadata = new Dictionary<string, object>
                    {
                        ["type"] = "url_scan",
                        ["domain"] = scanDomain,
                        ["ip"] = scanIp,
                        ["server"] = server,
                        ["country"] = country,
                        ["status_code"] = statusCode,
                        ["scan_url"] = scanUrl,
                        ["platform"] = "URLScan.io",
                        ["category"] = "Web Intelligence"
                    }
                });
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "URLScan.io search failed for {Query}", query);
        }

        return items;
    }
}
