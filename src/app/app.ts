import {
  Component, inject, OnInit, OnDestroy, ViewEncapsulation, PLATFORM_ID
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { take, takeUntil } from 'rxjs';
import { Subject } from 'rxjs';

import { NavigationComponent } from './components/main/navigation/navigation.component';
import { MatIconRegistry } from '@angular/material/icon';
import { AuthService } from './services/auth.service';
import { SocketService } from './services/socket-service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavigationComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  encapsulation: ViewEncapsulation.None
})
export class App implements OnInit, OnDestroy {
  showNavigation = true;
  hydrated = false;
  isCollapsed = false;

  private noNavRoutes = ['/login', '/'];
  private readonly iconRegistry = inject(MatIconRegistry);
  private readonly auth = inject(AuthService);
  private readonly sockets = inject(SocketService);
  private readonly platformId = inject(PLATFORM_ID);
  private destroy$ = new Subject<void>();

  constructor(private router: Router) {
    this.iconRegistry.registerFontClassAlias('material-icons');
    this.iconRegistry.registerFontClassAlias('material-symbols-outlined');
    this.iconRegistry.registerFontClassAlias('material-symbols-rounded');
    this.iconRegistry.registerFontClassAlias('material-symbols-sharp');
    this.iconRegistry.setDefaultFontSetClass('material-symbols-outlined');
  }

  ngOnInit(): void {
    const currentUrl = this.router.url.split('?')[0].split('#')[0];
    this.showNavigation = !this.noNavRoutes.includes(currentUrl);

    this.router.events.pipe(take(1)).subscribe(() => {
      this.hydrated = true;
    });

    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        const url = event.urlAfterRedirects.split('?')[0].split('#')[0];
        this.showNavigation = !this.noNavRoutes.includes(url);
      }
    });

    // 🔌 sockets según sesión (única fuente de conexión)
    if (isPlatformBrowser(this.platformId)) {
      this.auth.user$
        .pipe(takeUntil(this.destroy$))
        .subscribe(user => {
          if (user) this.sockets.connect();
          else this.sockets.disconnect();
        });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.sockets.disconnect();
  }

  onNavToggle(): void {
    this.isCollapsed = !this.isCollapsed;
  }
}
