using AUSentinel.Api.Data;
using AUSentinel.Api.Data.Entities;
using AUSentinel.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace AUSentinel.Api.Services;

public interface IUserService
{
    Task<UserListResult> ListAsync(string? countryCode, bool isAUAdmin, int page, int pageSize, string? search);
    Task<UserDto> GetAsync(Guid id);
    Task<UserDto> CreateAsync(CreateUserRequest request);
    Task<UserDto> UpdateAsync(Guid id, UpdateUserRequest request);
    Task DeleteAsync(Guid id);
    Task ResetPasswordAsync(Guid id, ResetPasswordRequest request);
    Task ChangePasswordAsync(Guid userId, ChangePasswordRequest request);
    Task<List<CountryDto>> ListCountriesAsync();
}

public class UserService : IUserService
{
    private readonly AppDbContext _db;

    public UserService(AppDbContext db) => _db = db;

    public async Task<UserListResult> ListAsync(string? countryCode, bool isAUAdmin, int page, int pageSize, string? search)
    {
        var query = _db.Users
            .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
            .Include(u => u.Country)
            .AsQueryable();

        if (!isAUAdmin && !string.IsNullOrEmpty(countryCode))
            query = query.Where(u => u.CountryCode == countryCode);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.ToLower();
            query = query.Where(u =>
                u.Username.ToLower().Contains(term) ||
                u.FullName.ToLower().Contains(term) ||
                u.Email.ToLower().Contains(term));
        }

        var total = await query.CountAsync();

        var users = await query
            .OrderBy(u => u.Username)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return new UserListResult(
            users.Select(MapToDto).ToList(),
            total, page, pageSize
        );
    }

    public async Task<UserDto> GetAsync(Guid id)
    {
        var user = await _db.Users
            .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
            .Include(u => u.Country)
            .FirstOrDefaultAsync(u => u.Id == id)
            ?? throw new KeyNotFoundException("User not found.");

        return MapToDto(user);
    }

    public async Task<UserDto> CreateAsync(CreateUserRequest request)
    {
        // Check unique constraints
        if (await _db.Users.AnyAsync(u => u.Username == request.Username))
            throw new InvalidOperationException("Username already exists.");

        if (await _db.Users.AnyAsync(u => u.Email == request.Email))
            throw new InvalidOperationException("Email already exists.");

        var country = await _db.Countries.FindAsync(request.CountryCode)
            ?? throw new InvalidOperationException($"Country '{request.CountryCode}' not found.");

        var user = new User
        {
            Username = request.Username,
            Email = request.Email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            FullName = request.FullName,
            CountryCode = request.CountryCode,
            PreferredLanguage = request.PreferredLanguage,
            IsActive = true
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        // Assign roles
        await AssignRolesAsync(user.Id, request.Roles);

        return await GetAsync(user.Id);
    }

    public async Task<UserDto> UpdateAsync(Guid id, UpdateUserRequest request)
    {
        var user = await _db.Users
            .Include(u => u.UserRoles)
            .FirstOrDefaultAsync(u => u.Id == id)
            ?? throw new KeyNotFoundException("User not found.");

        if (request.Email != null)
        {
            if (await _db.Users.AnyAsync(u => u.Email == request.Email && u.Id != id))
                throw new InvalidOperationException("Email already in use.");
            user.Email = request.Email;
        }

        if (request.FullName != null) user.FullName = request.FullName;
        if (request.CountryCode != null)
        {
            _ = await _db.Countries.FindAsync(request.CountryCode)
                ?? throw new InvalidOperationException($"Country '{request.CountryCode}' not found.");
            user.CountryCode = request.CountryCode;
        }
        if (request.PreferredLanguage != null) user.PreferredLanguage = request.PreferredLanguage;
        if (request.IsActive.HasValue) user.IsActive = request.IsActive.Value;

        user.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        // Update roles if provided
        if (request.Roles != null)
        {
            _db.UserRoles.RemoveRange(user.UserRoles);
            await _db.SaveChangesAsync();
            await AssignRolesAsync(user.Id, request.Roles);
        }

        return await GetAsync(id);
    }

    public async Task DeleteAsync(Guid id)
    {
        var user = await _db.Users
            .Include(u => u.UserRoles)
            .FirstOrDefaultAsync(u => u.Id == id)
            ?? throw new KeyNotFoundException("User not found.");

        // Don't delete the last AUAdmin
        var isAdmin = user.UserRoles.Any(ur => ur.Role?.Name == RoleNames.AUAdmin);
        if (isAdmin)
        {
            var adminCount = await _db.UserRoles
                .Include(ur => ur.Role)
                .CountAsync(ur => ur.Role.Name == RoleNames.AUAdmin);
            if (adminCount <= 1)
                throw new InvalidOperationException("Cannot delete the last AUAdmin user.");
        }

        _db.UserRoles.RemoveRange(user.UserRoles);
        _db.Users.Remove(user);
        await _db.SaveChangesAsync();
    }

    public async Task ResetPasswordAsync(Guid id, ResetPasswordRequest request)
    {
        var user = await _db.Users.FindAsync(id)
            ?? throw new KeyNotFoundException("User not found.");

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
        user.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
    }

    public async Task ChangePasswordAsync(Guid userId, ChangePasswordRequest request)
    {
        var user = await _db.Users.FindAsync(userId)
            ?? throw new KeyNotFoundException("User not found.");

        if (!BCrypt.Net.BCrypt.Verify(request.CurrentPassword, user.PasswordHash))
            throw new UnauthorizedAccessException("Current password is incorrect.");

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
        user.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
    }

    public async Task<List<CountryDto>> ListCountriesAsync()
    {
        return await _db.Countries
            .OrderBy(c => c.Name)
            .Select(c => new CountryDto(c.Code, c.Name, c.NameArabic, c.Region))
            .ToListAsync();
    }

    private async Task AssignRolesAsync(Guid userId, List<string> roleNames)
    {
        var roles = await _db.Roles
            .Where(r => roleNames.Contains(r.Name))
            .ToListAsync();

        foreach (var role in roles)
        {
            _db.UserRoles.Add(new UserRole { UserId = userId, RoleId = role.Id });
        }
        await _db.SaveChangesAsync();
    }

    private static UserDto MapToDto(User u) => new(
        u.Id, u.Username, u.Email, u.FullName,
        u.CountryCode, u.Country?.Name ?? "", u.PreferredLanguage,
        u.IsActive,
        u.UserRoles.Select(ur => ur.Role?.Name ?? "").Where(n => n != "").ToList(),
        u.CreatedAt, u.UpdatedAt
    );
}
