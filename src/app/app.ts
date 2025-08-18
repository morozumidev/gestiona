import { Component,  inject,  OnInit, ViewEncapsulation } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { take } from 'rxjs';
import { NavigationComponent } from './components/main/navigation/navigation.component';
import { ThemeService } from './services/theme.service';
import { MatIconRegistry } from '@angular/material/icon';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavigationComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  encapsulation: ViewEncapsulation.None
})
export class App implements OnInit {
  showNavigation = true;
  hydrated = false;
  isCollapsed = false;

  private noNavRoutes = ['/login', '/'];
 private readonly iconRegistry = inject(MatIconRegistry);
  constructor(private router: Router,private themeService:ThemeService  ) {
 this.iconRegistry.registerFontClassAlias('material-icons');            // clásico
    this.iconRegistry.registerFontClassAlias('material-symbols-outlined'); // symbols
    this.iconRegistry.registerFontClassAlias('material-symbols-rounded');
    this.iconRegistry.registerFontClassAlias('material-symbols-sharp');

    // Default global (cámbialo a 'material-icons' si prefieres el set clásico)
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
  }

  onNavToggle(): void {
    this.isCollapsed = !this.isCollapsed;
  }

}
