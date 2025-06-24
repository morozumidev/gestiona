import { HttpClient } from '@angular/common/http';
import { DOCUMENT, Inject, Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';

import { CookieService } from 'ngx-cookie-service';

@Injectable({
  providedIn: 'root'
})
export class CoreService {
  baseUrl = ``;
  URI_API = ``;
  constructor(
    @Inject(DOCUMENT) private readonly document: any,
    private readonly http: HttpClient,
    public dialog: MatDialog,
    private readonly cookieService: CookieService,
    private readonly router: Router
  ) {
    this.baseUrl = `https://${this.document.location.hostname}:3087/`;
    this.URI_API = `${this.baseUrl}api/`;
  }
}
