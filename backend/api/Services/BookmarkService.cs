using AUSentinel.Api.Data;
using AUSentinel.Api.Models;
using Microsoft.EntityFrameworkCore;
using BookmarkEntity = AUSentinel.Api.Data.Entities.Bookmark;
using BookmarkCollectionEntity = AUSentinel.Api.Data.Entities.BookmarkCollection;

namespace AUSentinel.Api.Services;

public interface IBookmarkService
{
    Task<BookmarkDto> AddBookmarkAsync(Guid userId, CreateBookmarkRequest request);
    Task RemoveBookmarkAsync(int bookmarkId, Guid userId);
    Task<BookmarkListResult> ListBookmarksAsync(Guid userId, int? collectionId, int page, int pageSize);
    Task<List<BookmarkCollectionDto>> GetCollectionsAsync(Guid userId);
    Task<BookmarkCollectionDto> CreateCollectionAsync(Guid userId, CreateCollectionRequest request);
    Task<BookmarkCollectionDto> UpdateCollectionAsync(int collectionId, Guid userId, UpdateCollectionRequest request);
    Task DeleteCollectionAsync(int collectionId, Guid userId);
}

public class BookmarkService : IBookmarkService
{
    private readonly AppDbContext _context;
    private readonly IExperienceService _experienceService;

    public BookmarkService(AppDbContext context, IExperienceService experienceService)
    {
        _context = context;
        _experienceService = experienceService;
    }

    public async Task<BookmarkDto> AddBookmarkAsync(Guid userId, CreateBookmarkRequest request)
    {
        // Check if bookmark already exists
        var existing = await _context.Bookmarks
            .FirstOrDefaultAsync(b => b.UserId == userId && b.ArticleId == request.ArticleId);

        if (existing != null)
        {
            // Update existing bookmark
            existing.CollectionId = request.CollectionId;
            existing.Notes = request.Notes;
            await _context.SaveChangesAsync();
            return await MapToDtoAsync(existing);
        }

        // Create new bookmark
        var bookmark = new BookmarkEntity
        {
            UserId = userId,
            ArticleId = request.ArticleId,
            CollectionId = request.CollectionId,
            Notes = request.Notes,
            CreatedAt = DateTime.UtcNow
        };

        _context.Bookmarks.Add(bookmark);
        await _context.SaveChangesAsync();

        // Award XP for bookmarking (only for new bookmarks)
        await _experienceService.AwardXpAsync(
            userId,
            "bookmark",
            ExperienceService.GetXpForActivity("bookmark"),
            "Article",
            request.ArticleId
        );

        return await MapToDtoAsync(bookmark);
    }

    public async Task RemoveBookmarkAsync(int bookmarkId, Guid userId)
    {
        var bookmark = await _context.Bookmarks
            .FirstOrDefaultAsync(b => b.Id == bookmarkId && b.UserId == userId);

        if (bookmark == null)
            throw new InvalidOperationException("Bookmark not found");

        _context.Bookmarks.Remove(bookmark);
        await _context.SaveChangesAsync();
    }

    public async Task<BookmarkListResult> ListBookmarksAsync(Guid userId, int? collectionId, int page, int pageSize)
    {
        var query = _context.Bookmarks
            .Where(b => b.UserId == userId);

        if (collectionId.HasValue)
        {
            query = query.Where(b => b.CollectionId == collectionId.Value);
        }

        var total = await query.CountAsync();

        var bookmarks = await query
            .OrderByDescending(b => b.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Include(b => b.Article)
            .Include(b => b.Collection)
            .ToListAsync();

        var dtos = new List<BookmarkDto>();
        foreach (var bookmark in bookmarks)
        {
            dtos.Add(await MapToDtoAsync(bookmark));
        }

        return new BookmarkListResult(dtos, total, page, pageSize);
    }

    public async Task<List<BookmarkCollectionDto>> GetCollectionsAsync(Guid userId)
    {
        var collections = await _context.BookmarkCollections
            .Where(c => c.UserId == userId)
            .OrderBy(c => c.Name)
            .ToListAsync();

        var dtos = new List<BookmarkCollectionDto>();
        foreach (var collection in collections)
        {
            var bookmarkCount = await _context.Bookmarks
                .CountAsync(b => b.CollectionId == collection.Id);

            dtos.Add(new BookmarkCollectionDto(
                collection.Id,
                collection.UserId,
                collection.Name,
                collection.Description,
                collection.Color,
                bookmarkCount,
                collection.CreatedAt
            ));
        }

        return dtos;
    }

    public async Task<BookmarkCollectionDto> CreateCollectionAsync(Guid userId, CreateCollectionRequest request)
    {
        var collection = new BookmarkCollectionEntity
        {
            UserId = userId,
            Name = request.Name,
            Description = request.Description,
            Color = request.Color,
            CreatedAt = DateTime.UtcNow
        };

        _context.BookmarkCollections.Add(collection);
        await _context.SaveChangesAsync();

        return new BookmarkCollectionDto(
            collection.Id,
            collection.UserId,
            collection.Name,
            collection.Description,
            collection.Color,
            0,
            collection.CreatedAt
        );
    }

    public async Task<BookmarkCollectionDto> UpdateCollectionAsync(int collectionId, Guid userId, UpdateCollectionRequest request)
    {
        var collection = await _context.BookmarkCollections
            .FirstOrDefaultAsync(c => c.Id == collectionId && c.UserId == userId);

        if (collection == null)
            throw new InvalidOperationException("Collection not found");

        if (request.Name != null)
            collection.Name = request.Name;
        if (request.Description != null)
            collection.Description = request.Description;
        if (request.Color != null)
            collection.Color = request.Color;

        await _context.SaveChangesAsync();

        var bookmarkCount = await _context.Bookmarks.CountAsync(b => b.CollectionId == collection.Id);

        return new BookmarkCollectionDto(
            collection.Id,
            collection.UserId,
            collection.Name,
            collection.Description,
            collection.Color,
            bookmarkCount,
            collection.CreatedAt
        );
    }

    public async Task DeleteCollectionAsync(int collectionId, Guid userId)
    {
        var collection = await _context.BookmarkCollections
            .FirstOrDefaultAsync(c => c.Id == collectionId && c.UserId == userId);

        if (collection == null)
            throw new InvalidOperationException("Collection not found");

        // Set bookmarks in this collection to null collection
        var bookmarks = await _context.Bookmarks
            .Where(b => b.CollectionId == collectionId)
            .ToListAsync();

        foreach (var bookmark in bookmarks)
        {
            bookmark.CollectionId = null;
        }

        _context.BookmarkCollections.Remove(collection);
        await _context.SaveChangesAsync();
    }

    private async Task<BookmarkDto> MapToDtoAsync(BookmarkEntity bookmark)
    {
        // Load related entities if not already loaded
        if (bookmark.Article == null)
        {
            await _context.Entry(bookmark)
                .Reference(b => b.Article)
                .Query()
                .Include(a => a.Source)
                .Include(a => a.Classification)
                .LoadAsync();
        }
        if (bookmark.Collection == null && bookmark.CollectionId.HasValue)
        {
            await _context.Entry(bookmark).Reference(b => b.Collection).LoadAsync();
        }

        NewsArticleDto? articleDto = null;
        if (bookmark.Article != null)
        {
            var article = bookmark.Article;
            var classification = article.Classification;

            articleDto = new NewsArticleDto
            {
                Id = article.Id,
                Title = article.Title,
                Summary = classification?.Summary,
                Url = article.Url,
                ImageUrl = article.ImageUrl,
                SourceName = article.Source?.Name ?? "Unknown",
                Language = article.Language,
                PublishedAt = article.PublishedAt,
                CountryTags = new List<string>(),
                Categories = !string.IsNullOrEmpty(classification?.Category)
                    ? new List<string> { classification.Category }
                    : new List<string>(),
                ThreatType = classification?.ThreatType,
                ThreatLevel = classification?.ThreatLevel ?? 0,
                CredibilityScore = classification?.CredibilityScore ?? 0,
                VoteStats = null,
                Entities = new List<EntityDto>()
            };
        }

        return new BookmarkDto(
            bookmark.Id,
            bookmark.UserId,
            bookmark.ArticleId,
            bookmark.CollectionId,
            bookmark.Collection?.Name,
            bookmark.Notes,
            bookmark.CreatedAt,
            articleDto
        );
    }
}
