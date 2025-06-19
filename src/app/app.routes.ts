import { adminOnlyGuard } from './guards/admin.guard';
import { Routes } from '@angular/router';
import { Tickets } from './components/main/tickets/tickets';
import { NavigationComponent } from './components/main/navigation/navigation.component';
import { Dashboard } from './components/main/dashboard/dashboard';
import { NewTicket } from './components/forms/new-ticket/new-ticket';
import { DashboardAlumbrado } from './components/main/dashboard-alumbrado/dashboard-alumbrado';
import { NewTicketAlumbrado } from './components/forms/new-ticket-alumbrado/new-ticket-alumbrado';
import { Luminarias } from './components/main/luminarias/luminarias';
import { DashboardCuadrilla } from './components/main/dashboard-cuadrilla/dashboard-cuadrilla';
import { authGuard } from './guards/auth.guard';
import { Login } from './components/login/login/login';

export const routes: Routes = [
  { path: 'login', component: Login },
  { path: 'tickets', component: Tickets },
  { path: 'navigation', component: NavigationComponent },
  { path: 'dashboard', canActivate: [authGuard, adminOnlyGuard], component: Dashboard },
  { path: 'new-ticket', component: NewTicket },
  { path: 'dashboard-alumbrado', component: DashboardAlumbrado },
  { path: 'dashboard-cuadrilla', component: DashboardCuadrilla },
  { path: 'new-ticket-alumbrado', component: NewTicketAlumbrado },
  { path: 'luminarias', component: Luminarias },
  { path: '**', component: Dashboard },
];
