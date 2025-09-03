import { Component, inject, signal, computed, effect, afterNextRender } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
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
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
  ],
  templateUrl: './user-form.html',
  styleUrl: './user-form.scss',
})
export class UserForm {
  // services
  private readonly service = inject(UserService);
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly ticketsService = inject(TicketsService);

  // catalogs
  protected readonly areas = signal<Area[]>([]);
  protected readonly roles = signal<Role[]>([]);

  /**
   * Clave para evitar NG0100 en hidratación:
   * - Fijamos id y título sin mutar señales después del primer CD.
   * - Renderizamos la vista sólo cuando viewReady() === true (siguiente tick).
   */
  private readonly paramId = this.route.snapshot.paramMap.get('id');
  private readonly id = signal<string | null>(this.paramId && this.paramId !== 'new' ? this.paramId : null);
  readonly isCreating = computed(() => this.id() === null);

  // título derivado, pero no se pinta hasta viewReady=true
  readonly title = computed(() => (this.isCreating() ? 'Crear usuario' : 'Editar usuario'));

  // gate de render para evitar ExpressionChangedAfter... en F5 con SSR/hydration
  readonly viewReady = signal(false);

  // state
  readonly loading = signal(false);

  // reactive form (sin [value] en selects)
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

  constructor() {
    // Carga catálogos
    this.loadCatalogs();

    // Si es edición, cargar el usuario; si es creación, exigir contraseña
    if (this.isCreating()) {
      this.form.get('password')?.setValidators([Validators.required, Validators.minLength(8)]);
      this.form.get('password')?.updateValueAndValidity({ emitEvent: false });
    } else {
      this.loadUser();
    }

    // Normalización defensiva si backend manda objeto en lugar de string
    effect(() => {
      const roleVal = this.form.get('role')?.value as any;
      if (roleVal && typeof roleVal === 'object' && roleVal._id) {
        this.form.get('role')?.setValue(roleVal._id, { emitEvent: false });
      }
      const areaVal = this.form.get('area')?.value as any;
      if (areaVal && typeof areaVal === 'object' && areaVal._id) {
        this.form.get('area')?.setValue(areaVal._id, { emitEvent: false });
      }
    });

    /**
     * Diferimos el render una microtarea después del primer ciclo.
     * Esto elimina el NG0100 causado por diferencias entre HTML inicial (SSR/hidratación)
     * y el estado que se fija sincrónicamente en constructor.
     */
    afterNextRender(() => {
      this.viewReady.set(true);
    });
  }

  private loadCatalogs(): void {
    this.ticketsService.getAreas().subscribe({
      next: (data) => this.areas.set((data ?? []) as Area[]),
    });
    this.ticketsService.getRoles().subscribe({
      next: (data) => this.roles.set((data ?? []) as Role[]),
    });
  }

  private loadUser(): void {
    const theId = this.id();
    if (!theId) return;

    this.loading.set(true);
    this.service.getById(theId).subscribe({
      next: (u: User) => {
        this.form.patchValue({
          name: u.name,
          first_lastname: u.first_lastname ?? '',
          second_lastname: u.second_lastname ?? '',
          email: u.email,
          phone: u.phone ?? '',
          area: (u as any).area?._id ?? (u as any).area ?? '',
          role: (u as any).role?._id ?? (u as any).role ?? '',
        }, { emitEvent: false });

        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    const payload = this.form.getRawValue();

    if (this.isCreating()) {
      this.service.create(payload as any).subscribe({
        next: () => {
          this.loading.set(false);
          this.router.navigate(['/users']);
        },
        error: () => this.loading.set(false),
      });
    } else {
      const { password, ...rest } = payload;
      const body = (password && (password as string).trim().length >= 8) ? payload : rest;
      this.service.update(this.id()!, body as any).subscribe({
        next: () => {
          this.loading.set(false);
          this.router.navigate(['/users']);
        },
        error: () => this.loading.set(false),
      });
    }
  }
}
