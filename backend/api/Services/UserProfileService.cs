using AUSentinel.Api.Data;
using AUSentinel.Api.Models;
using Microsoft.EntityFrameworkCore;
using UserProfileEntity = AUSentinel.Api.Data.Entities.UserProfile;

namespace AUSentinel.Api.Services;

public interface IUserProfileService
{
    Task<UserProfileDto?> GetProfileAsync(Guid userId);
    Task<UserProfileDto> CreateOrUpdateProfileAsync(Guid userId, UpdateUserProfileRequest request);
    Task<string> UploadAvatarAsync(Guid userId, Stream fileStream, string fileName);
}

public class UserProfileService : IUserProfileService
{
    private readonly AppDbContext _context;
    private readonly string _avatarDirectory;

    public UserProfileService(AppDbContext context, IConfiguration configuration)
    {
        _context = context;
        _avatarDirectory = configuration["FileStorage:AvatarDirectory"] ?? "uploads/avatars";

        // Ensure directory exists
        if (!Directory.Exists(_avatarDirectory))
        {
            Directory.CreateDirectory(_avatarDirectory);
        }
    }

    public async Task<UserProfileDto?> GetProfileAsync(Guid userId)
    {
        var profile = await _context.UserProfiles
            .FirstOrDefaultAsync(p => p.UserId == userId);

        return profile == null ? null : MapToDto(profile);
    }

    public async Task<UserProfileDto> CreateOrUpdateProfileAsync(Guid userId, UpdateUserProfileRequest request)
    {
        var profile = await _context.UserProfiles
            .FirstOrDefaultAsync(p => p.UserId == userId);

        if (profile == null)
        {
            // Create new profile
            profile = new UserProfileEntity
            {
                UserId = userId,
                CreatedAt = DateTime.UtcNow
            };
            _context.UserProfiles.Add(profile);
        }

        // Update fields
        if (request.Bio != null)
            profile.Bio = request.Bio;
        if (request.Organization != null)
            profile.Organization = request.Organization;
        if (request.JobTitle != null)
            profile.JobTitle = request.JobTitle;
        if (request.PhoneNumber != null)
            profile.PhoneNumber = request.PhoneNumber;
        if (request.LinkedInUrl != null)
            profile.LinkedInUrl = request.LinkedInUrl;
        if (request.TwitterHandle != null)
            profile.TwitterHandle = request.TwitterHandle;

        profile.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return MapToDto(profile);
    }

    public async Task<string> UploadAvatarAsync(Guid userId, Stream fileStream, string fileName)
    {
        // Validate file extension
        var extension = Path.GetExtension(fileName).ToLowerInvariant();
        if (extension != ".jpg" && extension != ".jpeg" && extension != ".png" && extension != ".gif")
        {
            throw new ArgumentException("Invalid file type. Only JPG, PNG, and GIF are allowed.");
        }

        // Generate unique filename
        var newFileName = $"{userId}{extension}";
        var filePath = Path.Combine(_avatarDirectory, newFileName);

        // Save file
        using (var fileStreamOut = new FileStream(filePath, FileMode.Create))
        {
            await fileStream.CopyToAsync(fileStreamOut);
        }

        // Update profile with avatar URL
        var profile = await _context.UserProfiles
            .FirstOrDefaultAsync(p => p.UserId == userId);

        if (profile == null)
        {
            profile = new UserProfileEntity
            {
                UserId = userId,
                CreatedAt = DateTime.UtcNow
            };
            _context.UserProfiles.Add(profile);
        }

        var avatarUrl = $"/avatars/{newFileName}";
        profile.AvatarUrl = avatarUrl;
        profile.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return avatarUrl;
    }

    private static UserProfileDto MapToDto(UserProfileEntity profile)
    {
        return new UserProfileDto(
            profile.Id,
            profile.UserId,
            profile.Bio,
            profile.AvatarUrl,
            profile.Organization,
            profile.JobTitle,
            profile.PhoneNumber,
            profile.LinkedInUrl,
            profile.TwitterHandle,
            profile.CreatedAt,
            profile.UpdatedAt
        );
    }
}
