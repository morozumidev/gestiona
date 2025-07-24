import { Component, Inject, ViewEncapsulation } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { Ticket } from '../../../models/Ticket';

@Component({
  selector: 'app-edit-ticket-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatSelectModule,
    MatButtonModule
  ],
  templateUrl: './edit-ticket-dialog.html',
  styleUrl: './edit-ticket-dialog.scss',
  encapsulation: ViewEncapsulation.None
})
export class EditTicketDialog {
  form: FormGroup;
  estados = ['Pendiente', 'En desarrollo', 'Atendida'];

  constructor(
    public dialogRef: MatDialogRef<EditTicketDialog>,
    @Inject(MAT_DIALOG_DATA) public data: Ticket,
    private fb: FormBuilder,
    private router: Router
  ) {
    this.form = this.fb.group({
      folio: [data.folio],
      name: [data.name, Validators.required],
      phone: [data.phone, Validators.required],
      email: [data.email, Validators.required],
      source: [data.source],

      problem: [data.problem, Validators.required],
      description: [data.description, Validators.required],
      status: [data.status, Validators.required],
      location: this.fb.group({
        street: [data.location?.street],
        crossStreets: [data.location?.crossStreets],
        extNumber: [data.location?.extNumber],
        neighborhood: [data.location?.neighborhood],
        coordinates: this.fb.group({
          lat: [data.location?.coordinates?.lat],
          lng: [data.location?.coordinates?.lng]
        })
      }),
      images: [data.images ?? []],
      tracking: [data.tracking ?? []]
    });
  }

  guardar() {
    if (this.form.valid) {
      const editedTicket: Ticket = {
        ...this.data,
        ...this.form.value
      };
      this.dialogRef.close(editedTicket);
    }
  }

  irAEdicionCompleta() {
    this.dialogRef.close('full-edit');
  }

  cerrar() {
    this.dialogRef.close();
  }
}
