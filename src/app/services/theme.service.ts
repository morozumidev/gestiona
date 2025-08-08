import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable, tap } from "rxjs";
import { CoreService } from "./core-service";

@Injectable({ providedIn: 'root' })
export class ThemeService {
    

  constructor(private readonly http: HttpClient,private coreService:CoreService) {}


  loadTheme(): Observable<{ theme: string }> {
  return this.http.post<{ theme: string }>(
    `${this.coreService.URI_API}settings/getTheme`, {}
  );
}


  updateTheme(theme: string): Observable<any> {
    return this.http.post(`${this.coreService.URI_API}settings/updateTheme`, { theme });
  }
}
