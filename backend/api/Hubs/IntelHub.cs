using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace AUSentinel.Api.Hubs;

[Authorize]
public class IntelHub : Hub
{
    public override async Task OnConnectedAsync()
    {
        var country = Context.User?.FindFirst("country")?.Value;
        var isAUAdmin = Context.User?.IsInRole("AUAdmin") == true;

        if (isAUAdmin)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, "AUAdmin");
        }

        if (!string.IsNullOrEmpty(country))
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, $"country:{country}");
        }

        await base.OnConnectedAsync();
    }
}
