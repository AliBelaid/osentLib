using AUSentinel.Api.Data;
using AUSentinel.Api.Data.Entities;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace AUSentinel.Api.Services;

public interface IDomainWatchlistService
{
    Task<DomainWatchlist> AddToWatchlistAsync(CreateWatchlistEntryRequest request, Guid userId);
    Task<DomainWatchlist?> GetWatchlistEntryAsync(int id);
    Task<DomainWatchlist?> GetByDomainAsync(string domain);
    Task<List<DomainWatchlist>> GetAllWatchlistsAsync(string? status = null, string? countryCode = null);
    Task<DomainWatchlist> UpdateWatchlistAsync(int id, UpdateWatchlistEntryRequest request);
    Task DeleteWatchlistAsync(int id);
    Task<bool> IsDomainBlockedAsync(string domain);
    Task IncrementDetectionCountAsync(string domain);
}

public class DomainWatchlistService : IDomainWatchlistService
{
    private readonly AppDbContext _db;
    private readonly ILogger<DomainWatchlistService> _logger;

    public DomainWatchlistService(AppDbContext db, ILogger<DomainWatchlistService> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task<DomainWatchlist> AddToWatchlistAsync(CreateWatchlistEntryRequest request, Guid userId)
    {
        // Check if domain already exists
        var existing = await _db.DomainWatchlists.FirstOrDefaultAsync(dw => dw.Domain == request.Domain);
        if (existing != null)
        {
            throw new InvalidOperationException($"Domain {request.Domain} is already in the watchlist");
        }

        var entry = new DomainWatchlist
        {
            Domain = request.Domain,
            Description = request.Description,
            Status = request.Status ?? "Monitor",
            RiskLevel = request.RiskLevel,
            Tags = request.Tags != null && request.Tags.Any()
                ? JsonSerializer.Serialize(request.Tags)
                : null,
            Notes = request.Notes,
            AddedByUserId = userId,
            CountryCode = request.CountryCode,
            DetectionCount = 0,
            CreatedAt = DateTime.UtcNow
        };

        _db.DomainWatchlists.Add(entry);
        await _db.SaveChangesAsync();

        _logger.LogInformation("Domain {Domain} added to watchlist by user {UserId}", request.Domain, userId);

        return entry;
    }

    public async Task<DomainWatchlist?> GetWatchlistEntryAsync(int id)
    {
        return await _db.DomainWatchlists
            .Include(dw => dw.AddedByUser)
            .Include(dw => dw.Country)
            .FirstOrDefaultAsync(dw => dw.Id == id);
    }

    public async Task<DomainWatchlist?> GetByDomainAsync(string domain)
    {
        return await _db.DomainWatchlists
            .Include(dw => dw.AddedByUser)
            .FirstOrDefaultAsync(dw => dw.Domain == domain);
    }

    public async Task<List<DomainWatchlist>> GetAllWatchlistsAsync(string? status = null, string? countryCode = null)
    {
        var query = _db.DomainWatchlists
            .Include(dw => dw.AddedByUser)
            .Include(dw => dw.Country)
            .AsQueryable();

        if (!string.IsNullOrEmpty(status))
        {
            query = query.Where(dw => dw.Status == status);
        }

        if (!string.IsNullOrEmpty(countryCode))
        {
            query = query.Where(dw => dw.CountryCode == countryCode);
        }

        return await query
            .OrderByDescending(dw => dw.CreatedAt)
            .ToListAsync();
    }

    public async Task<DomainWatchlist> UpdateWatchlistAsync(int id, UpdateWatchlistEntryRequest request)
    {
        var entry = await _db.DomainWatchlists.FindAsync(id);
        if (entry == null)
        {
            throw new InvalidOperationException($"Watchlist entry {id} not found");
        }

        if (request.Description != null)
            entry.Description = request.Description;

        if (request.Status != null)
            entry.Status = request.Status;

        if (request.RiskLevel.HasValue)
            entry.RiskLevel = request.RiskLevel.Value;

        if (request.Tags != null)
            entry.Tags = request.Tags.Any() ? JsonSerializer.Serialize(request.Tags) : null;

        if (request.Notes != null)
            entry.Notes = request.Notes;

        entry.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        _logger.LogInformation("Watchlist entry {Id} for domain {Domain} updated", id, entry.Domain);

        return entry;
    }

    public async Task DeleteWatchlistAsync(int id)
    {
        var entry = await _db.DomainWatchlists.FindAsync(id);
        if (entry == null)
        {
            throw new InvalidOperationException($"Watchlist entry {id} not found");
        }

        _db.DomainWatchlists.Remove(entry);
        await _db.SaveChangesAsync();

        _logger.LogInformation("Watchlist entry {Id} for domain {Domain} deleted", id, entry.Domain);
    }

    public async Task<bool> IsDomainBlockedAsync(string domain)
    {
        var entry = await _db.DomainWatchlists
            .FirstOrDefaultAsync(dw => dw.Domain == domain && dw.Status == "Blocked");

        return entry != null;
    }

    public async Task IncrementDetectionCountAsync(string domain)
    {
        var entry = await _db.DomainWatchlists.FirstOrDefaultAsync(dw => dw.Domain == domain);
        if (entry != null)
        {
            entry.DetectionCount++;
            entry.LastSeenAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            _logger.LogInformation("Detection count incremented for domain {Domain}", domain);
        }
    }
}

// Request Models
public record CreateWatchlistEntryRequest
{
    public string Domain { get; init; } = string.Empty;
    public string? Description { get; init; }
    public string? Status { get; init; }
    public int RiskLevel { get; init; }
    public List<string>? Tags { get; init; }
    public string? Notes { get; init; }
    public string? CountryCode { get; init; }
}

public record UpdateWatchlistEntryRequest
{
    public string? Description { get; init; }
    public string? Status { get; init; }
    public int? RiskLevel { get; init; }
    public List<string>? Tags { get; init; }
    public string? Notes { get; init; }
}
