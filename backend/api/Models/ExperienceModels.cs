namespace AUSentinel.Api.Models;

public record UserExperienceDto(
    Guid UserId,
    int TotalXp,
    int Level,
    string LevelName,
    int CurrentLevelXp,
    int NextLevelXp,
    DateTime LastActivityAt
);

public record BadgeDto(
    int Id,
    string Name,
    string Description,
    string IconUrl,
    string Category,
    int RequiredCount,
    string Rarity
);

public record UserBadgeDto(
    int Id,
    int BadgeId,
    string BadgeName,
    string BadgeDescription,
    string BadgeIconUrl,
    string Category,
    string Rarity,
    int Progress,
    int RequiredCount,
    bool IsUnlocked,
    DateTime EarnedAt
);

public record LeaderboardEntryDto(
    Guid UserId,
    string Username,
    string FullName,
    string CountryCode,
    int TotalXp,
    int Level
);

public record ActivityLogDto(
    int Id,
    string ActivityType,
    int XpAwarded,
    string? EntityType,
    Guid? EntityId,
    DateTime CreatedAt
);

public record ActivityHistoryResult(
    List<ActivityLogDto> Items,
    int Total,
    int Page,
    int PageSize
);

public record AwardXpRequest(
    string ActivityType,
    int? CustomXpAmount = null,
    string? EntityType = null,
    Guid? EntityId = null,
    string? Metadata = null
);
