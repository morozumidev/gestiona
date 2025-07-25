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
  imports: [CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule],
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
  public roleName: string = "";

ngOnInit() {
  this.roleName = this.auth.currentUser.role.name;
  this.areas = this.data.areas;

  const ticketArea = this.data.ticket.currentArea;
  const areaControl = new FormBuilder().control(
    { value: ticketArea || null, disabled: !this.canAssignArea() },
    this.canAssignArea() ? Validators.required : []
  );

  const cuadrillaControl = new FormBuilder().control(
    { value: this.data.ticket.currentCuadrilla || null, disabled: !this.canAssignCuadrilla() },
    this.canAssignCuadrilla() ? Validators.required : []
  );

  this.form = new FormBuilder().group({
    area: areaControl,
    cuadrilla: cuadrillaControl
  });

  // carga cuadrillas dependiendo del rol y área inicial
  if (this.canAssignCuadrilla()) {
    const initialAreaId = this.canAssignArea()
      ? this.form.get('area')?.value
      : this.auth.currentUser.area;

    if (initialAreaId) {
      this.loadCuadrillas(initialAreaId);
    }
  }

  // si puede cambiar el área, escucha cambios y recarga cuadrillas
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
  const ticketArea = this.data.ticket?.currentArea;
  const isSameArea = userArea && ticketArea && userArea === ticketArea;
  return isAdmin || (isFuncionario && isSameArea);
}


  submit() {
    if (this.form.invalid) return;
    const { area, cuadrilla } = this.form.value;
    const ticketId = this.data.ticket._id!;
    const currentArea = this.data.ticket.currentArea;
    const currentCuadrilla = this.data.ticket.currentCuadrilla;

    const ops: any[] = [];
    if (this.canAssignArea() && area && area !== currentArea) {
      ops.push(this.ticketsService.assignArea(ticketId, area));
    }
    if (this.canAssignCuadrilla() && cuadrilla && cuadrilla !== currentCuadrilla) {
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