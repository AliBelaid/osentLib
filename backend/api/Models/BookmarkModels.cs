namespace AUSentinel.Api.Models;

public record BookmarkDto(
    int Id,
    Guid UserId,
    Guid ArticleId,
    int? CollectionId,
    string? CollectionName,
    string? Notes,
    DateTime CreatedAt,
    NewsArticleDto? Article
);

public record CreateBookmarkRequest(
    Guid ArticleId,
    int? CollectionId,
    string? Notes
);

public record BookmarkCollectionDto(
    int Id,
    Guid UserId,
    string Name,
    string? Description,
    string Color,
    int BookmarkCount,
    DateTime CreatedAt
);

public record CreateCollectionRequest(
    string Name,
    string? Description,
    string Color
);

public record UpdateCollectionRequest(
    string? Name,
    string? Description,
    string? Color
);

public record BookmarkListResult(
    List<BookmarkDto> Items,
    int Total,
    int Page,
    int PageSize
);
