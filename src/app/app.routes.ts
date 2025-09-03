import { Routes } from '@angular/router';
import { canActivate } from './guards/auth.guard';

import { Login } from './components/login/login/login';
import { NavigationComponent } from './components/main/navigation/navigation.component';
import { Dashboard } from './components/main/dashboard/dashboard';
import { Luminarias } from './components/main/luminarias/luminarias';
import { Tickets } from './components/main/tickets/tickets';
import { TicketManagement } from './components/main/ticket/ticket';
import { SuccessDialog } from './components/dialogs/success-dialog/success-dialog';
import { UsersList } from './components/main/users-list/users-list';
import { UserForm } from './components/main/user-form/user-form';

export const routes: Routes = [
  // Redirección raíz
  { path: '', pathMatch: 'full', redirectTo: 'tickets' },

  // Público
  { path: 'login', component: Login },

  // Protegidas (todas con guard)
  {
    path: 'tickets',
    component: Tickets,
    canActivate: [canActivate],
    data: { roles: ['ALL'] },
  },
  {
    path: 'dashboard',
    component: Dashboard,
    canActivate: [canActivate],
    data: { roles: ['ALL'] },
  },
  {
    path: 'luminarias',
    component: Luminarias,
    canActivate: [canActivate],
    data: { roles: ['ALL'] },
  },
  {
    path: 'success-dialog',
    component: SuccessDialog,
    canActivate: [canActivate],
    data: { roles: ['ALL'] },
  },
  {
    path: 'users-list',
    component: UsersList,
    canActivate: [canActivate],
    data: { roles: ['admin'] },
  },
  {
    path: 'user-form/:id',
    component: UserForm,
    canActivate: [canActivate],             // ← **FALTABA**: evita que renderice sin sesión al recargar
    data: { roles: ['admin'] },
  },

  // (Opcional) Dejar navegación como ruta solo si la usas standalone
  {
    path: 'navigation',
    component: NavigationComponent,
    canActivate: [canActivate],
    data: { roles: ['ALL'] },
  },

  // Fallback
  { path: '**', redirectTo: 'tickets' },
];
