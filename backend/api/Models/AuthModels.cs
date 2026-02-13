namespace AUSentinel.Api.Models;

public record LoginRequest(string Username, string Password);

public record LoginResponse(string Token, DateTime ExpiresAt, UserProfile User);

public record UserProfile(
    Guid Id,
    string Username,
    string Email,
    string FullName,
    string CountryCode,
    string CountryName,
    string PreferredLanguage,
    List<string> Roles
);
