using AUSentinel.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using System.Text.Json;

namespace AUSentinel.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DnsController : ControllerBase
{
    private readonly IDnsService _dnsService;
    private readonly IDomainWatchlistService _watchlistService;
    private readonly ILogger<DnsController> _logger;

    public DnsController(
        IDnsService dnsService,
        IDomainWatchlistService watchlistService,
        ILogger<DnsController> logger)
    {
        _dnsService = dnsService;
        _watchlistService = watchlistService;
        _logger = logger;
    }

    [HttpPost("lookup")]
    public async Task<IActionResult> PerformLookup([FromBody] DnsLookupRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Domain))
            return BadRequest(new { error = "Domain is required" });

        var userId = GetUserId();
        var result = await _dnsService.PerformLookupAsync(request.Domain, userId);

        if (!result.Success)
            return BadRequest(new { error = result.ErrorMessage ?? "DNS lookup failed" });

        return Ok(result);
    }

    [HttpGet("history")]
    public async Task<IActionResult> GetLookupHistory([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var userId = GetUserId();
        var lookups = await _dnsService.GetUserLookupsAsync(userId, page, pageSize);

        var dtos = lookups.Select(MapToDnsLookupDto).ToList();
        return Ok(dtos);
    }

    [HttpGet("history/{id}")]
    public async Task<IActionResult> GetLookupById(int id)
    {
        var userId = GetUserId();
        var lookup = await _dnsService.GetLookupByIdAsync(id, userId);

        if (lookup == null)
            return NotFound(new { error = "DNS lookup not found" });

        return Ok(MapToDnsLookupDto(lookup));
    }

    [HttpPost("extract-domains")]
    public async Task<IActionResult> ExtractDomains([FromBody] ExtractDomainsRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Text))
            return BadRequest(new { error = "Text is required" });

        var domains = await _dnsService.ExtractDomainsFromTextAsync(request.Text);
        return Ok(new { domains, count = domains.Count });
    }

    // Watchlist Endpoints
    [HttpGet("watchlist")]
    public async Task<IActionResult> GetWatchlist([FromQuery] string? status = null, [FromQuery] string? countryCode = null)
    {
        var watchlists = await _watchlistService.GetAllWatchlistsAsync(status, countryCode);

        var dtos = watchlists.Select(MapToWatchlistDto).ToList();
        return Ok(dtos);
    }

    [HttpGet("watchlist/{id}")]
    public async Task<IActionResult> GetWatchlistEntry(int id)
    {
        var entry = await _watchlistService.GetWatchlistEntryAsync(id);

        if (entry == null)
            return NotFound(new { error = "Watchlist entry not found" });

        return Ok(MapToWatchlistDto(entry));
    }

    [HttpPost("watchlist")]
    public async Task<IActionResult> AddToWatchlist([FromBody] CreateWatchlistEntryRequest request)
    {
        var userId = GetUserId();

        try
        {
            var entry = await _watchlistService.AddToWatchlistAsync(request, userId);
            return Ok(MapToWatchlistDto(entry));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPut("watchlist/{id}")]
    public async Task<IActionResult> UpdateWatchlist(int id, [FromBody] UpdateWatchlistEntryRequest request)
    {
        try
        {
            var entry = await _watchlistService.UpdateWatchlistAsync(id, request);
            return Ok(MapToWatchlistDto(entry));
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { error = ex.Message });
        }
    }

    [HttpDelete("watchlist/{id}")]
    [Authorize(Roles = "AUAdmin,CountryAdmin")]
    public async Task<IActionResult> DeleteWatchlist(int id)
    {
        try
        {
            await _watchlistService.DeleteWatchlistAsync(id);
            return Ok(new { message = "Watchlist entry deleted" });
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { error = ex.Message });
        }
    }

    [HttpGet("watchlist/check/{domain}")]
    public async Task<IActionResult> CheckDomain(string domain)
    {
        var isBlocked = await _watchlistService.IsDomainBlockedAsync(domain);
        var entry = await _watchlistService.GetByDomainAsync(domain);

        return Ok(new
        {
            domain,
            isBlocked,
            inWatchlist = entry != null,
            watchlistEntry = entry != null ? MapToWatchlistDto(entry) : null
        });
    }

    private Guid GetUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.Parse(userIdClaim!);
    }

    private DnsLookupDto MapToDnsLookupDto(Data.Entities.DnsLookup lookup)
    {
        return new DnsLookupDto
        {
            Id = lookup.Id,
            Domain = lookup.Domain,
            ARecords = ParseJsonArray(lookup.ARecords),
            MxRecords = ParseJsonArray(lookup.MxRecords),
            TxtRecords = ParseJsonArray(lookup.TxtRecords),
            NsRecords = ParseJsonArray(lookup.NsRecords),
            WhoisRegistrar = lookup.WhoisRegistrar,
            WhoisCreatedDate = lookup.WhoisCreatedDate,
            WhoisExpirationDate = lookup.WhoisExpirationDate,
            WhoisOrganization = lookup.WhoisOrganization,
            WhoisCountry = lookup.WhoisCountry,
            IpAddress = lookup.IpAddress,
            IpCountry = lookup.IpCountry,
            IpCity = lookup.IpCity,
            IpIsp = lookup.IpIsp,
            RiskScore = lookup.RiskScore,
            RiskFactors = ParseJsonArray(lookup.RiskFactors),
            IsSuspicious = lookup.IsSuspicious,
            LookedUpAt = lookup.LookedUpAt
        };
    }

    private DomainWatchlistDto MapToWatchlistDto(Data.Entities.DomainWatchlist entry)
    {
        return new DomainWatchlistDto
        {
            Id = entry.Id,
            Domain = entry.Domain,
            Description = entry.Description,
            Status = entry.Status,
            RiskLevel = entry.RiskLevel,
            Tags = ParseJsonArray(entry.Tags),
            Notes = entry.Notes,
            AddedByUserId = entry.AddedByUserId,
            AddedByUsername = entry.AddedByUser?.Username,
            CountryCode = entry.CountryCode,
            DetectionCount = entry.DetectionCount,
            LastSeenAt = entry.LastSeenAt,
            CreatedAt = entry.CreatedAt,
            UpdatedAt = entry.UpdatedAt
        };
    }

    private List<string> ParseJsonArray(string? json)
    {
        if (string.IsNullOrEmpty(json))
            return new List<string>();

        try
        {
            return JsonSerializer.Deserialize<List<string>>(json) ?? new List<string>();
        }
        catch
        {
            return new List<string>();
        }
    }
}

// DTOs
public record DnsLookupRequest
{
    public string Domain { get; init; } = string.Empty;
}

public record ExtractDomainsRequest
{
    public string Text { get; init; } = string.Empty;
}

public record DnsLookupDto
{
    public int Id { get; init; }
    public string Domain { get; init; } = string.Empty;
    public List<string> ARecords { get; init; } = new();
    public List<string> MxRecords { get; init; } = new();
    public List<string> TxtRecords { get; init; } = new();
    public List<string> NsRecords { get; init; } = new();
    public string? WhoisRegistrar { get; init; }
    public DateTime? WhoisCreatedDate { get; init; }
    public DateTime? WhoisExpirationDate { get; init; }
    public string? WhoisOrganization { get; init; }
    public string? WhoisCountry { get; init; }
    public string? IpAddress { get; init; }
    public string? IpCountry { get; init; }
    public string? IpCity { get; init; }
    public string? IpIsp { get; init; }
    public int RiskScore { get; init; }
    public List<string> RiskFactors { get; init; } = new();
    public bool IsSuspicious { get; init; }
    public DateTime LookedUpAt { get; init; }
}

public record DomainWatchlistDto
{
    public int Id { get; init; }
    public string Domain { get; init; } = string.Empty;
    public string? Description { get; init; }
    public string Status { get; init; } = string.Empty;
    public int RiskLevel { get; init; }
    public List<string> Tags { get; init; } = new();
    public string? Notes { get; init; }
    public Guid AddedByUserId { get; init; }
    public string? AddedByUsername { get; init; }
    public string? CountryCode { get; init; }
    public int DetectionCount { get; init; }
    public DateTime? LastSeenAt { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime? UpdatedAt { get; init; }
}
