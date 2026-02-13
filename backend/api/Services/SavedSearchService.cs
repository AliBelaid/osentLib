using AUSentinel.Api.Data;
using AUSentinel.Api.Data.Entities;
using AUSentinel.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace AUSentinel.Api.Services;

public class SavedSearchService : ISavedSearchService
{
    private readonly AppDbContext _db;

    public SavedSearchService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<List<SavedSearchDto>> ListAsync(Guid userId, bool includePublic = false)
    {
        var query = _db.SavedSearches.AsQueryable();

        if (includePublic)
        {
            query = query.Where(ss => ss.UserId == userId || ss.IsPublic);
        }
        else
        {
            query = query.Where(ss => ss.UserId == userId);
        }

        var searches = await query
            .OrderByDescending(ss => ss.LastExecutedAt)
            .ToListAsync();

        return searches.Select(MapToDto).ToList();
    }

    public async Task<SavedSearchDto> GetAsync(int id, Guid userId)
    {
        var search = await _db.SavedSearches
            .FirstOrDefaultAsync(ss => ss.Id == id && (ss.UserId == userId || ss.IsPublic))
            ?? throw new KeyNotFoundException("Saved search not found");

        return MapToDto(search);
    }

    public async Task<SavedSearchDto> CreateAsync(Guid userId, CreateSavedSearchRequest request)
    {
        var search = new SavedSearch
        {
            UserId = userId,
            Name = request.Name,
            Description = request.Description,
            Query = request.Query,
            Category = request.Category,
            ThreatType = request.ThreatType,
            MinThreatLevel = request.MinThreatLevel,
            CountryCode = request.CountryCode,
            SortBy = request.SortBy,
            IsPublic = request.IsPublic ?? false,
            ExecutionCount = 0,
            LastExecutedAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow
        };

        _db.SavedSearches.Add(search);
        await _db.SaveChangesAsync();

        return MapToDto(search);
    }

    public async Task<SavedSearchDto> UpdateAsync(int id, Guid userId, UpdateSavedSearchRequest request)
    {
        var search = await _db.SavedSearches
            .FirstOrDefaultAsync(ss => ss.Id == id && ss.UserId == userId)
            ?? throw new KeyNotFoundException("Saved search not found");

        if (request.Name != null) search.Name = request.Name;
        if (request.Description != null) search.Description = request.Description;
        if (request.Query != null) search.Query = request.Query;
        if (request.Category != null) search.Category = request.Category;
        if (request.ThreatType != null) search.ThreatType = request.ThreatType;
        if (request.MinThreatLevel.HasValue) search.MinThreatLevel = request.MinThreatLevel;
        if (request.CountryCode != null) search.CountryCode = request.CountryCode;
        if (request.SortBy != null) search.SortBy = request.SortBy;
        if (request.IsPublic.HasValue) search.IsPublic = request.IsPublic.Value;

        search.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        return MapToDto(search);
    }

    public async Task DeleteAsync(int id, Guid userId)
    {
        var search = await _db.SavedSearches
            .FirstOrDefaultAsync(ss => ss.Id == id && ss.UserId == userId)
            ?? throw new KeyNotFoundException("Saved search not found");

        _db.SavedSearches.Remove(search);
        await _db.SaveChangesAsync();
    }

    public async Task<SavedSearchDto> ExecuteAsync(int id, Guid userId)
    {
        var search = await _db.SavedSearches
            .FirstOrDefaultAsync(ss => ss.Id == id && (ss.UserId == userId || ss.IsPublic))
            ?? throw new KeyNotFoundException("Saved search not found");

        // Update execution tracking
        search.ExecutionCount++;
        search.LastExecutedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        return MapToDto(search);
    }

    private static SavedSearchDto MapToDto(SavedSearch search)
    {
        return new SavedSearchDto(
            search.Id,
            search.UserId,
            search.Name,
            search.Description,
            search.Query,
            search.Category,
            search.ThreatType,
            search.MinThreatLevel,
            search.CountryCode,
            search.SortBy,
            search.IsPublic,
            search.ExecutionCount,
            search.LastExecutedAt,
            search.CreatedAt,
            search.UpdatedAt
        );
    }
}
