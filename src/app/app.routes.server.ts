import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // Public, safe to prerender:
  { path: 'login', renderMode: RenderMode.Prerender },

  // Dynamic/protected pages → render per request (SSR), not prerender:
  { path: 'user-form/:id', renderMode: RenderMode.Server },
  { path: 'tickets', renderMode: RenderMode.Server },
  { path: 'areas', renderMode: RenderMode.Server },
  { path: 'catalogs', renderMode: RenderMode.Server },
  { path: 'cuadrillas', renderMode: RenderMode.Server },
  { path: 'roles', renderMode: RenderMode.Server },
  { path: 'ticket', renderMode: RenderMode.Server },
  { path: 'dashboard', renderMode: RenderMode.Server },
  { path: 'luminarias', renderMode: RenderMode.Server },
  { path: 'success-dialog', renderMode: RenderMode.Server },
  { path: 'users-list', renderMode: RenderMode.Server },
  { path: 'navigation', renderMode: RenderMode.Server },

  // Redirect root and everything else → SSR (prevents param errors on redirects):
  { path: '', renderMode: RenderMode.Server },
  { path: '**', renderMode: RenderMode.Server },
];
