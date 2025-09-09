import { CommonModule } from '@angular/common';
import { Component, inject, signal, computed, effect } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';

import { CuadrillasService } from '../../../services/cuadrillas-service';
import { UserLight, UserService, UsersSearchRequest } from '../../../services/user-service';
import { AreaService } from '../../../services/area-service';
import { TurnosService } from '../../../services/turnos-service';


@Component({
  selector: 'app-cuadrilla-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatChipsModule,
    MatIconModule,
  ],
  templateUrl: './cuadrilla-dialog.html',
  styleUrls: ['./cuadrilla-dialog.scss']
})
export class CuadrillaDialog {
  private fb = inject(NonNullableFormBuilder);
  private ref = inject(MatDialogRef<CuadrillaDialog>);
  private data = inject<any>(MAT_DIALOG_DATA);
  private svc = inject(CuadrillasService);
  private users = inject(UserService);
  private areas = inject(AreaService);
  private turnos = inject(TurnosService);

  isEdit = signal(!!this.data?._id);

  // Catálogos base
  areasList = signal<Array<{ _id: string; name: string }>>([]);
  turnosList = signal<Array<{ _id: string; name: string }>>([]);

  // Catálogos dependientes
  /** Todos los usuarios activos del área seleccionada */
  areaUsers = signal<UserLight[]>([]);
  /** Solo supervisores del área seleccionada */
  supervisors = signal<UserLight[]>([]);
  /** Miembros disponibles del área (no ocupados en otra cuadrilla) */
  availableMembers = signal<UserLight[]>([]);
  /** Usuarios ocupados en el área (supervisor o miembro en cualquier cuadrilla) */
  private busyUserIds = signal<Set<string>>(new Set());

  // Form
  form = this.fb.group({
    name: this.fb.control(this.data?.name ?? '', { validators: [Validators.required, Validators.minLength(2)] }),
    shift: this.fb.control<string | null>(this.data?.shift?._id ?? this.data?.shift ?? null), // 1) turno
    area: this.fb.control<string>(this.data?.area?._id ?? this.data?.area ?? '', { validators: [Validators.required] }), // 2) área
    supervisor: this.fb.control<string>(this.data?.supervisor?._id ?? this.data?.supervisor ?? '', { validators: [Validators.required] }), // 3) supervisor
    members: this.fb.control<string[]>(
      Array.isArray(this.data?.members) ? this.data.members.map((m: any) => m._id ?? m) : [],
      { validators: [Validators.required] }
    ), // 4) miembros
    available: this.fb.control<boolean>(this.data?.available ?? true),
  });

  // Accesos rápidos a valores
  shiftId = computed(() => this.form.controls.shift.value);
  areaId  = computed(() => this.form.controls.area.value);

  constructor() {
    // Cargar catálogos iniciales (turnos/áreas)
    this.turnos.getAll().subscribe({
      next: (r) => this.turnosList.set(Array.isArray(r) ? r : []),
      error: () => this.turnosList.set([])
    });

    this.areas.getAll().subscribe({
      next: (r) => this.areasList.set(Array.isArray(r) ? r : []),
      error: () => this.areasList.set([])
    });

    // Encadenamiento: cuando cambia el área -> recargar usuarios (supervisores y miembros)
    effect(() => {
      const area = this.areaId();
      if (!area) {
        this.areaUsers.set([]);
        this.supervisors.set([]);
        this.availableMembers.set([]);
        this.busyUserIds.set(new Set());
        // Resetea supervisor/miembros si cambió a vacío
        this.form.patchValue({ supervisor: '', members: [] }, { emitEvent: false });
        return;
      }
      this.loadAreaUsersAndBusy(area);
    });

    // En edición: si ya viene área, cargar dependientes
    if (this.isEdit() && this.areaId()) {
      this.loadAreaUsersAndBusy(this.areaId()!);
    }

    // Si cambia el turno, simplemente habilita el select de área (no hay dependencia de datos)
    // Opcional: podrías filtrar áreas por turno si tu modelo lo requiere.
  }

  /** Carga usuarios del área y calcula supervisores/miembros disponibles (excluye ocupados). */
private loadAreaUsersAndBusy(areaId: string) {
  const baseReq: UsersSearchRequest = {
    page: 1,
    pageSize: 200,
    filters: { area: areaId },
    sort: { field: 'name', direction: 'asc' }
  };

  const supReq: UsersSearchRequest = {
    ...baseReq,
    filters: { ...baseReq.filters, role: 'supervisor' } // filtra por role.name/code
  };

  // 1) Trae IDs ocupados en esa área
  this.svc.listBusyUserIds(areaId).subscribe({
    next: ({ ids }) => {
      const busy = new Set(ids ?? []);
      // En edición, permite los actuales
      if (this.isEdit()) {
        const currentSup = String(this.form.controls.supervisor.value || '');
        if (currentSup) busy.delete(currentSup);
        (this.form.controls.members.value || []).forEach(m => busy.delete(String(m)));
      }
      this.busyUserIds.set(busy);

      // 2) Candidatos a miembros (usuarios del área activos)
this.users.searchLight(baseReq).subscribe({
  next: (list) => {
    this.areaUsers.set(list);
    this.availableMembers.set(list.filter(u => !this.busyUserIds().has(String(u._id))));
  },
  error: () => { this.areaUsers.set([]); this.availableMembers.set([]); }
});

this.users.searchLight(supReq).subscribe({
  next: (list) => {
    this.supervisors.set(list.filter(u => !this.busyUserIds().has(String(u._id))));
  },
  error: () => this.supervisors.set([])
});
    },
    error: () => {
  // Fallback: sin excluir ocupados
  this.busyUserIds.set(new Set());

  this.users.searchLight(baseReq).subscribe({
    next: (list) => {
      this.areaUsers.set(list);          // list: UserLight[]
      this.availableMembers.set(list);   // sin exclusiones
    },
    error: () => { this.areaUsers.set([]); this.availableMembers.set([]); }
  });

  this.users.searchLight(supReq).subscribe({
    next: (list) => this.supervisors.set(list), // list: UserLight[]
    error: () => this.supervisors.set([])
  });
}

  });

  // Resetea selección dependiente
  this.form.patchValue({ supervisor: '', members: [] }, { emitEvent: false });
}


  // === Acciones ===
  toggleAvailable() {
    this.form.patchValue({ available: !this.form.value.available }, { emitEvent: false });
  }

  save() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const val = this.form.getRawValue();

    // Garantizar supervisor en members
    const members = Array.from(new Set([...(val.members ?? []), val.supervisor]));

    const payload = {
      name: val.name,
      supervisor: val.supervisor,
      members,
      available: val.available,
      area: val.area,
      ...(val.shift ? { shift: val.shift } : {}) // omite si es null
    };

    (this.isEdit()
      ? this.svc.update(this.data._id, payload)
      : this.svc.create(payload as any)
    ).subscribe({
      next: (r) => this.ref.close(r),
      error: () => this.ref.close({ ok: false })
    });
  }

  close() { this.ref.close(); }
}
