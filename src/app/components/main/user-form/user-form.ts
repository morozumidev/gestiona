import {
  Component,
  inject,
  signal,
  computed,
  effect,
  afterNextRender,
  DestroyRef,
  untracked,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, ParamMap, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { map, distinctUntilChanged } from 'rxjs/operators';

import { UserService } from '../../../services/user-service';
import { TicketsService } from '../../../services/tickets-service';
import { User } from '../../../models/User';

export interface Area { _id: string; name: string; }
export interface Role { _id: string; name: string; }

@Component({
  standalone: true,
  selector: 'app-user-form',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,

    // Material
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatSnackBarModule,
  ],
  templateUrl: './user-form.html',
  styleUrl: './user-form.scss',
})
export class UserForm {
  // services
  private readonly service = inject(UserService);
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly ticketsService = inject(TicketsService);
  private readonly snack = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  // catálogos
  protected readonly areas = signal<Area[]>([]);
  protected readonly roles = signal<Role[]>([]);

  // id dinámico (controlado por la ruta)
  private readonly id = signal<string | null>(null);
  readonly isCreating = computed(() => this.id() === null);

  // título derivado (pintado sólo cuando viewReady=true)
  readonly title = computed(() => (this.isCreating() ? 'Crear usuario' : 'Editar usuario'));

  // gate post-hidratación
  readonly viewReady = signal(false);

  // state
  readonly loading = signal(false);

  // form
  readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    first_lastname: [''],
    second_lastname: [''],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    role: ['', [Validators.required]],
    area: [''],
    status: ['active', [Validators.required]],
    password: [''],
  });

  // evita cargas repetidas
  private lastLoadedId = signal<string | null>(null);

  constructor() {
    // 1) Cargar catálogos una sola vez
    this.loadCatalogs();

    // 2) Escuchar cambios de parámetros de la ruta (id | 'new')
    this.route.paramMap
      .pipe(
        map((p: ParamMap) => p.get('id')),
        map((raw) => (raw && raw !== 'new' ? raw : null)),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((newId) => {
        this.id.set(newId);
      });

    // 3) Reaccionar a cambios de modo (crear/editar) e id
    effect(() => {
      const currentId = this.id();

      // Alternar validadores de password según modo
      const pwd = this.form.get('password');
      if (this.isCreating()) {
        pwd?.setValidators([Validators.required, Validators.minLength(8)]);
      } else {
        pwd?.clearValidators();
        // En edición nunca dejamos password “arrastrada”
        pwd?.reset('', { emitEvent: false });
      }
      pwd?.updateValueAndValidity({ emitEvent: false });

      // Si estamos en edición y el id cambió, cargar desde BD
      if (currentId && currentId !== this.lastLoadedId()) {
        untracked(() => this.loadUser(currentId));
      }

      // Si pasamos a “crear”, limpiar form a estado base
      if (!currentId) {
        untracked(() => this.resetCreateForm());
      }
    });

    // 4) Evita NG0100 post-hidratación
    afterNextRender(() => this.viewReady.set(true));
  }

  // ---- Catálogos
  private loadCatalogs(): void {
    this.ticketsService.getAreas().subscribe({
      next: (data) => this.areas.set((data ?? []) as Area[]),
    });
    this.ticketsService.getRoles().subscribe({
      next: (data) => this.roles.set((data ?? []) as Role[]),
    });
  }

  // ---- Carga de usuario (edición)
  private loadUser(theId: string): void {
    this.loading.set(true);
    this.service.getById(theId).subscribe({
      next: (u: User) => {
        this.form.patchValue(
          {
            name: u.name,
            first_lastname: u.first_lastname ?? '',
            second_lastname: u.second_lastname ?? '',
            email: u.email,
            phone: u.phone ?? '',
            area: (u as any).area?._id ?? (u as any).area ?? '',
            role: (u as any).role?._id ?? (u as any).role ?? '',
            status: (u as any).status ?? this.form.get('status')?.value ?? 'active',
          },
          { emitEvent: false }
        );

        // normalización defensiva si backend manda objetos
        const roleVal = this.form.get('role')?.value as any;
        if (roleVal && typeof roleVal === 'object' && roleVal._id) {
          this.form.get('role')?.setValue(roleVal._id, { emitEvent: false });
        }
        const areaVal = this.form.get('area')?.value as any;
        if (areaVal && typeof areaVal === 'object' && areaVal._id) {
          this.form.get('area')?.setValue(areaVal._id, { emitEvent: false });
        }

        this.form.markAsPristine();
        this.form.markAsUntouched();
        this.lastLoadedId.set(theId);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  // ---- Estado base para “crear”
  private resetCreateForm(): void {
    this.form.reset(
      {
        name: '',
        first_lastname: '',
        second_lastname: '',
        email: '',
        phone: '',
        role: '',
        area: '',
        status: 'active',
        password: '',
      },
      { emitEvent: false }
    );
    this.form.markAsPristine();
    this.form.markAsUntouched();
    this.lastLoadedId.set(null);
  }

  private notifyOk(message: string): void {
    this.snack.open(message, 'Cerrar', {
      duration: 3500,
      horizontalPosition: 'right',
      verticalPosition: 'top',
    });
  }

  // ---- Guardar
  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    const payload = this.form.getRawValue();

    if (this.isCreating()) {
      this.service.create(payload as any).subscribe({
        next: (created: any) => {
          const newId = created?._id ?? created?.id ?? null;

          if (newId) {
            // Pasamos a modo edición y recargamos desde BD
            this.id.set(newId); // disparará loadUser por el effect
          } else {
            // No vino id: mantenemos datos básicos
            this.resetCreateForm();
            this.form.patchValue(
              {
                name: payload.name,
                first_lastname: payload.first_lastname ?? '',
                second_lastname: payload.second_lastname ?? '',
                email: payload.email,
                phone: payload.phone ?? '',
                role: payload.role ?? '',
                area: payload.area ?? '',
                status: payload.status ?? 'active',
              },
              { emitEvent: false }
            );
          }

          this.loading.set(false);
          this.notifyOk('Usuario creado');
        },
        error: () => this.loading.set(false),
      });
    } else {
      const { password, ...rest } = payload;
      const body = (password && (password as string).trim().length >= 8) ? payload : rest;

      const currentId = this.id()!;
      this.service.update(currentId, body as any).subscribe({
        next: () => {
          // Refrescamos desde BD y mostramos alerta
          this.loadUser(currentId);
          this.loading.set(false);
          this.notifyOk('Usuario actualizado');
        },
        error: () => this.loading.set(false),
      });
    }
  }
}
