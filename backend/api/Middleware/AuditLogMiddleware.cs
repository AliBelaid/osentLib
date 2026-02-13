using AUSentinel.Api.Data;
using AUSentinel.Api.Data.Entities;

namespace AUSentinel.Api.Middleware;

public class AuditLogMiddleware
{
    private readonly RequestDelegate _next;

    public AuditLogMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context, AppDbContext db)
    {
        await _next(context);

        // Log mutating requests from authenticated users
        if (context.User.Identity?.IsAuthenticated == true &&
            context.Request.Method is "POST" or "PUT" or "PATCH" or "DELETE" &&
            context.Response.StatusCode < 400)
        {
            var log = new AuditLog
            {
                UserId = context.GetUserId(),
                Action = $"{context.Request.Method} {context.Request.Path}",
                EntityType = context.Request.Path.Value?.Split('/').ElementAtOrDefault(2) ?? "unknown",
                IpAddress = context.Connection.RemoteIpAddress?.ToString(),
                Timestamp = DateTime.UtcNow
            };

            db.AuditLogs.Add(log);
            await db.SaveChangesAsync();
        }
    }
}
