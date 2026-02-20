import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  {
    path: 'welcome',
    loadComponent: () => import('./features/landing/landing.component').then(m => m.LandingComponent)
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent)
  },
  {
    path: '',
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'profile',
        loadComponent: () => import('./features/profile/profile.component').then(m => m.ProfileComponent)
      },
      {
        path: 'bookmarks',
        loadComponent: () => import('./features/bookmarks/bookmarks.component').then(m => m.BookmarksComponent)
      },
      {
        path: 'leaderboard',
        loadComponent: () => import('./features/leaderboard/leaderboard.component').then(m => m.LeaderboardComponent)
      },
      {
        path: 'news',
        loadComponent: () => import('./features/news/news-list.component').then(m => m.NewsListComponent)
      },
      {
        path: 'news/:id',
        loadComponent: () => import('./features/news/news-detail.component').then(m => m.NewsDetailComponent)
      },
      {
        path: 'bulletins',
        loadComponent: () => import('./features/bulletins/bulletin-list.component').then(m => m.BulletinListComponent)
      },
      {
        path: 'bulletins/new',
        loadComponent: () => import('./features/bulletins/bulletin-form.component').then(m => m.BulletinFormComponent),
        canActivate: [roleGuard('Editor', 'CountryAdmin', 'AUAdmin')]
      },
      {
        path: 'bulletins/:id/edit',
        loadComponent: () => import('./features/bulletins/bulletin-form.component').then(m => m.BulletinFormComponent),
        canActivate: [roleGuard('Editor', 'CountryAdmin', 'AUAdmin')]
      },
      {
        path: 'submit-report',
        loadComponent: () => import('./features/reports/submit-report.component').then(m => m.SubmitReportComponent)
      },
      {
        path: 'intelligence',
        loadComponent: () => import('./features/intel/intel-list.component').then(m => m.IntelListComponent)
      },
      {
        path: 'intelligence/new',
        loadComponent: () => import('./features/intel/intel-form.component').then(m => m.IntelFormComponent),
        canActivate: [roleGuard('DataEntry', 'Editor', 'CountryAdmin', 'AUAdmin')]
      },
      {
        path: 'intelligence/:id',
        loadComponent: () => import('./features/intel/intel-detail.component').then(m => m.IntelDetailComponent)
      },
      {
        path: 'intelligence/:id/edit',
        loadComponent: () => import('./features/intel/intel-form.component').then(m => m.IntelFormComponent),
        canActivate: [roleGuard('DataEntry', 'Editor', 'CountryAdmin', 'AUAdmin')]
      },
      {
        path: 'alerts',
        loadComponent: () => import('./features/alerts/alert-list.component').then(m => m.AlertListComponent)
      },
      {
        path: 'alerts/rules',
        loadComponent: () => import('./features/alerts/alert-rules.component').then(m => m.AlertRulesComponent),
        canActivate: [roleGuard('CountryAdmin', 'AUAdmin')]
      },
      {
        path: 'maps',
        loadComponent: () => import('./features/maps/maps-layout.component').then(m => m.MapsLayoutComponent),
        children: [
          { path: '', redirectTo: 'threats', pathMatch: 'full' },
          {
            path: 'threats',
            loadComponent: () => import('./features/maps/threat-map/threat-map.component').then(m => m.ThreatMapComponent)
          },
          {
            path: 'alerts',
            loadComponent: () => import('./features/maps/alert-map/alert-map.component').then(m => m.AlertMapComponent)
          },
          {
            path: 'timeline',
            loadComponent: () => import('./features/maps/timeline-map/timeline-map.component').then(m => m.TimelineMapComponent)
          }
        ]
      },
      {
        path: 'admin/sources',
        loadComponent: () => import('./features/admin/sources.component').then(m => m.SourcesComponent),
        canActivate: [roleGuard('AUAdmin')]
      },
      {
        path: 'admin/users',
        loadComponent: () => import('./features/admin/users.component').then(m => m.UsersComponent),
        canActivate: [roleGuard('CountryAdmin', 'AUAdmin')]
      },
      {
        path: 'search/advanced',
        loadComponent: () => import('./features/search/advanced-search.component').then(m => m.AdvancedSearchComponent)
      },
      {
        path: 'search/keywords',
        loadComponent: () => import('./features/search/keyword-manager.component').then(m => m.KeywordManagerComponent)
      },
      {
        path: 'admin/import',
        loadComponent: () => import('./features/admin/import-jobs.component').then(m => m.ImportJobsComponent),
        canActivate: [roleGuard('CountryAdmin', 'AUAdmin')]
      },
      {
        path: 'maltego',
        loadComponent: () => import('./features/maltego/maltego-graph.component').then(m => m.MaltegoGraphComponent)
      },
      {
        path: 'social-search',
        loadComponent: () => import('./features/social-search/social-search.component').then(m => m.SocialSearchComponent)
      },
      {
        path: 'dns/lookup',
        loadComponent: () => import('./features/dns/dns-lookup.component').then(m => m.DnsLookupComponent)
      },
      {
        path: 'dns/watchlist',
        loadComponent: () => import('./features/dns/domain-watchlist.component').then(m => m.DomainWatchlistComponent)
      },
      {
        path: 'cyber/threats',
        loadComponent: () => import('./features/cyber/threat-intel.component').then(m => m.ThreatIntelComponent)
      },
      {
        path: 'cyber/attack-map',
        loadComponent: () => import('./features/cyber/attack-map.component').then(m => m.AttackMapComponent)
      },
      {
        path: 'cyber/countries',
        loadComponent: () => import('./features/cyber/country-intel.component').then(m => m.CountryIntelComponent)
      },
      {
        path: 'cyber/incidents',
        loadComponent: () => import('./features/cyber/incident-tracker.component').then(m => m.IncidentTrackerComponent)
      },
      {
        path: 'osint-tools',
        loadComponent: () => import('./features/osint-tools/osint-tools.component').then(m => m.OsintToolsComponent)
      }
    ]
  }
];
