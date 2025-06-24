import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import {
  trigger,
  state,
  style,
  animate,
  transition,
} from '@angular/animations';
import { Router } from '@angular/router';
import { CookieService } from 'ngx-cookie-service';

interface NavItem {
  icon: string;
  label: string;
  route?: string;
  externalUrl?: string;
}

@Component({
  selector: 'app-navigation',
  standalone: true,
  imports: [CommonModule, MatSidenavModule, MatIconModule, MatButtonModule],
  templateUrl: './navigation.component.html',
  styleUrls: ['./navigation.component.scss'],
  animations: [
    trigger('slideInOut', [
      state('in', style({ width: '220px' })),
      state('out', style({ width: '64px' })),
      transition('in <=> out', animate('250ms ease-in-out')),
    ]),
  ],
})
export class NavigationComponent {
  NAV_ITEMS_BY_ROLE: Record<string, NavItem[]> = {
    movil: [
      { icon: 'add', label: 'Generar reporte', route: '/new-ticket' },
      { icon: 'history', label: 'Historial de reportes', route: '/new-ticket' },
    ],
    atencion: [
      { icon: 'dashboard', label: 'Dashboard', route: '/tickets' },
      { icon: 'add', label: 'Generar reporte', route: '/new-ticket' },
    ],
    alumbrado: [
      { icon: 'dashboard', label: 'Dashboard', route: '/dashboard-alumbrado' },
      { icon: 'add', label: 'Generar reporte', route: '/new-ticket' },
      { icon: 'lightbulb', label: 'Luminarias', route: '/luminarias' },
      {
        icon: 'gps_fixed',
        label: "Ver GPS's",
        externalUrl: 'https://viiralogistics.com/',
      },
      {
        icon: 'map',
        label: 'Mapa interactivo',
        externalUrl:
          'https://www.google.com/maps/d/embed?mid=1XyTGGmoo8GdUUdUlB24ySUCdRcGMOWw&ehbc=2E312F',
      },
    ],
    admin: [
      { icon: 'dashboard', label: 'Dashboard', route: '/dashboard' },
      {
        icon: 'model_training',
        label: 'Alumbrado',
        route: '/dashboard-alumbrado',
      },
      { icon: 'engineering', label: 'Matenimiento Urban', route: '/tickets' },
      { icon: 'recycling', label: 'Limpia Publica', route: '/tickets' },
      { icon: 'table_chart_view', label: 'Reportes', route: '/tickets' },
      { icon: 'currency_exchange', label: 'Cobro Municipal', route: '/tickets' },
      { icon: 'holiday_village', label: 'Catastro', route: '/tickets' },
     // { icon: 'local_car_wash', label: 'Transito', route: '/tickets' },

      { icon: 'price_check', label: 'Predial', route: '/tickets' },
      { icon: 'add', label: 'Generar reporte', route: '/new-ticket' },
      { icon: 'lightbulb', label: 'Luminarias', route: '/luminarias' },
      {
        icon: 'gps_fixed',
        label: "Ver GPS's",
        externalUrl: 'https://viiralogistics.com/',
      },
      {
        icon: 'map',
        label: 'Mapa interactivo',
        externalUrl:
          'https://www.google.com/maps/d/embed?mid=1XyTGGmoo8GdUUdUlB24ySUCdRcGMOWw&ehbc=2E312F',
      },
    ],
    web: [{ icon: 'add', label: 'Generar reporte', route: '/new-ticket' }],
  };

  navItems: NavItem[] = [];


  constructor(private router: Router, private cookieService: CookieService) {
    const role = this.cookieService.get("user");
    this.navItems = role ? this.NAV_ITEMS_BY_ROLE[role] || [] : [];
  }

  navigate(item: NavItem) {
    if (item.externalUrl) {
      window.open(item.externalUrl, '_blank');
    } else if (item.route) {
      this.router.navigate([item.route]);
    }
  }

  logout() {
    this.cookieService.delete('user');
    this.router.navigate(['/login']);
  }
@Input() isCollapsed = false;
@Output() isCollapsedChange = new EventEmitter<boolean>();

onToggle() {
  this.isCollapsed = !this.isCollapsed;
  this.isCollapsedChange.emit(this.isCollapsed);
}

}
