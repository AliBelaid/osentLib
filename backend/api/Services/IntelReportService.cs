using AUSentinel.Api.Data;
using AUSentinel.Api.Data.Entities;
using AUSentinel.Api.Hubs;
using AUSentinel.Api.Models;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace AUSentinel.Api.Services;

public interface IIntelReportService
{
    Task<IntelReportListResult> ListAsync(int page, int pageSize, string? status, string? type, string? countryCode, bool isAUAdmin);
    Task<IntelReportListResult> ListMyAsync(Guid userId, int page, int pageSize);
    Task<IntelReportDto> GetAsync(Guid id);
    Task<IntelReportDto> CreateAsync(Guid userId, string countryCode, CreateIntelReportRequest request);
    Task<IntelReportDto> UpdateAsync(Guid id, Guid userId, UpdateIntelReportRequest request);
    Task<IntelReportDto> UpdateStatusAsync(Guid id, Guid userId, UpdateIntelReportStatusRequest request);
    Task DeleteAsync(Guid id);

    Task<IntelReportAttachmentDto> AddAttachmentAsync(Guid reportId, string fileName, string contentType, long size, Stream fileStream);
    Task DeleteAttachmentAsync(Guid reportId, int attachmentId);
    Task<(Stream Stream, string FileName, string ContentType)?> DownloadAttachmentAsync(Guid reportId, int attachmentId);

    Task<List<IntelTimelineEntryDto>> GetTimelineAsync(Guid reportId);
    Task<IntelTimelineEntryDto> AddTimelineEntryAsync(Guid reportId, Guid userId, CreateTimelineEntryRequest request);
    Task<IntelTimelineAttachmentDto> AddTimelineAttachmentAsync(Guid reportId, int entryId, string fileName, string contentType, long size, Stream fileStream);

    Task<List<IntelReportLinkDto>> GetLinksAsync(Guid reportId);
    Task<IntelReportLinkDto> CreateLinkAsync(Guid reportId, Guid userId, CreateIntelReportLinkRequest request);
    Task DeleteLinkAsync(Guid reportId, int linkId);
}

public class IntelReportService : IIntelReportService
{
    private readonly AppDbContext _db;
    private readonly IExperienceService _experienceService;
    private readonly IHubContext<IntelHub> _hub;

    public IntelReportService(AppDbContext db, IExperienceService experienceService, IHubContext<IntelHub> hub)
    {
        _db = db;
        _experienceService = experienceService;
        _hub = hub;
    }

    public async Task<IntelReportListResult> ListAsync(int page, int pageSize, string? status, string? type, string? countryCode, bool isAUAdmin)
    {
        var query = _db.IntelReports
            .Include(r => r.CreatedByUser)
            .Include(r => r.AffectedCountries)
            .Include(r => r.Attachments)
            .Include(r => r.TimelineEntries)
            .AsQueryable();

        if (!isAUAdmin && !string.IsNullOrEmpty(countryCode))
        {
            query = query.Where(r => r.CountryCode == countryCode
                || r.AffectedCountries.Any(ac => ac.CountryCode == countryCode));
        }

        if (!string.IsNullOrEmpty(status))
            query = query.Where(r => r.Status == status);

        if (!string.IsNullOrEmpty(type))
            query = query.Where(r => r.Type == type);

        var total = await query.CountAsync();
        var items = await query
            .OrderByDescending(r => r.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return new IntelReportListResult(
            items.Select(MapToSummary).ToList(),
            total,
            page,
            pageSize
        );
    }

    public async Task<IntelReportListResult> ListMyAsync(Guid userId, int page, int pageSize)
    {
        var query = _db.IntelReports
            .Include(r => r.CreatedByUser)
            .Include(r => r.AffectedCountries)
            .Include(r => r.Attachments)
            .Include(r => r.TimelineEntries)
            .Where(r => r.CreatedByUserId == userId);

        var total = await query.CountAsync();
        var items = await query
            .OrderByDescending(r => r.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return new IntelReportListResult(
            items.Select(MapToSummary).ToList(),
            total,
            page,
            pageSize
        );
    }

    public async Task<IntelReportDto> GetAsync(Guid id)
    {
        var r = await _db.IntelReports
            .Include(r => r.CreatedByUser)
            .Include(r => r.AffectedCountries)
            .Include(r => r.Attachments)
            .Include(r => r.TimelineEntries)
            .FirstOrDefaultAsync(r => r.Id == id)
            ?? throw new KeyNotFoundException("Intelligence report not found.");

        return MapToDto(r);
    }

    public async Task<IntelReportDto> CreateAsync(Guid userId, string countryCode, CreateIntelReportRequest request)
    {
        var report = new IntelReport
        {
            Title = request.Title,
            Content = request.Content,
            Type = request.Type,
            Severity = request.Severity,
            SourceInfo = request.SourceInfo,
            CountryCode = countryCode,
            CreatedByUserId = userId,
            Status = "active"
        };

        _db.IntelReports.Add(report);
        await _db.SaveChangesAsync();

        // Add affected countries
        if (request.AffectedCountryCodes?.Any() == true)
        {
            foreach (var cc in request.AffectedCountryCodes.Distinct())
            {
                _db.IntelReportCountries.Add(new IntelReportCountry
                {
                    IntelReportId = report.Id,
                    CountryCode = cc
                });
            }
            await _db.SaveChangesAsync();
        }

        // Auto-create creation timeline entry
        var user = await _db.Users.FindAsync(userId);
        _db.IntelTimelineEntries.Add(new IntelTimelineEntry
        {
            IntelReportId = report.Id,
            UserId = userId,
            Content = $"Report created by {user?.FullName ?? "Unknown"}",
            EntryType = "creation"
        });
        await _db.SaveChangesAsync();

        // Award XP
        await _experienceService.AwardXpAsync(
            userId,
            "intel_report_create",
            ExperienceService.GetXpForActivity("intel_report_create"),
            "IntelReport",
            report.Id
        );

        var result = await GetAsync(report.Id);

        // Notify all connected clients — only once, after all saves are complete
        await NotifyIntelChange("IntelReportCreated", report.Id, report.CountryCode,
            report.AffectedCountries.Select(ac => ac.CountryCode).ToList());

        return result;
    }

    public async Task<IntelReportDto> UpdateAsync(Guid id, Guid userId, UpdateIntelReportRequest request)
    {
        var r = await _db.IntelReports
            .Include(r => r.AffectedCountries)
            .FirstOrDefaultAsync(r => r.Id == id)
            ?? throw new KeyNotFoundException("Intelligence report not found.");

        if (request.Title != null) r.Title = request.Title;
        if (request.Content != null) r.Content = request.Content;
        if (request.Type != null) r.Type = request.Type;
        if (request.Severity.HasValue) r.Severity = request.Severity.Value;
        if (request.SourceInfo != null) r.SourceInfo = request.SourceInfo;
        r.UpdatedAt = DateTime.UtcNow;

        // Update affected countries if provided
        if (request.AffectedCountryCodes != null)
        {
            _db.IntelReportCountries.RemoveRange(r.AffectedCountries);
            foreach (var cc in request.AffectedCountryCodes.Distinct())
            {
                _db.IntelReportCountries.Add(new IntelReportCountry
                {
                    IntelReportId = r.Id,
                    CountryCode = cc
                });
            }
        }

        await _db.SaveChangesAsync();

        var updatedCountryCodes = r.AffectedCountries.Select(ac => ac.CountryCode).ToList();
        await NotifyIntelChange("IntelReportUpdated", id, r.CountryCode, updatedCountryCodes);

        return await GetAsync(id);
    }

    public async Task<IntelReportDto> UpdateStatusAsync(Guid id, Guid userId, UpdateIntelReportStatusRequest request)
    {
        var r = await _db.IntelReports.FindAsync(id)
            ?? throw new KeyNotFoundException("Intelligence report not found.");

        var oldStatus = r.Status;
        r.Status = request.Status;
        r.UpdatedAt = DateTime.UtcNow;

        if (request.Status == "closed")
            r.ClosedAt = DateTime.UtcNow;
        else if (request.Status == "active")
            r.ClosedAt = null;

        // Auto-create status_change timeline entry
        var user = await _db.Users.FindAsync(userId);
        _db.IntelTimelineEntries.Add(new IntelTimelineEntry
        {
            IntelReportId = r.Id,
            UserId = userId,
            Content = $"Status changed from {oldStatus} to {request.Status} by {user?.FullName ?? "Unknown"}",
            EntryType = "status_change"
        });

        await _db.SaveChangesAsync();
        await NotifyIntelChange("IntelReportUpdated", id, r.CountryCode, []);
        return await GetAsync(id);
    }

    public async Task DeleteAsync(Guid id)
    {
        var r = await _db.IntelReports
            .Include(r => r.AffectedCountries)
            .Include(r => r.Attachments)
            .Include(r => r.TimelineEntries).ThenInclude(te => te.Attachments)
            .Include(r => r.SourceLinks)
            .Include(r => r.TargetLinks)
            .FirstOrDefaultAsync(r => r.Id == id)
            ?? throw new KeyNotFoundException("Intelligence report not found.");

        // Remove child entities
        foreach (var te in r.TimelineEntries)
            _db.IntelTimelineAttachments.RemoveRange(te.Attachments);
        _db.IntelTimelineEntries.RemoveRange(r.TimelineEntries);
        _db.IntelReportAttachments.RemoveRange(r.Attachments);
        _db.IntelReportCountries.RemoveRange(r.AffectedCountries);
        _db.IntelReportLinks.RemoveRange(r.SourceLinks);
        _db.IntelReportLinks.RemoveRange(r.TargetLinks);
        var countryCode = r.CountryCode;
        var affectedCodes = r.AffectedCountries.Select(ac => ac.CountryCode).ToList();

        _db.IntelReports.Remove(r);
        await _db.SaveChangesAsync();

        await NotifyIntelChange("IntelReportDeleted", id, countryCode, affectedCodes);
    }

    // --- Attachments ---

    public async Task<IntelReportAttachmentDto> AddAttachmentAsync(Guid reportId, string fileName, string contentType, long size, Stream fileStream)
    {
        _ = await _db.IntelReports.FindAsync(reportId)
            ?? throw new KeyNotFoundException("Intelligence report not found.");

        var uploadsDir = Path.Combine("uploads", "intel-reports", reportId.ToString());
        Directory.CreateDirectory(uploadsDir);

        var storageName = $"{Guid.NewGuid()}{Path.GetExtension(fileName)}";
        var storagePath = Path.Combine(uploadsDir, storageName);

        using (var fs = File.Create(storagePath))
        {
            await fileStream.CopyToAsync(fs);
        }

        var attachment = new IntelReportAttachment
        {
            IntelReportId = reportId,
            FileName = fileName,
            StoragePath = storagePath,
            ContentType = contentType,
            SizeBytes = size
        };

        _db.IntelReportAttachments.Add(attachment);
        await _db.SaveChangesAsync();

        return new IntelReportAttachmentDto(attachment.Id, attachment.FileName, attachment.ContentType, attachment.SizeBytes, attachment.UploadedAt);
    }

    public async Task DeleteAttachmentAsync(Guid reportId, int attachmentId)
    {
        var attachment = await _db.IntelReportAttachments
            .FirstOrDefaultAsync(a => a.Id == attachmentId && a.IntelReportId == reportId)
            ?? throw new KeyNotFoundException("Attachment not found.");

        if (File.Exists(attachment.StoragePath))
            File.Delete(attachment.StoragePath);

        _db.IntelReportAttachments.Remove(attachment);
        await _db.SaveChangesAsync();
    }

    public async Task<(Stream Stream, string FileName, string ContentType)?> DownloadAttachmentAsync(Guid reportId, int attachmentId)
    {
        var attachment = await _db.IntelReportAttachments
            .FirstOrDefaultAsync(a => a.Id == attachmentId && a.IntelReportId == reportId)
            ?? throw new KeyNotFoundException("Attachment not found.");

        if (!File.Exists(attachment.StoragePath))
            return null;

        var stream = File.OpenRead(attachment.StoragePath);
        return (stream, attachment.FileName, attachment.ContentType);
    }

    // --- Timeline ---

    public async Task<List<IntelTimelineEntryDto>> GetTimelineAsync(Guid reportId)
    {
        var entries = await _db.IntelTimelineEntries
            .Include(e => e.User)
            .Include(e => e.Attachments)
            .Where(e => e.IntelReportId == reportId)
            .OrderBy(e => e.CreatedAt)
            .ToListAsync();

        return entries.Select(e => new IntelTimelineEntryDto(
            e.Id,
            e.IntelReportId,
            e.UserId.ToString(),
            e.User?.FullName ?? "Unknown",
            e.Content,
            e.EntryType,
            e.CreatedAt,
            e.Attachments.Select(a => new IntelTimelineAttachmentDto(
                a.Id, a.FileName, a.ContentType, a.SizeBytes, a.UploadedAt
            )).ToList()
        )).ToList();
    }

    public async Task<IntelTimelineEntryDto> AddTimelineEntryAsync(Guid reportId, Guid userId, CreateTimelineEntryRequest request)
    {
        _ = await _db.IntelReports.FindAsync(reportId)
            ?? throw new KeyNotFoundException("Intelligence report not found.");

        var entry = new IntelTimelineEntry
        {
            IntelReportId = reportId,
            UserId = userId,
            Content = request.Content,
            EntryType = "comment"
        };

        _db.IntelTimelineEntries.Add(entry);
        await _db.SaveChangesAsync();

        var user = await _db.Users.FindAsync(userId);
        return new IntelTimelineEntryDto(
            entry.Id, entry.IntelReportId, entry.UserId.ToString(),
            user?.FullName ?? "Unknown", entry.Content, entry.EntryType, entry.CreatedAt,
            new List<IntelTimelineAttachmentDto>()
        );
    }

    public async Task<IntelTimelineAttachmentDto> AddTimelineAttachmentAsync(Guid reportId, int entryId, string fileName, string contentType, long size, Stream fileStream)
    {
        var entry = await _db.IntelTimelineEntries
            .FirstOrDefaultAsync(e => e.Id == entryId && e.IntelReportId == reportId)
            ?? throw new KeyNotFoundException("Timeline entry not found.");

        var uploadsDir = Path.Combine("uploads", "intel-timeline", entryId.ToString());
        Directory.CreateDirectory(uploadsDir);

        var storageName = $"{Guid.NewGuid()}{Path.GetExtension(fileName)}";
        var storagePath = Path.Combine(uploadsDir, storageName);

        using (var fs = File.Create(storagePath))
        {
            await fileStream.CopyToAsync(fs);
        }

        var attachment = new IntelTimelineAttachment
        {
            TimelineEntryId = entryId,
            FileName = fileName,
            StoragePath = storagePath,
            ContentType = contentType,
            SizeBytes = size
        };

        _db.IntelTimelineAttachments.Add(attachment);
        await _db.SaveChangesAsync();

        return new IntelTimelineAttachmentDto(attachment.Id, attachment.FileName, attachment.ContentType, attachment.SizeBytes, attachment.UploadedAt);
    }

    // --- Links ---

    public async Task<List<IntelReportLinkDto>> GetLinksAsync(Guid reportId)
    {
        var links = await _db.IntelReportLinks
            .Include(l => l.SourceReport)
            .Include(l => l.TargetReport)
            .Include(l => l.CreatedByUser)
            .Where(l => l.SourceReportId == reportId || l.TargetReportId == reportId)
            .OrderByDescending(l => l.CreatedAt)
            .ToListAsync();

        return links.Select(l => new IntelReportLinkDto(
            l.Id,
            l.SourceReportId,
            l.SourceReport?.Title ?? "",
            l.TargetReportId,
            l.TargetReport?.Title ?? "",
            l.LinkType,
            l.CreatedByUser?.FullName ?? "",
            l.CreatedAt
        )).ToList();
    }

    public async Task<IntelReportLinkDto> CreateLinkAsync(Guid reportId, Guid userId, CreateIntelReportLinkRequest request)
    {
        _ = await _db.IntelReports.FindAsync(reportId)
            ?? throw new KeyNotFoundException("Source report not found.");
        _ = await _db.IntelReports.FindAsync(request.TargetReportId)
            ?? throw new KeyNotFoundException("Target report not found.");

        var link = new IntelReportLink
        {
            SourceReportId = reportId,
            TargetReportId = request.TargetReportId,
            LinkType = request.LinkType,
            CreatedByUserId = userId
        };

        _db.IntelReportLinks.Add(link);
        await _db.SaveChangesAsync();

        var user = await _db.Users.FindAsync(userId);
        var source = await _db.IntelReports.FindAsync(reportId);
        var target = await _db.IntelReports.FindAsync(request.TargetReportId);

        return new IntelReportLinkDto(
            link.Id,
            link.SourceReportId,
            source?.Title ?? "",
            link.TargetReportId,
            target?.Title ?? "",
            link.LinkType,
            user?.FullName ?? "",
            link.CreatedAt
        );
    }

    public async Task DeleteLinkAsync(Guid reportId, int linkId)
    {
        var link = await _db.IntelReportLinks
            .FirstOrDefaultAsync(l => l.Id == linkId && (l.SourceReportId == reportId || l.TargetReportId == reportId))
            ?? throw new KeyNotFoundException("Link not found.");

        _db.IntelReportLinks.Remove(link);
        await _db.SaveChangesAsync();
    }

    // --- SignalR Notifications ---

    /// <summary>
    /// Sends a change notification to the relevant country groups and AUAdmin.
    /// Called only after a final SaveChangesAsync (create / update / delete).
    /// Never called for interim saves (e.g. affected-countries sub-save during create).
    /// </summary>
    private async Task NotifyIntelChange(string eventName, Guid reportId, string creatorCountry, List<string> affectedCountries)
    {
        var payload = new { reportId };

        // Notify AUAdmin group (sees everything)
        await _hub.Clients.Group("AUAdmin").SendAsync(eventName, payload);

        // Notify creator's country group
        if (!string.IsNullOrEmpty(creatorCountry))
            await _hub.Clients.Group($"country:{creatorCountry}").SendAsync(eventName, payload);

        // Notify each affected country group
        foreach (var cc in affectedCountries.Distinct())
        {
            if (cc != creatorCountry)
                await _hub.Clients.Group($"country:{cc}").SendAsync(eventName, payload);
        }
    }

    // --- Mappers ---

    private static IntelReportDto MapToDto(IntelReport r) => new(
        r.Id, r.Title, r.Content, r.Type, r.Severity, r.Status, r.SourceInfo,
        r.CountryCode, r.CreatedByUserId.ToString(), r.CreatedByUser?.FullName ?? "",
        r.CreatedAt, r.UpdatedAt, r.ClosedAt,
        r.AffectedCountries.Select(ac => ac.CountryCode).ToList(),
        r.Attachments.Select(a => new IntelReportAttachmentDto(
            a.Id, a.FileName, a.ContentType, a.SizeBytes, a.UploadedAt
        )).ToList(),
        r.TimelineEntries.Count
    );

    private static IntelReportSummaryDto MapToSummary(IntelReport r) => new(
        r.Id, r.Title, r.Type, r.Severity, r.Status, r.CountryCode,
        r.CreatedByUser?.FullName ?? "", r.CreatedAt,
        r.TimelineEntries.Count, r.Attachments.Count
    );
}
