using AUSentinel.Api.Data;
using AUSentinel.Api.Data.Entities;
using AUSentinel.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace AUSentinel.Api.Services;

public interface IBulletinService
{
    Task<List<BulletinDto>> ListAsync(string? countryCode, bool isAUAdmin);
    Task<BulletinDto> GetAsync(Guid id);
    Task<BulletinDto> CreateAsync(Guid userId, string countryCode, CreateBulletinRequest request);
    Task<BulletinDto> UpdateAsync(Guid id, Guid userId, UpdateBulletinRequest request);
    Task<BulletinDto> SubmitForReviewAsync(Guid id, Guid userId);
    Task<BulletinDto> PublishAsync(Guid id, Guid userId);
    Task DeleteAsync(Guid id);
}

public class BulletinService : IBulletinService
{
    private readonly AppDbContext _db;
    private readonly IExperienceService _experienceService;

    public BulletinService(AppDbContext db, IExperienceService experienceService)
    {
        _db = db;
        _experienceService = experienceService;
    }

    public async Task<List<BulletinDto>> ListAsync(string? countryCode, bool isAUAdmin)
    {
        var query = _db.Bulletins
            .Include(b => b.CreatedByUser)
            .Include(b => b.PublishedByUser)
            .Include(b => b.Attachments)
            .AsQueryable();

        if (!isAUAdmin && !string.IsNullOrEmpty(countryCode))
            query = query.Where(b => b.CountryCode == countryCode);

        var bulletins = await query.OrderByDescending(b => b.CreatedAt).ToListAsync();

        return bulletins.Select(MapToDto).ToList();
    }

    public async Task<BulletinDto> GetAsync(Guid id)
    {
        var b = await _db.Bulletins
            .Include(b => b.CreatedByUser)
            .Include(b => b.PublishedByUser)
            .Include(b => b.Attachments)
            .FirstOrDefaultAsync(b => b.Id == id)
            ?? throw new KeyNotFoundException("Bulletin not found.");

        return MapToDto(b);
    }

    public async Task<BulletinDto> CreateAsync(Guid userId, string countryCode, CreateBulletinRequest request)
    {
        var bulletin = new Bulletin
        {
            Title = request.Title,
            Content = request.Content,
            CountryCode = countryCode,
            Severity = request.Severity,
            Category = request.Category,
            CreatedByUserId = userId,
            Status = "draft"
        };

        _db.Bulletins.Add(bulletin);
        await _db.SaveChangesAsync();

        // Award XP for creating bulletin
        await _experienceService.AwardXpAsync(
            userId,
            "bulletin_create",
            ExperienceService.GetXpForActivity("bulletin_create"),
            "Bulletin",
            bulletin.Id
        );

        return await GetAsync(bulletin.Id);
    }

    public async Task<BulletinDto> UpdateAsync(Guid id, Guid userId, UpdateBulletinRequest request)
    {
        var b = await _db.Bulletins.FindAsync(id)
            ?? throw new KeyNotFoundException("Bulletin not found.");

        if (b.Status == "published")
            throw new InvalidOperationException("Cannot edit a published bulletin.");

        if (request.Title != null) b.Title = request.Title;
        if (request.Content != null) b.Content = request.Content;
        if (request.Severity.HasValue) b.Severity = request.Severity.Value;
        if (request.Category != null) b.Category = request.Category;
        b.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return await GetAsync(id);
    }

    public async Task<BulletinDto> SubmitForReviewAsync(Guid id, Guid userId)
    {
        var b = await _db.Bulletins.FindAsync(id)
            ?? throw new KeyNotFoundException("Bulletin not found.");

        if (b.Status != "draft")
            throw new InvalidOperationException("Only draft bulletins can be submitted for review.");

        b.Status = "review";
        b.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return await GetAsync(id);
    }

    public async Task<BulletinDto> PublishAsync(Guid id, Guid userId)
    {
        var b = await _db.Bulletins.FindAsync(id)
            ?? throw new KeyNotFoundException("Bulletin not found.");

        if (b.Status != "review")
            throw new InvalidOperationException("Only bulletins in review can be published.");

        b.Status = "published";
        b.PublishedByUserId = userId;
        b.PublishedAt = DateTime.UtcNow;
        b.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        // Award XP for publishing bulletin
        await _experienceService.AwardXpAsync(
            userId,
            "bulletin_publish",
            ExperienceService.GetXpForActivity("bulletin_publish"),
            "Bulletin",
            id
        );

        return await GetAsync(id);
    }

    public async Task DeleteAsync(Guid id)
    {
        var b = await _db.Bulletins.FindAsync(id)
            ?? throw new KeyNotFoundException("Bulletin not found.");

        _db.Bulletins.Remove(b);
        await _db.SaveChangesAsync();
    }

    private static BulletinDto MapToDto(Bulletin b) => new(
        b.Id, b.Title, b.Content, b.CountryCode, b.Status,
        b.Severity, b.Category,
        b.CreatedByUserId,
        b.CreatedByUser?.FullName ?? "",
        b.PublishedByUser?.FullName, b.CreatedAt, b.PublishedAt,
        b.Attachments?.Select(a => new BulletinAttachmentDto(
            a.Id, a.FileName, a.StoragePath, a.ContentType, a.SizeBytes, a.UploadedAt
        )).ToList()
    );
}
