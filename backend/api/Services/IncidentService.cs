using System.Text.Json;
using AUSentinel.Api.Data;
using AUSentinel.Api.Data.Entities;
using AUSentinel.Api.Hubs;
using AUSentinel.Api.Models;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace AUSentinel.Api.Services;

public interface IIncidentService
{
    Task<IncidentListResult> ListAsync(IncidentListRequest request, string? countryScope, bool isAdmin);
    Task<IncidentDto?> GetAsync(Guid id);
    Task<IncidentDto> CreateAsync(Guid userId, CreateIncidentRequest request, IFormFile? attachment, IHubContext<IntelHub> hub);
    Task<IncidentDto> UpdateAsync(Guid id, Guid userId, UpdateIncidentRequest request, IFormFile? attachment, IHubContext<IntelHub> hub);
    Task DeleteAsync(Guid id);
    Task<IncidentStatsDto> GetStatsAsync(string? countryScope, bool isAdmin);
}

public class IncidentService : IIncidentService
{
    private readonly AppDbContext _db;
    private readonly IWebHostEnvironment _env;
    private readonly ILogger<IncidentService> _logger;

    public IncidentService(AppDbContext db, IWebHostEnvironment env, ILogger<IncidentService> logger)
    {
        _db = db;
        _env = env;
        _logger = logger;
    }

    public async Task<IncidentListResult> ListAsync(IncidentListRequest request, string? countryScope, bool isAdmin)
    {
        var query = _db.Incidents
            .Include(i => i.ReportedByUser)
            .Include(i => i.AssignedToUser)
            .Include(i => i.Country)
            .AsQueryable();

        if (!isAdmin && !string.IsNullOrEmpty(countryScope))
            query = query.Where(i => i.CountryCode == countryScope);

        if (!string.IsNullOrEmpty(request.CountryCode))
            query = query.Where(i => i.CountryCode == request.CountryCode);

        if (!string.IsNullOrEmpty(request.Status))
            query = query.Where(i => i.Status == request.Status);

        if (!string.IsNullOrEmpty(request.Severity))
            query = query.Where(i => i.Severity == request.Severity);

        if (!string.IsNullOrEmpty(request.Sector))
            query = query.Where(i => i.Sector == request.Sector);

        if (!string.IsNullOrEmpty(request.Query))
            query = query.Where(i => EF.Functions.Like(i.Title, $"%{request.Query}%") ||
                                     EF.Functions.Like(i.Description, $"%{request.Query}%"));

        var total = await query.CountAsync();
        var openCount = await query.CountAsync(i => i.Status == "open");
        var investigatingCount = await query.CountAsync(i => i.Status == "investigating" || i.Status == "contained");
        var resolvedCount = await query.CountAsync(i => i.Status == "resolved" || i.Status == "closed");

        var entities = await query
            .OrderByDescending(i => i.CreatedAt)
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync();

        var items = entities.Select(MapToDto).ToList();

        return new IncidentListResult(items, total, openCount, investigatingCount, resolvedCount);
    }

    public async Task<IncidentDto?> GetAsync(Guid id)
    {
        var incident = await _db.Incidents
            .Include(i => i.ReportedByUser)
            .Include(i => i.AssignedToUser)
            .Include(i => i.Country)
            .FirstOrDefaultAsync(i => i.Id == id);

        return incident == null ? null : MapToDto(incident);
    }

    public async Task<IncidentDto> CreateAsync(Guid userId, CreateIncidentRequest request, IFormFile? attachment, IHubContext<IntelHub> hub)
    {
        var incident = new Incident
        {
            Title = request.Title,
            Description = request.Description,
            Severity = request.Severity,
            Sector = request.Sector,
            IncidentType = request.IncidentType,
            CountryCode = request.CountryCode,
            Source = request.Source,
            AffectedSystems = JsonSerializer.Serialize(request.AffectedSystems),
            Iocs = JsonSerializer.Serialize(request.Iocs),
            ReportedByUserId = userId,
            Status = "open"
        };

        if (attachment != null)
        {
            var (path, name) = await SaveAttachmentAsync(attachment, incident.Id);
            incident.AttachmentPath = path;
            incident.AttachmentName = name;
            incident.AttachmentContentType = attachment.ContentType;
        }

        _db.Incidents.Add(incident);
        await _db.SaveChangesAsync();

        await hub.Clients.All.SendAsync("IncidentCreated", new
        {
            incidentId = incident.Id,
            title = incident.Title,
            severity = incident.Severity,
            sector = incident.Sector,
            countryCode = incident.CountryCode
        });

        return (await GetAsync(incident.Id))!;
    }

    public async Task<IncidentDto> UpdateAsync(Guid id, Guid userId, UpdateIncidentRequest request, IFormFile? attachment, IHubContext<IntelHub> hub)
    {
        var incident = await _db.Incidents.FindAsync(id)
            ?? throw new KeyNotFoundException("Incident not found.");

        if (request.Title != null) incident.Title = request.Title;
        if (request.Description != null) incident.Description = request.Description;
        if (request.Severity != null) incident.Severity = request.Severity;
        if (request.Status != null)
        {
            incident.Status = request.Status;
            if (request.Status is "resolved" or "closed")
                incident.ResolvedAt = DateTime.UtcNow;
        }
        if (request.Sector != null) incident.Sector = request.Sector;
        if (request.IncidentType != null) incident.IncidentType = request.IncidentType;
        if (request.Source != null) incident.Source = request.Source;
        if (request.AffectedSystems != null) incident.AffectedSystems = JsonSerializer.Serialize(request.AffectedSystems);
        if (request.Iocs != null) incident.Iocs = JsonSerializer.Serialize(request.Iocs);
        if (request.ContainmentPercent.HasValue) incident.ContainmentPercent = request.ContainmentPercent.Value;
        if (request.AssignedToUserId != null && Guid.TryParse(request.AssignedToUserId, out var assignedId))
            incident.AssignedToUserId = assignedId;

        if (attachment != null)
        {
            var (path, name) = await SaveAttachmentAsync(attachment, incident.Id);
            incident.AttachmentPath = path;
            incident.AttachmentName = name;
            incident.AttachmentContentType = attachment.ContentType;
        }

        incident.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        await hub.Clients.All.SendAsync("IncidentUpdated", new
        {
            incidentId = incident.Id,
            title = incident.Title,
            status = incident.Status
        });

        return (await GetAsync(id))!;
    }

    public async Task DeleteAsync(Guid id)
    {
        var incident = await _db.Incidents.FindAsync(id)
            ?? throw new KeyNotFoundException("Incident not found.");

        _db.Incidents.Remove(incident);
        await _db.SaveChangesAsync();
    }

    public async Task<IncidentStatsDto> GetStatsAsync(string? countryScope, bool isAdmin)
    {
        var query = _db.Incidents.AsQueryable();
        if (!isAdmin && !string.IsNullOrEmpty(countryScope))
            query = query.Where(i => i.CountryCode == countryScope);

        var total = await query.CountAsync();
        var open = await query.CountAsync(i => i.Status == "open");
        var investigating = await query.CountAsync(i => i.Status == "investigating");
        var contained = await query.CountAsync(i => i.Status == "contained");
        var resolved = await query.CountAsync(i => i.Status == "resolved" || i.Status == "closed");

        var bySector = await query.GroupBy(i => i.Sector)
            .Select(g => new SectorCount(g.Key, g.Count()))
            .OrderByDescending(x => x.Count)
            .ToListAsync();

        var bySeverity = await query.GroupBy(i => i.Severity)
            .Select(g => new SectorCount(g.Key, g.Count()))
            .OrderByDescending(x => x.Count)
            .ToListAsync();

        var byType = await query.GroupBy(i => i.IncidentType)
            .Select(g => new SectorCount(g.Key, g.Count()))
            .OrderByDescending(x => x.Count)
            .ToListAsync();

        return new IncidentStatsDto(total, open, investigating, contained, resolved, bySector, bySeverity, byType);
    }

    private async Task<(string path, string name)> SaveAttachmentAsync(IFormFile file, Guid incidentId)
    {
        var uploadsDir = Path.Combine(_env.ContentRootPath, "uploads", "incidents");
        Directory.CreateDirectory(uploadsDir);

        var ext = Path.GetExtension(file.FileName);
        var fileName = $"{incidentId}{ext}";
        var filePath = Path.Combine(uploadsDir, fileName);

        await using var stream = File.Create(filePath);
        await file.CopyToAsync(stream);

        return ($"/uploads/incidents/{fileName}", file.FileName);
    }

    private static IncidentDto MapToDto(Incident i)
    {
        var affectedSystems = TryDeserialize<List<string>>(i.AffectedSystems) ?? new();
        var iocs = TryDeserialize<List<string>>(i.Iocs) ?? new();

        return new IncidentDto(
            i.Id, i.Title, i.Description, i.Severity, i.Status,
            i.Sector, i.IncidentType, i.CountryCode,
            i.Country?.Name ?? i.CountryCode,
            i.Source,
            affectedSystems, iocs,
            i.AttachmentName, i.AttachmentPath,
            i.ContainmentPercent,
            i.ReportedByUserId,
            i.ReportedByUser?.FullName ?? "",
            i.AssignedToUserId,
            i.AssignedToUser?.FullName,
            i.CreatedAt, i.UpdatedAt, i.ResolvedAt
        );
    }

    private static T? TryDeserialize<T>(string json)
    {
        try { return JsonSerializer.Deserialize<T>(json); }
        catch { return default; }
    }
}
