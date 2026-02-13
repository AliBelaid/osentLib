namespace AUSentinel.Api.Models;

public record CreateUserRequest(
    string Username,
    string Email,
    string Password,
    string FullName,
    string CountryCode,
    string PreferredLanguage,
    List<string> Roles
);

public record UpdateUserRequest(
    string? Email,
    string? FullName,
    string? CountryCode,
    string? PreferredLanguage,
    bool? IsActive,
    List<string>? Roles
);

public record ChangePasswordRequest(
    string CurrentPassword,
    string NewPassword
);

public record ResetPasswordRequest(
    string NewPassword
);

public record UserDto(
    Guid Id,
    string Username,
    string Email,
    string FullName,
    string CountryCode,
    string CountryName,
    string PreferredLanguage,
    bool IsActive,
    List<string> Roles,
    DateTime CreatedAt,
    DateTime? UpdatedAt,
    UserProfileDto? Profile = null
);

public record UserListResult(
    List<UserDto> Items,
    int Total,
    int Page,
    int PageSize
);

public record CountryDto(
    string Code,
    string Name,
    string NameArabic,
    string Region
);

public record UserProfileDto(
    int Id,
    Guid UserId,
    string? Bio,
    string? AvatarUrl,
    string? Organization,
    string? JobTitle,
    string? PhoneNumber,
    string? LinkedInUrl,
    string? TwitterHandle,
    DateTime CreatedAt,
    DateTime? UpdatedAt
);

public record UpdateUserProfileRequest(
    string? Bio,
    string? Organization,
    string? JobTitle,
    string? PhoneNumber,
    string? LinkedInUrl,
    string? TwitterHandle
);
