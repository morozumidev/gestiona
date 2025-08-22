import { Component, inject, OnInit, signal } from '@angular/core';
import { FormGroup, FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';

import { forkJoin, Observable, of } from 'rxjs';

import { Area } from '../../../models/Area';
import { Ticket } from '../../../models/Ticket';
import { Cuadrilla } from '../../../models/Cuadrilla';
import { AuthService } from '../../../services/auth.service';
import { TicketsService } from '../../../services/tickets-service';

@Component({
  selector: 'app-ticket-assignment-dialog',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule,
    MatInputModule
  ],
  templateUrl: './ticket-assignment-dialog.html',
  styleUrl: './ticket-assignment-dialog.scss'
})
export class TicketAssignmentDialog implements OnInit {
  private auth = inject(AuthService);
  private ticketsService = inject(TicketsService);
  private fb = inject(FormBuilder);
  public dialogRef = inject(MatDialogRef<TicketAssignmentDialog>);

  // ⬇️ sin DialogMode; usamos union type inline
  public data: { ticket: Ticket; areas: Area[]; mode?: 'assign' | 'reopen' } = inject(MAT_DIALOG_DATA);

  public mode: 'assign' | 'reopen' = 'assign';
  public areas: Area[] = [];
  public cuadrillas = signal<Cuadrilla[]>([]);
  public form!: FormGroup;

  public roleName: string = this.auth.currentUser?.role?.name ?? '';

  get isReopen(): boolean {
    return this.mode === 'reopen';
  }

  ngOnInit() {
    this.mode = this.data?.mode === 'reopen' ? 'reopen' : 'assign';
    this.areas = this.data?.areas ?? [];

    const lastAssignedArea =
      this.data?.ticket?.areaAssignments?.length
        ? this.data.ticket.areaAssignments[this.data.ticket.areaAssignments.length - 1].area
        : null;

    const lastValidAssignment = [...(this.data?.ticket?.crewAssignments ?? [])]
      .reverse()
      .find(a => a?.valid !== false);

    const lastAssignedCuadrilla = lastValidAssignment?.cuadrilla ?? null;

    // Área: en reopen SIEMPRE habilitada y requerida; en assign según permisos
    const areaDisabled = this.isReopen ? false : !this.canAssignArea();
    const areaValidators = this.isReopen
      ? [Validators.required]
      : (this.canAssignArea() ? [Validators.required] : []);

    // Cuadrilla: solo en assign y si aplica
    const cuadrillaDisabled = this.isReopen || !this.canAssignCuadrilla();

    this.form = this.fb.group({
      area: this.fb.control({ value: lastAssignedArea, disabled: areaDisabled }, areaValidators),
      cuadrilla: this.fb.control({ value: lastAssignedCuadrilla, disabled: cuadrillaDisabled }),
      reason: this.fb.control({ value: '', disabled: !this.isReopen }) // motivo solo para reopen
    });

    // Cargar cuadrillas solo en modo asignación
    const initialAreaId = this.canAssignArea()
      ? this.form.get('area')?.value
      : this.auth.currentUser?.area;

    if (!this.isReopen && this.canAssignCuadrilla() && initialAreaId) {
      this.loadCuadrillas(initialAreaId);
    }

    if (!this.isReopen && this.canAssignArea()) {
      this.form.get('area')?.valueChanges.subscribe((areaId: string) => {
        this.loadCuadrillas(areaId);
        this.form.get('cuadrilla')?.setValue(null);
      });
    }
  }

  loadCuadrillas(areaId: string) {
    if (!areaId) {
      this.cuadrillas.set([]);
      return;
    }
    this.ticketsService.getCuadrillas(areaId).subscribe({
      next: (cuads) => this.cuadrillas.set(cuads),
      error: (err) => console.error('Error al cargar cuadrillas:', err)
    });
  }

  canAssignArea(): boolean {
    return this.roleName === 'admin' || this.roleName === 'atencion';
  }

  canAssignCuadrilla(): boolean {
    if (this.isReopen) return false; // en reopen no se asigna cuadrilla
    const isAdmin = this.roleName === 'admin';
    const isFuncionario = this.roleName === 'funcionario';
    const userArea = this.auth.currentUser?.area;
    const lastAssignedArea = this.data.ticket.areaAssignments.at(-1)?.area;
    const isSameArea = userArea && lastAssignedArea && userArea === lastAssignedArea;
    return isAdmin || (isFuncionario && isSameArea);
  }

submit() {
  if (this.form.invalid) return;

  const ticket = this.data.ticket;
  const ticketId = ticket._id!;
  const { area, cuadrilla, reason } = this.form.getRawValue();

  if (this.isReopen) {
    this.ticketsService.reopenTicket({ ticketId, areaId: area, reason })
      .subscribe({
        next: () => this.dialogRef.close(true),
        error: (err) => console.error('Error al reabrir:', err)
      });
    return;
  }

  // --- previos ---
  const lastAreaAssign = ticket.areaAssignments.at(-1) ?? null;
  const lastValidCrew = [...(ticket.crewAssignments ?? [])].reverse().find(a => a?.valid !== false) ?? null;
  const previousArea = lastAreaAssign?.area ?? null;
  const previousCuadrilla = lastValidCrew?.cuadrilla ?? null;

  const areaChanged = this.canAssignArea() && area && String(area) !== String(previousArea);
  const areaNewerThanCrew =
    !!(lastAreaAssign?.assignedAt && lastValidCrew?.assignedAt) &&
    new Date(lastAreaAssign.assignedAt).getTime() > new Date(lastValidCrew.assignedAt).getTime();

  const needNewCrew =
    this.canAssignCuadrilla() &&
    !!cuadrilla &&
    (
      areaChanged ||
      areaNewerThanCrew ||
      !lastValidCrew ||
      lastValidCrew.valid === false ||
      String(cuadrilla) !== String(previousCuadrilla)
    );

  if (!areaChanged && !needNewCrew) {
    this.dialogRef.close(false);
    return;
  }

  const assignCrewThenClose = () => {
    if (!needNewCrew) { this.dialogRef.close(true); return; }
    this.ticketsService.assignCuadrilla(ticketId, cuadrilla).subscribe({
      next: () => this.dialogRef.close(true),
      error: (err) => console.error('Error asignando cuadrilla:', err)
    });
  };

  if (areaChanged) {
    // primero área, luego cuadrilla
    this.ticketsService.assignArea(ticketId, area).subscribe({
      next: () => assignCrewThenClose(),
      error: (err) => console.error('Error asignando área:', err)
    });
  } else {
    // solo cuadrilla
    assignCrewThenClose();
  }
}


  cancel() {
    this.dialogRef.close(false);
  }
}
function switchMap(arg0: () => Observable<any>): any {
  throw new Error('Function not implemented.');
}

