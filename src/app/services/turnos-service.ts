import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { CoreService } from './core-service';
import { Turno } from '../models/Turno';
import { map, Observable } from 'rxjs';

export type TurnoLight = { _id: string; name: string };

@Injectable({ providedIn: 'root' })
export class TurnosService {
  private readonly http = inject(HttpClient);
  private readonly core = inject(CoreService);
  private readonly base = `${this.core.URI_API}catalogs`;

  getAll(): Observable<TurnoLight[]> {
    return this.http.post<Turno[]>(`${this.base}/turnos`, {}).pipe(
      map(items => Array.isArray(items) ? items : []),
      map(items =>
        items
          .filter(i => i && typeof i._id === 'string' && !!i.name)
          .map(i => ({ _id: i._id as string, name: i.name }))
      )
    );
  }
}
