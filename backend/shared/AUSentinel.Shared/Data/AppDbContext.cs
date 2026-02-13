using AUSentinel.Shared.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace AUSentinel.Shared.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<UserProfile> UserProfiles => Set<UserProfile>();
    public DbSet<Role> Roles => Set<Role>();
    public DbSet<UserRole> UserRoles => Set<UserRole>();
    public DbSet<Country> Countries => Set<Country>();
    public DbSet<Source> Sources => Set<Source>();
    public DbSet<Article> Articles => Set<Article>();
    public DbSet<ArticleEntity> ArticleEntities => Set<ArticleEntity>();
    public DbSet<ArticleCountryTag> ArticleCountryTags => Set<ArticleCountryTag>();
    public DbSet<Classification> Classifications => Set<Classification>();
    public DbSet<Vote> Votes => Set<Vote>();
    public DbSet<Bulletin> Bulletins => Set<Bulletin>();
    public DbSet<BulletinAttachment> BulletinAttachments => Set<BulletinAttachment>();
    public DbSet<AlertRule> AlertRules => Set<AlertRule>();
    public DbSet<Alert> Alerts => Set<Alert>();
    public DbSet<AlertDelivery> AlertDeliveries => Set<AlertDelivery>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Country>(e =>
        {
            e.HasKey(c => c.Code);
            e.Property(c => c.Code).HasMaxLength(2).IsFixedLength();
        });

        modelBuilder.Entity<User>(e =>
        {
            e.HasIndex(u => u.Username).IsUnique();
            e.HasIndex(u => u.Email).IsUnique();
            e.HasOne(u => u.Country).WithMany(c => c.Users).HasForeignKey(u => u.CountryCode);
        });

        modelBuilder.Entity<UserProfile>(e =>
        {
            e.HasIndex(up => up.UserId).IsUnique();
            e.HasOne(up => up.User).WithOne(u => u.Profile).HasForeignKey<UserProfile>(up => up.UserId).OnDelete(DeleteBehavior.Cascade);
            e.Property(up => up.Bio).HasMaxLength(500);
            e.Property(up => up.AvatarUrl).HasMaxLength(500);
            e.Property(up => up.Organization).HasMaxLength(200);
            e.Property(up => up.JobTitle).HasMaxLength(100);
            e.Property(up => up.PhoneNumber).HasMaxLength(20);
            e.Property(up => up.LinkedInUrl).HasMaxLength(200);
            e.Property(up => up.TwitterHandle).HasMaxLength(50);
        });

        modelBuilder.Entity<UserRole>(e =>
        {
            e.HasKey(ur => new { ur.UserId, ur.RoleId });
            e.HasOne(ur => ur.User).WithMany(u => u.UserRoles).HasForeignKey(ur => ur.UserId);
            e.HasOne(ur => ur.Role).WithMany(r => r.UserRoles).HasForeignKey(ur => ur.RoleId);
        });

        modelBuilder.Entity<Article>(e =>
        {
            e.HasIndex(a => a.DedupHash).IsUnique();
            e.HasIndex(a => a.PublishedAt);
            e.HasOne(a => a.Source).WithMany(s => s.Articles).HasForeignKey(a => a.SourceId);
        });

        modelBuilder.Entity<ArticleEntity>(e =>
        {
            e.HasOne(ae => ae.Article).WithMany(a => a.Entities).HasForeignKey(ae => ae.ArticleId);
        });

        modelBuilder.Entity<ArticleCountryTag>(e =>
        {
            e.HasKey(act => new { act.ArticleId, act.CountryCode });
            e.HasOne(act => act.Article).WithMany(a => a.CountryTags).HasForeignKey(act => act.ArticleId);
            e.HasOne(act => act.Country).WithMany(c => c.ArticleCountryTags).HasForeignKey(act => act.CountryCode);
        });

        modelBuilder.Entity<Classification>(e =>
        {
            e.HasIndex(c => c.ArticleId).IsUnique();
            e.HasOne(c => c.Article).WithOne(a => a.Classification).HasForeignKey<Classification>(c => c.ArticleId);
        });

        modelBuilder.Entity<Vote>(e =>
        {
            e.HasIndex(v => new { v.ArticleId, v.UserId }).IsUnique();
            e.HasOne(v => v.Article).WithMany(a => a.Votes).HasForeignKey(v => v.ArticleId);
            e.HasOne(v => v.User).WithMany(u => u.Votes).HasForeignKey(v => v.UserId);
        });

        modelBuilder.Entity<Bulletin>(e =>
        {
            e.HasIndex(b => b.CountryCode);
            e.HasIndex(b => b.Status);
            e.HasOne(b => b.Country).WithMany().HasForeignKey(b => b.CountryCode);
            e.HasOne(b => b.CreatedByUser).WithMany().HasForeignKey(b => b.CreatedByUserId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(b => b.PublishedByUser).WithMany().HasForeignKey(b => b.PublishedByUserId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<BulletinAttachment>(e =>
        {
            e.HasOne(ba => ba.Bulletin).WithMany(b => b.Attachments).HasForeignKey(ba => ba.BulletinId);
        });

        modelBuilder.Entity<AlertRule>(e =>
        {
            e.HasOne(ar => ar.Country).WithMany().HasForeignKey(ar => ar.CountryCode);
            e.HasOne(ar => ar.CreatedByUser).WithMany().HasForeignKey(ar => ar.CreatedByUserId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Alert>(e =>
        {
            e.HasIndex(a => a.CountryCode);
            e.HasIndex(a => a.IsActive);
            e.HasOne(a => a.AlertRule).WithMany(ar => ar.Alerts).HasForeignKey(a => a.AlertRuleId);
            e.HasOne(a => a.Article).WithMany().HasForeignKey(a => a.ArticleId).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<AlertDelivery>(e =>
        {
            e.HasOne(ad => ad.Alert).WithMany(a => a.Deliveries).HasForeignKey(ad => ad.AlertId);
            e.HasOne(ad => ad.User).WithMany().HasForeignKey(ad => ad.UserId);
        });

        modelBuilder.Entity<AuditLog>(e =>
        {
            e.HasIndex(al => al.Timestamp);
            e.HasIndex(al => al.UserId);
        });
    }
}
