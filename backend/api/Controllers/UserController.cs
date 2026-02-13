using AUSentinel.Api.Middleware;
using AUSentinel.Api.Models;
using AUSentinel.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AUSentinel.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UserController : ControllerBase
{
    private readonly IUserService _userService;
    private readonly IUserProfileService _profileService;

    public UserController(IUserService userService, IUserProfileService profileService)
    {
        _userService = userService;
        _profileService = profileService;
    }

    /// <summary>List users (country-scoped, admins only)</summary>
    [HttpGet]
    [Authorize(Roles = "CountryAdmin,AUAdmin")]
    public async Task<ActionResult<UserListResult>> List(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? search = null)
    {
        var country = HttpContext.GetUserCountryCode();
        var isAdmin = HttpContext.IsAUAdmin();
        var result = await _userService.ListAsync(country, isAdmin, page, pageSize, search);
        return Ok(result);
    }

    /// <summary>Get a single user by ID</summary>
    [HttpGet("{id:guid}")]
    [Authorize(Roles = "CountryAdmin,AUAdmin")]
    public async Task<ActionResult<UserDto>> Get(Guid id)
    {
        var result = await _userService.GetAsync(id);
        return Ok(result);
    }

    /// <summary>Create a new user</summary>
    [HttpPost]
    [Authorize(Roles = "CountryAdmin,AUAdmin")]
    public async Task<ActionResult<UserDto>> Create([FromBody] CreateUserRequest request)
    {
        // CountryAdmins can only create users in their own country
        if (!HttpContext.IsAUAdmin())
        {
            var userCountry = HttpContext.GetUserCountryCode();
            if (request.CountryCode != userCountry)
                return Forbid();

            // CountryAdmins cannot assign AUAdmin role
            if (request.Roles.Contains("AUAdmin"))
                return Forbid();
        }

        var result = await _userService.CreateAsync(request);
        return CreatedAtAction(nameof(Get), new { id = result.Id }, result);
    }

    /// <summary>Update a user</summary>
    [HttpPut("{id:guid}")]
    [Authorize(Roles = "CountryAdmin,AUAdmin")]
    public async Task<ActionResult<UserDto>> Update(Guid id, [FromBody] UpdateUserRequest request)
    {
        // CountryAdmins cannot assign AUAdmin role
        if (!HttpContext.IsAUAdmin() && request.Roles?.Contains("AUAdmin") == true)
            return Forbid();

        var result = await _userService.UpdateAsync(id, request);
        return Ok(result);
    }

    /// <summary>Delete a user</summary>
    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "AUAdmin")]
    public async Task<IActionResult> Delete(Guid id)
    {
        // Cannot delete yourself
        if (HttpContext.GetUserId() == id)
            return BadRequest(new { error = "Cannot delete your own account." });

        await _userService.DeleteAsync(id);
        return NoContent();
    }

    /// <summary>Reset a user's password (admin)</summary>
    [HttpPost("{id:guid}/reset-password")]
    [Authorize(Roles = "CountryAdmin,AUAdmin")]
    public async Task<IActionResult> ResetPassword(Guid id, [FromBody] ResetPasswordRequest request)
    {
        await _userService.ResetPasswordAsync(id, request);
        return NoContent();
    }

    /// <summary>Change own password</summary>
    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
    {
        var userId = HttpContext.GetUserId();
        await _userService.ChangePasswordAsync(userId, request);
        return NoContent();
    }

    /// <summary>List all countries</summary>
    [HttpGet("countries")]
    public async Task<ActionResult<List<CountryDto>>> ListCountries()
    {
        var countries = await _userService.ListCountriesAsync();
        return Ok(countries);
    }

    /// <summary>Get user profile</summary>
    [HttpGet("{id:guid}/profile")]
    public async Task<ActionResult<UserProfileDto>> GetProfile(Guid id)
    {
        // Users can view their own profile, admins can view any profile
        var currentUserId = HttpContext.GetUserId();
        if (currentUserId != id && !HttpContext.User.IsInRole("CountryAdmin") && !HttpContext.User.IsInRole("AUAdmin"))
            return Forbid();

        var profile = await _profileService.GetProfileAsync(id);
        if (profile == null)
            return NotFound();

        return Ok(profile);
    }

    /// <summary>Update user profile</summary>
    [HttpPut("{id:guid}/profile")]
    public async Task<ActionResult<UserProfileDto>> UpdateProfile(Guid id, [FromBody] UpdateUserProfileRequest request)
    {
        // Users can only update their own profile
        var currentUserId = HttpContext.GetUserId();
        if (currentUserId != id)
            return Forbid();

        var profile = await _profileService.CreateOrUpdateProfileAsync(id, request);
        return Ok(profile);
    }

    /// <summary>Upload user avatar</summary>
    [HttpPost("{id:guid}/avatar")]
    public async Task<ActionResult<object>> UploadAvatar(Guid id, IFormFile file)
    {
        // Users can only upload their own avatar
        var currentUserId = HttpContext.GetUserId();
        if (currentUserId != id)
            return Forbid();

        if (file == null || file.Length == 0)
            return BadRequest(new { error = "No file provided" });

        if (file.Length > 5 * 1024 * 1024) // 5MB limit
            return BadRequest(new { error = "File size must be less than 5MB" });

        using var stream = file.OpenReadStream();
        var avatarUrl = await _profileService.UploadAvatarAsync(id, stream, file.FileName);

        return Ok(new { avatarUrl });
    }
}
