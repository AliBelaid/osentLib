using AUSentinel.Api.Middleware;
using AUSentinel.Api.Models;
using AUSentinel.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AUSentinel.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService) => _authService = authService;

    /// <summary>Login with username and password</summary>
    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult<LoginResponse>> Login([FromBody] LoginRequest request)
    {
        try
        {
            var result = await _authService.LoginAsync(request);
            return Ok(result);
        }
        catch (UnauthorizedAccessException)
        {
            return Unauthorized(new { error = "Invalid username or password." });
        }
    }

    /// <summary>Get current user profile</summary>
    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<UserProfile>> GetProfile()
    {
        var userId = HttpContext.GetUserId();
        var profile = await _authService.GetProfileAsync(userId);
        return Ok(profile);
    }
}
