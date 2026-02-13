using AUSentinel.Api.Data;
using AUSentinel.Api.Data.Entities;
using AUSentinel.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace AUSentinel.Api.Services;

public interface IAlertService
{
    Task<List<AlertRuleDto>> ListRulesAsync(string? countryCode, bool isAUAdmin);
    Task<AlertRuleDto> CreateRuleAsync(Guid userId, string countryCode, CreateAlertRuleRequest request);
    Task<AlertRuleDto> ToggleRuleAsync(int id);
    Task DeleteRuleAsync(int id);
    Task<List<AlertDto>> ListAlertsAsync(string? countryCode, bool isAUAdmin, bool activeOnly);
    Task AcknowledgeAlertAsync(int alertId, Guid userId);
}

public class AlertService : IAlertService
{
    private readonly AppDbContext _db;
    private readonly IExperienceService _experienceService;

    public AlertService(AppDbContext db, IExperienceService experienceService)
    {
        _db = db;
        _experienceService = experienceService;
    }

    public async Task<List<AlertRuleDto>> ListRulesAsync(string? countryCode, bool isAUAdmin)
    {
        var query = _db.AlertRules.AsQueryable();

        if (!isAUAdmin && !string.IsNullOrEmpty(countryCode))
            query = query.Where(r => r.CountryCode == countryCode);

        var rules = await query.OrderByDescending(r => r.CreatedAt).ToListAsync();

        return rules.Select(r => new AlertRuleDto(
            r.Id, r.Name, r.CountryCode, r.Category, r.ThreatType,
            r.MinThreatLevel, r.Keywords, r.IsActive, r.CreatedAt
        )).ToList();
    }

    public async Task<AlertRuleDto> CreateRuleAsync(Guid userId, string countryCode, CreateAlertRuleRequest request)
    {
        var rule = new AlertRule
        {
            Name = request.Name,
            CountryCode = countryCode,
            Category = request.Category,
            ThreatType = request.ThreatType,
            MinThreatLevel = request.MinThreatLevel,
            Keywords = request.Keywords,
            CreatedByUserId = userId,
            IsActive = true
        };

        _db.AlertRules.Add(rule);
        await _db.SaveChangesAsync();

        return new AlertRuleDto(rule.Id, rule.Name, rule.CountryCode, rule.Category,
            rule.ThreatType, rule.MinThreatLevel, rule.Keywords, rule.IsActive, rule.CreatedAt);
    }

    public async Task<AlertRuleDto> ToggleRuleAsync(int id)
    {
        var rule = await _db.AlertRules.FindAsync(id)
            ?? throw new KeyNotFoundException("Alert rule not found.");

        rule.IsActive = !rule.IsActive;
        await _db.SaveChangesAsync();

        return new AlertRuleDto(rule.Id, rule.Name, rule.CountryCode, rule.Category,
            rule.ThreatType, rule.MinThreatLevel, rule.Keywords, rule.IsActive, rule.CreatedAt);
    }

    public async Task DeleteRuleAsync(int id)
    {
        var rule = await _db.AlertRules.FindAsync(id)
            ?? throw new KeyNotFoundException("Alert rule not found.");

        _db.AlertRules.Remove(rule);
        await _db.SaveChangesAsync();
    }

    public async Task<List<AlertDto>> ListAlertsAsync(string? countryCode, bool isAUAdmin, bool activeOnly)
    {
        var query = _db.Alerts.AsQueryable();

        if (!isAUAdmin && !string.IsNullOrEmpty(countryCode))
            query = query.Where(a => a.CountryCode == countryCode);

        if (activeOnly)
            query = query.Where(a => a.IsActive);

        var alerts = await query.OrderByDescending(a => a.CreatedAt).Take(100).ToListAsync();

        return alerts.Select(a => new AlertDto(
            a.Id, a.Title, a.Message, a.Severity, a.CountryCode,
            a.IsActive, a.CreatedAt, a.ArticleId, a.AcknowledgedAt
        )).ToList();
    }

    public async Task AcknowledgeAlertAsync(int alertId, Guid userId)
    {
        var alert = await _db.Alerts.FindAsync(alertId)
            ?? throw new KeyNotFoundException("Alert not found.");

        alert.IsActive = false;
        alert.AcknowledgedAt = DateTime.UtcNow;
        alert.AcknowledgedByUserId = userId;
        await _db.SaveChangesAsync();

        // Award XP for acknowledging alert
        await _experienceService.AwardXpAsync(
            userId,
            "alert_acknowledge",
            ExperienceService.GetXpForActivity("alert_acknowledge"),
            "Alert",
            Guid.Parse(alertId.ToString())
        );
    }
}
