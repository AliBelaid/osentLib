using AUSentinel.Api.Data;
using AUSentinel.Api.Data.Entities;
using AUSentinel.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace AUSentinel.Api.Services;

public interface ISourceService
{
    Task<List<SourceDto>> ListAsync();
    Task<SourceDto> CreateAsync(CreateSourceRequest request);
    Task<SourceDto> ToggleAsync(int id);
    Task DeleteAsync(int id);
}

public class SourceService : ISourceService
{
    private readonly AppDbContext _db;

    public SourceService(AppDbContext db) => _db = db;

    public async Task<List<SourceDto>> ListAsync()
    {
        var sources = await _db.Sources.OrderBy(s => s.Name).ToListAsync();
        return sources.Select(MapToDto).ToList();
    }

    public async Task<SourceDto> CreateAsync(CreateSourceRequest request)
    {
        var source = new Source
        {
            Type = request.Type,
            Name = request.Name,
            Url = request.Url,
            CountryCode = request.CountryCode,
            Language = request.Language,
            FetchIntervalMinutes = request.FetchIntervalMinutes,
            IsActive = true
        };

        _db.Sources.Add(source);
        await _db.SaveChangesAsync();

        return MapToDto(source);
    }

    public async Task<SourceDto> ToggleAsync(int id)
    {
        var source = await _db.Sources.FindAsync(id)
            ?? throw new KeyNotFoundException("Source not found.");

        source.IsActive = !source.IsActive;
        await _db.SaveChangesAsync();

        return MapToDto(source);
    }

    public async Task DeleteAsync(int id)
    {
        var source = await _db.Sources.FindAsync(id)
            ?? throw new KeyNotFoundException("Source not found.");

        _db.Sources.Remove(source);
        await _db.SaveChangesAsync();
    }

    private static SourceDto MapToDto(Source s) => new(
        s.Id, s.Type, s.Name, s.Url, s.CountryCode,
        s.Language, s.IsActive, s.FetchIntervalMinutes, s.LastFetchedAt
    );
}
