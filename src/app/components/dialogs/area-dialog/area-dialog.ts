import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AreaService } from '../../../services/area-service';
import { Area } from '../../../models/Area';
type DialogData = { mode: 'create' } | { mode: 'edit'; area: Area };
@Component({
  selector: 'app-area-dialog',
  imports: [
    CommonModule, ReactiveFormsModule, MatDialogModule,
    MatFormFieldModule, MatInputModule, MatButtonModule
  ],
  templateUrl: './area-dialog.html',
  styleUrl: './area-dialog.scss'
})
export class AreaDialog {
  readonly ref = inject(MatDialogRef<AreaDialog>);
  readonly data = inject<DialogData>(MAT_DIALOG_DATA);
  private readonly fb = inject(FormBuilder);
  private readonly svc = inject(AreaService);

  readonly loading = signal(false);

  readonly form = this.fb.group({
    name: this.fb.control<string>(this.data.mode==='edit' ? this.data.area.name : '', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(3), Validators.maxLength(60)]
    }),
  });

  close(){ this.ref.close(); }

  submit() {
    if (this.form.invalid) return;
    this.loading.set(true);
    const payload = { name: this.form.value.name!.trim() };

    const obs = this.data.mode === 'create'
      ? this.svc.create(payload)
      : this.svc.update(this.data.area._id, payload);

    obs.subscribe({
      next: () => { this.loading.set(false); this.ref.close({ ok: true }); },
      error: () => { this.loading.set(false); }
    });
  }
}