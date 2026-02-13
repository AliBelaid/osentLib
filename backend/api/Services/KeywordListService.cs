using AUSentinel.Api.Data;
using AUSentinel.Api.Data.Entities;
using AUSentinel.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace AUSentinel.Api.Services;

public class KeywordListService : IKeywordListService
{
    private readonly AppDbContext _db;

    public KeywordListService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<List<KeywordListDto>> ListAsync(Guid userId, bool includePublic = false)
    {
        var query = _db.KeywordLists.AsQueryable();

        if (includePublic)
        {
            query = query.Where(kl => kl.UserId == userId || kl.IsPublic);
        }
        else
        {
            query = query.Where(kl => kl.UserId == userId);
        }

        var lists = await query
            .OrderByDescending(kl => kl.CreatedAt)
            .ToListAsync();

        return lists.Select(MapToDto).ToList();
    }

    public async Task<KeywordListDto> GetAsync(int id, Guid userId)
    {
        var list = await _db.KeywordLists
            .FirstOrDefaultAsync(kl => kl.Id == id && (kl.UserId == userId || kl.IsPublic))
            ?? throw new KeyNotFoundException("Keyword list not found");

        return MapToDto(list);
    }

    public async Task<KeywordListDto> CreateAsync(Guid userId, CreateKeywordListRequest request)
    {
        var list = new KeywordList
        {
            UserId = userId,
            Name = request.Name,
            Description = request.Description,
            Keywords = string.Join(", ", request.Keywords),
            Category = request.Category ?? "general",
            IsPublic = request.IsPublic ?? false,
            UsageCount = 0,
            CreatedAt = DateTime.UtcNow
        };

        _db.KeywordLists.Add(list);
        await _db.SaveChangesAsync();

        return MapToDto(list);
    }

    public async Task<KeywordListDto> UpdateAsync(int id, Guid userId, UpdateKeywordListRequest request)
    {
        var list = await _db.KeywordLists
            .FirstOrDefaultAsync(kl => kl.Id == id && kl.UserId == userId)
            ?? throw new KeyNotFoundException("Keyword list not found");

        if (request.Name != null) list.Name = request.Name;
        if (request.Description != null) list.Description = request.Description;
        if (request.Keywords != null) list.Keywords = string.Join(", ", request.Keywords);
        if (request.Category != null) list.Category = request.Category;
        if (request.IsPublic.HasValue) list.IsPublic = request.IsPublic.Value;

        list.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        return MapToDto(list);
    }

    public async Task DeleteAsync(int id, Guid userId)
    {
        var list = await _db.KeywordLists
            .FirstOrDefaultAsync(kl => kl.Id == id && kl.UserId == userId)
            ?? throw new KeyNotFoundException("Keyword list not found");

        _db.KeywordLists.Remove(list);
        await _db.SaveChangesAsync();
    }

    public async Task<KeywordListDto> IncrementUsageAsync(int id, Guid userId)
    {
        var list = await _db.KeywordLists
            .FirstOrDefaultAsync(kl => kl.Id == id && (kl.UserId == userId || kl.IsPublic))
            ?? throw new KeyNotFoundException("Keyword list not found");

        list.UsageCount++;
        await _db.SaveChangesAsync();

        return MapToDto(list);
    }

    private static KeywordListDto MapToDto(KeywordList list)
    {
        return new KeywordListDto(
            list.Id,
            list.UserId,
            list.Name,
            list.Description,
            list.GetKeywordsList(),
            list.Category,
            list.IsPublic,
            list.UsageCount,
            list.CreatedAt,
            list.UpdatedAt
        );
    }
}
