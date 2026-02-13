using AUSentinel.Api.Models;
using FluentValidation;

namespace AUSentinel.Api.Validators;

public class LoginRequestValidator : AbstractValidator<LoginRequest>
{
    public LoginRequestValidator()
    {
        RuleFor(x => x.Username).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Password).NotEmpty().MinimumLength(6);
    }
}

public class CastVoteRequestValidator : AbstractValidator<CastVoteRequest>
{
    private static readonly string[] ValidVoteTypes = { "REAL", "MISLEADING", "UNSURE" };

    public CastVoteRequestValidator()
    {
        RuleFor(x => x.ArticleId).NotEmpty();
        RuleFor(x => x.VoteType).NotEmpty().Must(v => ValidVoteTypes.Contains(v))
            .WithMessage("VoteType must be REAL, MISLEADING, or UNSURE.");
        RuleFor(x => x.Reason).MaximumLength(500);
    }
}

public class CreateBulletinRequestValidator : AbstractValidator<CreateBulletinRequest>
{
    public CreateBulletinRequestValidator()
    {
        RuleFor(x => x.Title).NotEmpty().MaximumLength(300);
        RuleFor(x => x.Content).NotEmpty();
        RuleFor(x => x.Severity).InclusiveBetween(0, 5);
    }
}

public class CreateAlertRuleRequestValidator : AbstractValidator<CreateAlertRuleRequest>
{
    public CreateAlertRuleRequestValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.MinThreatLevel).InclusiveBetween(0, 5);
    }
}

public class CreateSourceRequestValidator : AbstractValidator<CreateSourceRequest>
{
    private static readonly string[] ValidSourceTypes = { "GDELT", "RSS", "MediaCloud" };

    public CreateSourceRequestValidator()
    {
        RuleFor(x => x.Type).NotEmpty().Must(t => ValidSourceTypes.Contains(t))
            .WithMessage("Type must be GDELT, RSS, or MediaCloud.");
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Url).NotEmpty().MaximumLength(1000);
        RuleFor(x => x.FetchIntervalMinutes).InclusiveBetween(5, 1440);
    }
}

public class NewsSearchRequestValidator : AbstractValidator<NewsSearchRequest>
{
    public NewsSearchRequestValidator()
    {
        RuleFor(x => x.Page).GreaterThanOrEqualTo(1);
        RuleFor(x => x.PageSize).InclusiveBetween(1, 100);
        RuleFor(x => x.SortOrder).Must(s => s is "asc" or "desc");
    }
}

public class CreateUserRequestValidator : AbstractValidator<CreateUserRequest>
{
    private static readonly string[] ValidRoles = { "Viewer", "Editor", "CountryAdmin", "AUAdmin" };

    public CreateUserRequestValidator()
    {
        RuleFor(x => x.Username).NotEmpty().MaximumLength(100)
            .Matches("^[a-zA-Z0-9._-]+$").WithMessage("Username can only contain letters, numbers, dots, underscores, and hyphens.");
        RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(256);
        RuleFor(x => x.Password).NotEmpty().MinimumLength(6).MaximumLength(128);
        RuleFor(x => x.FullName).NotEmpty().MaximumLength(200);
        RuleFor(x => x.CountryCode).NotEmpty().Length(2);
        RuleFor(x => x.PreferredLanguage).NotEmpty().MaximumLength(10);
        RuleFor(x => x.Roles).NotEmpty().WithMessage("At least one role is required.");
        RuleForEach(x => x.Roles).Must(r => ValidRoles.Contains(r))
            .WithMessage("Invalid role. Valid roles: Viewer, Editor, CountryAdmin, AUAdmin.");
    }
}

public class UpdateUserRequestValidator : AbstractValidator<UpdateUserRequest>
{
    private static readonly string[] ValidRoles = { "Viewer", "Editor", "CountryAdmin", "AUAdmin" };

    public UpdateUserRequestValidator()
    {
        RuleFor(x => x.Email).EmailAddress().MaximumLength(256).When(x => x.Email != null);
        RuleFor(x => x.FullName).MaximumLength(200).When(x => x.FullName != null);
        RuleFor(x => x.CountryCode).Length(2).When(x => x.CountryCode != null);
        RuleFor(x => x.PreferredLanguage).MaximumLength(10).When(x => x.PreferredLanguage != null);
        RuleForEach(x => x.Roles).Must(r => ValidRoles.Contains(r))
            .WithMessage("Invalid role.").When(x => x.Roles != null);
    }
}

public class ChangePasswordRequestValidator : AbstractValidator<ChangePasswordRequest>
{
    public ChangePasswordRequestValidator()
    {
        RuleFor(x => x.CurrentPassword).NotEmpty();
        RuleFor(x => x.NewPassword).NotEmpty().MinimumLength(6).MaximumLength(128);
    }
}

public class ResetPasswordRequestValidator : AbstractValidator<ResetPasswordRequest>
{
    public ResetPasswordRequestValidator()
    {
        RuleFor(x => x.NewPassword).NotEmpty().MinimumLength(6).MaximumLength(128);
    }
}
