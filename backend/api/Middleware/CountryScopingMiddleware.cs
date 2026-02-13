using System.Security.Claims;

namespace AUSentinel.Api.Middleware;

public class CountryScopingMiddleware
{
    private readonly RequestDelegate _next;

    public CountryScopingMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        if (context.User.Identity?.IsAuthenticated == true)
        {
            var countryCode = context.User.FindFirstValue("country");
            var roles = context.User.FindAll(ClaimTypes.Role).Select(c => c.Value).ToList();

            if (!string.IsNullOrEmpty(countryCode))
            {
                context.Items["UserCountryCode"] = countryCode;
            }

            context.Items["IsAUAdmin"] = roles.Contains("AUAdmin");
            context.Items["UserRoles"] = roles;
        }

        await _next(context);
    }
}

public static class HttpContextExtensions
{
    public static string? GetUserCountryCode(this HttpContext context)
        => context.Items["UserCountryCode"] as string;

    public static bool IsAUAdmin(this HttpContext context)
        => context.Items["IsAUAdmin"] is true;

    public static Guid GetUserId(this HttpContext context)
    {
        var sub = context.User.FindFirstValue(ClaimTypes.NameIdentifier);
        return sub != null ? Guid.Parse(sub) : Guid.Empty;
    }

    public static List<string> GetUserRoles(this HttpContext context)
        => context.Items["UserRoles"] as List<string> ?? new List<string>();

    public static bool HasRole(this HttpContext context, string role)
        => context.GetUserRoles().Contains(role);
}
