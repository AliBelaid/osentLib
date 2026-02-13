using AUSentinel.Api.Data;
using AUSentinel.Api.Data.Entities;
using AUSentinel.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace AUSentinel.Api.Services;

public class ExperienceService : IExperienceService
{
    private readonly AppDbContext _db;
    private readonly ILogger<ExperienceService> _logger;

    // XP constants
    private const int XP_PER_VOTE = 5;
    private const int XP_PER_BOOKMARK = 3;
    private const int XP_PER_BULLETIN_CREATE = 20;
    private const int XP_PER_BULLETIN_PUBLISH = 50;
    private const int XP_PER_ALERT_ACKNOWLEDGE = 10;
    private const int XP_PER_PROFILE_UPDATE = 15;

    // Level progression (exponential growth)
    private static readonly int[] LevelThresholds = { 0, 100, 250, 500, 1000, 2000, 4000, 7000, 10000, 15000 };

    public ExperienceService(AppDbContext db, ILogger<ExperienceService> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task<UserExperienceDto> AwardXpAsync(Guid userId, string activityType, int xpAmount, string? entityType = null, Guid? entityId = null, string? metadata = null)
    {
        // Get or create user experience record
        var userXp = await _db.UserExperiences
            .FirstOrDefaultAsync(ux => ux.UserId == userId);

        if (userXp == null)
        {
            userXp = new UserExperience
            {
                UserId = userId,
                TotalXp = 0,
                Level = 1,
                CurrentLevelXp = 0,
                NextLevelXp = LevelThresholds[1],
                CreatedAt = DateTime.UtcNow,
                LastActivityAt = DateTime.UtcNow
            };
            _db.UserExperiences.Add(userXp);
        }

        // Award XP
        userXp.TotalXp += xpAmount;
        userXp.CurrentLevelXp += xpAmount;
        userXp.LastActivityAt = DateTime.UtcNow;

        // Check for level up
        while (userXp.Level < LevelThresholds.Length && userXp.CurrentLevelXp >= userXp.NextLevelXp)
        {
            userXp.Level++;
            userXp.CurrentLevelXp -= userXp.NextLevelXp;

            if (userXp.Level < LevelThresholds.Length)
            {
                userXp.NextLevelXp = LevelThresholds[userXp.Level] - LevelThresholds[userXp.Level - 1];
            }
            else
            {
                userXp.NextLevelXp = 0; // Max level reached
            }

            _logger.LogInformation("User {UserId} leveled up to level {Level}", userId, userXp.Level);
        }

        // Log activity
        var activityLog = new ActivityLog
        {
            UserId = userId,
            ActivityType = activityType,
            XpAwarded = xpAmount,
            EntityType = entityType,
            EntityId = entityId,
            Metadata = metadata,
            CreatedAt = DateTime.UtcNow
        };
        _db.ActivityLogs.Add(activityLog);

        await _db.SaveChangesAsync();

        // Check for newly unlocked badges
        await CheckAndUnlockBadgesAsync(userId);

        return MapToDto(userXp);
    }

    public async Task<UserExperienceDto> GetUserExperienceAsync(Guid userId)
    {
        var userXp = await _db.UserExperiences
            .FirstOrDefaultAsync(ux => ux.UserId == userId);

        if (userXp == null)
        {
            // Create initial record
            userXp = new UserExperience
            {
                UserId = userId,
                TotalXp = 0,
                Level = 1,
                CurrentLevelXp = 0,
                NextLevelXp = LevelThresholds[1],
                CreatedAt = DateTime.UtcNow,
                LastActivityAt = DateTime.UtcNow
            };
            _db.UserExperiences.Add(userXp);
            await _db.SaveChangesAsync();
        }

        return MapToDto(userXp);
    }

    public async Task<List<LeaderboardEntryDto>> GetLeaderboardAsync(int page = 1, int pageSize = 50, string? countryCode = null)
    {
        var query = _db.UserExperiences
            .Include(ux => ux.User)
            .AsQueryable();

        if (!string.IsNullOrEmpty(countryCode))
        {
            query = query.Where(ux => ux.User.CountryCode == countryCode);
        }

        var entries = await query
            .OrderByDescending(ux => ux.TotalXp)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(ux => new LeaderboardEntryDto(
                ux.UserId,
                ux.User.Username,
                ux.User.FullName,
                ux.User.CountryCode,
                ux.TotalXp,
                ux.Level
            ))
            .ToListAsync();

        return entries;
    }

    public async Task<List<UserBadgeDto>> GetUserBadgesAsync(Guid userId)
    {
        var userBadges = await _db.UserBadges
            .Include(ub => ub.Badge)
            .Where(ub => ub.UserId == userId && ub.IsUnlocked)
            .OrderByDescending(ub => ub.EarnedAt)
            .Select(ub => new UserBadgeDto(
                ub.Id,
                ub.BadgeId,
                ub.Badge.Name,
                ub.Badge.Description,
                ub.Badge.IconUrl,
                ub.Badge.Category,
                ub.Badge.Rarity,
                ub.Progress,
                ub.Badge.RequiredCount,
                ub.IsUnlocked,
                ub.EarnedAt
            ))
            .ToListAsync();

        return userBadges;
    }

    public async Task<List<BadgeDto>> GetAllBadgesAsync()
    {
        var badges = await _db.Badges
            .OrderBy(b => b.Category)
            .ThenBy(b => b.RequiredCount)
            .Select(b => new BadgeDto(
                b.Id,
                b.Name,
                b.Description,
                b.IconUrl,
                b.Category,
                b.RequiredCount,
                b.Rarity
            ))
            .ToListAsync();

        return badges;
    }

    public async Task<ActivityHistoryResult> GetActivityHistoryAsync(Guid userId, int page = 1, int pageSize = 20)
    {
        var query = _db.ActivityLogs
            .Where(al => al.UserId == userId)
            .OrderByDescending(al => al.CreatedAt);

        var total = await query.CountAsync();

        var activities = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(al => new ActivityLogDto(
                al.Id,
                al.ActivityType,
                al.XpAwarded,
                al.EntityType,
                al.EntityId,
                al.CreatedAt
            ))
            .ToListAsync();

        return new ActivityHistoryResult(activities, total, page, pageSize);
    }

    public async Task<List<BadgeDto>> CheckAndUnlockBadgesAsync(Guid userId)
    {
        var newlyUnlockedBadges = new List<BadgeDto>();

        // Get user's current badge progress
        var userBadges = await _db.UserBadges
            .Where(ub => ub.UserId == userId)
            .ToDictionaryAsync(ub => ub.BadgeId);

        // Get all badges
        var allBadges = await _db.Badges.ToListAsync();

        // Count user activities
        var votesCount = await _db.Votes.CountAsync(v => v.UserId == userId);
        var bookmarksCount = await _db.Bookmarks.CountAsync(b => b.UserId == userId);
        var bulletinsCreatedCount = await _db.Bulletins.CountAsync(b => b.CreatedByUserId == userId);
        var bulletinsPublishedCount = await _db.Bulletins.CountAsync(b => b.PublishedByUserId == userId && b.Status == "Published");
        var alertsAcknowledgedCount = await _db.AlertDeliveries.CountAsync(ad => ad.UserId == userId && ad.ReadAt != null);
        var userXp = await _db.UserExperiences.FirstOrDefaultAsync(ux => ux.UserId == userId);
        var currentLevel = userXp?.Level ?? 1;

        foreach (var badge in allBadges)
        {
            // Check if already unlocked
            if (userBadges.TryGetValue(badge.Id, out var userBadge) && userBadge.IsUnlocked)
                continue;

            int currentProgress = badge.Category switch
            {
                "voting" => votesCount,
                "bookmarks" => bookmarksCount,
                "bulletins" => badge.Name.Contains("Publish") ? bulletinsPublishedCount : bulletinsCreatedCount,
                "alerts" => alertsAcknowledgedCount,
                "level" => currentLevel,
                "engagement" => badge.Name == "Welcome" ? (await _db.UserProfiles.AnyAsync(up => up.UserId == userId) ? 1 : 0) : 0,
                _ => 0
            };

            bool shouldUnlock = currentProgress >= badge.RequiredCount;

            if (userBadge == null)
            {
                // Create progress record
                userBadge = new UserBadge
                {
                    UserId = userId,
                    BadgeId = badge.Id,
                    Progress = currentProgress,
                    IsUnlocked = shouldUnlock,
                    EarnedAt = shouldUnlock ? DateTime.UtcNow : DateTime.MinValue
                };
                _db.UserBadges.Add(userBadge);
            }
            else
            {
                // Update progress
                userBadge.Progress = currentProgress;

                if (shouldUnlock && !userBadge.IsUnlocked)
                {
                    userBadge.IsUnlocked = true;
                    userBadge.EarnedAt = DateTime.UtcNow;
                }
            }

            if (shouldUnlock && userBadge.IsUnlocked)
            {
                newlyUnlockedBadges.Add(new BadgeDto(
                    badge.Id,
                    badge.Name,
                    badge.Description,
                    badge.IconUrl,
                    badge.Category,
                    badge.RequiredCount,
                    badge.Rarity
                ));
            }
        }

        await _db.SaveChangesAsync();

        return newlyUnlockedBadges;
    }

    public static int GetXpForActivity(string activityType) => activityType switch
    {
        "vote" => XP_PER_VOTE,
        "bookmark" => XP_PER_BOOKMARK,
        "bulletin_create" => XP_PER_BULLETIN_CREATE,
        "bulletin_publish" => XP_PER_BULLETIN_PUBLISH,
        "alert_acknowledge" => XP_PER_ALERT_ACKNOWLEDGE,
        "profile_update" => XP_PER_PROFILE_UPDATE,
        _ => 0
    };

    private static UserExperienceDto MapToDto(UserExperience ux)
    {
        var levelName = ux.Level switch
        {
            1 => "Novice",
            2 => "Apprentice",
            3 => "Professional",
            4 => "Specialist",
            5 => "Expert",
            6 => "Veteran",
            7 => "Master",
            8 => "Grandmaster",
            9 => "Legend",
            >= 10 => "Elite",
            _ => "Unknown"
        };

        return new UserExperienceDto(
            ux.UserId,
            ux.TotalXp,
            ux.Level,
            levelName,
            ux.CurrentLevelXp,
            ux.NextLevelXp,
            ux.LastActivityAt
        );
    }
}
