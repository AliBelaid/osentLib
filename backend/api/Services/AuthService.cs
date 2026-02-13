using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using AUSentinel.Api.Data;
using AUSentinel.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

namespace AUSentinel.Api.Services;

public interface IAuthService
{
    Task<LoginResponse> LoginAsync(LoginRequest request);
    Task<UserProfile> GetProfileAsync(Guid userId);
}

public class AuthService : IAuthService
{
    private readonly AppDbContext _db;
    private readonly IConfiguration _config;

    public AuthService(AppDbContext db, IConfiguration config)
    {
        _db = db;
        _config = config;
    }

    public async Task<LoginResponse> LoginAsync(LoginRequest request)
    {
        var user = await _db.Users
            .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
            .Include(u => u.Country)
            .FirstOrDefaultAsync(u => u.Username == request.Username && u.IsActive);

        if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            throw new UnauthorizedAccessException("Invalid username or password.");

        var roles = user.UserRoles.Select(ur => ur.Role.Name).ToList();
        var token = GenerateToken(user, roles);
        var expiresAt = DateTime.UtcNow.AddHours(24);

        var profile = new UserProfile(
            user.Id, user.Username, user.Email, user.FullName,
            user.CountryCode, user.Country.Name, user.PreferredLanguage, roles
        );

        return new LoginResponse(token, expiresAt, profile);
    }

    public async Task<UserProfile> GetProfileAsync(Guid userId)
    {
        var user = await _db.Users
            .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
            .Include(u => u.Country)
            .FirstOrDefaultAsync(u => u.Id == userId)
            ?? throw new KeyNotFoundException("User not found.");

        var roles = user.UserRoles.Select(ur => ur.Role.Name).ToList();

        return new UserProfile(
            user.Id, user.Username, user.Email, user.FullName,
            user.CountryCode, user.Country.Name, user.PreferredLanguage, roles
        );
    }

    private string GenerateToken(Data.Entities.User user, List<string> roles)
    {
        var key = _config["Jwt:Key"] ?? "AU_Sentinel_Dev_Secret_Key_Change_In_Production_2024!";
        var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key));
        var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Name, user.Username),
            new("country", user.CountryCode),
            new("email", user.Email),
        };

        foreach (var role in roles)
        {
            claims.Add(new Claim(ClaimTypes.Role, role));
        }

        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"] ?? "AUSentinel",
            audience: _config["Jwt:Audience"] ?? "AUSentinel",
            claims: claims,
            expires: DateTime.UtcNow.AddHours(24),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
