import { Component, inject, OnInit, signal } from '@angular/core';
import { FormGroup, FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { Area } from '../../../models/Area';
import { Ticket } from '../../../models/Ticket';
import { AuthService } from '../../../services/auth.service';
import { TicketsService } from '../../../services/tickets-service';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { Cuadrilla } from '../../../models/Cuadrilla';

@Component({
  selector: 'app-ticket-assignment-dialog',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule
  ],
  templateUrl: './ticket-assignment-dialog.html',
  styleUrl: './ticket-assignment-dialog.scss'
})
export class TicketAssignmentDialog implements OnInit {
  private auth = inject(AuthService);
  private ticketsService = inject(TicketsService);
  public dialogRef = inject(MatDialogRef<TicketAssignmentDialog>);
  public data: { ticket: Ticket; areas: Area[] } = inject(MAT_DIALOG_DATA);
  public cuadrillas = signal<Cuadrilla[]>([]);
  public form!: FormGroup;
  public areas: Area[] = [];
  public roleName: string = '';

  ngOnInit() {
    this.roleName = this.auth.currentUser.role.name;
    this.areas = this.data.areas;

    const lastAssignedArea = this.data.ticket.areaAssignments.at(-1)?.area ?? null;
    const lastAssignedCuadrilla = this.data.ticket.crewAssignments?.at(-1)?.cuadrilla ?? null;

    const areaControl = new FormBuilder().control(
      { value: lastAssignedArea, disabled: !this.canAssignArea() },
      this.canAssignArea() ? Validators.required : []
    );

    const cuadrillaControl = new FormBuilder().control(
      { value: lastAssignedCuadrilla, disabled: !this.canAssignCuadrilla() }
    );

    this.form = new FormBuilder().group({
      area: areaControl,
      cuadrilla: cuadrillaControl
    });

    const initialAreaId = this.canAssignArea()
      ? this.form.get('area')?.value
      : this.auth.currentUser.area;

    if (this.canAssignCuadrilla() && initialAreaId) {
      this.loadCuadrillas(initialAreaId);
    }

    if (this.canAssignArea()) {
      this.form.get('area')?.valueChanges.subscribe((areaId: string) => {
        this.loadCuadrillas(areaId);
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
    const isAdmin = this.roleName === 'admin';
    const isFuncionario = this.roleName === 'funcionario';
    const userArea = this.auth.currentUser?.area;
    const lastAssignedArea = this.data.ticket.areaAssignments.at(-1)?.area;
    const isSameArea = userArea && lastAssignedArea && userArea === lastAssignedArea;
    return isAdmin || (isFuncionario && isSameArea);
  }

  submit() {
    if (this.form.invalid) return;
    const { area, cuadrilla } = this.form.value;
    const ticketId = this.data.ticket._id!;
    const previousArea = this.data.ticket.areaAssignments.at(-1)?.area;
    const previousCuadrilla = this.data.ticket.crewAssignments?.at(-1)?.cuadrilla;

    const ops: any[] = [];

    if (this.canAssignArea() && area && area !== previousArea) {
      ops.push(this.ticketsService.assignArea(ticketId, area));
    }

    if (this.canAssignCuadrilla() && cuadrilla && cuadrilla !== previousCuadrilla) {
      ops.push(this.ticketsService.assignCuadrilla(ticketId, cuadrilla));
    }

    Promise.all(ops.map(obs => obs.toPromise()))
      .then(() => this.dialogRef.close(true))
      .catch(err => {
        console.error('Error en asignación:', err);
      });
  }

  cancel() {
    this.dialogRef.close(false);
  }
}
