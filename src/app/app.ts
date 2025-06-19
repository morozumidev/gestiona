import { Component, inject, ViewEncapsulation } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { NavigationComponent } from './components/main/navigation/navigation.component';
import { take } from 'rxjs';
@Component({
  selector: 'app-root',
  imports: [RouterOutlet,NavigationComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  encapsulation: ViewEncapsulation.None
})
export class App {
  showNavigation = true;
  hydrated = false; 
  isCollapsed = false;

  private noNavRoutes = ['/login', '/register', '/some-other-route'];

  constructor(private router: Router) {
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


  toggle() {
    this.isCollapsed = !this.isCollapsed;
  }
}
