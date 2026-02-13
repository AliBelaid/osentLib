import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent)
  },
  {
    path: '',
    canActivate: [authGuard],
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
        path: 'alerts',
        loadComponent: () => import('./features/alerts/alert-list.component').then(m => m.AlertListComponent)
      },
      {
        path: 'alerts/rules',
        loadComponent: () => import('./features/alerts/alert-rules.component').then(m => m.AlertRulesComponent),
        canActivate: [roleGuard('CountryAdmin', 'AUAdmin')]
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
        path: 'dns/lookup',
        loadComponent: () => import('./features/dns/dns-lookup.component').then(m => m.DnsLookupComponent)
      },
      {
        path: 'dns/watchlist',
        loadComponent: () => import('./features/dns/domain-watchlist.component').then(m => m.DomainWatchlistComponent)
      }
    ]
  }
];
