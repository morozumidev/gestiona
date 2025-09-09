import { Component, inject, Inject, signal } from '@angular/core';
import { Role } from '../../../models/Role';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { RoleService } from '../../../services/role-service';
type DialogData =
  | { mode: 'create' }
  | { mode: 'edit'; role: Role };
@Component({
  selector: 'app-role-dialog',
  imports: [  CommonModule,
    ReactiveFormsModule,

    // Material
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatChipsModule,
    MatIconModule,
    MatButtonModule,],
  templateUrl: './role-dialog.html',
  styleUrl: './role-dialog.scss'
})
export class RoleDialog {
  private fb = inject(FormBuilder);
  private svc = inject(RoleService);
  private ref = inject(MatDialogRef<RoleDialog, boolean>);
  constructor(@Inject(MAT_DIALOG_DATA) public data: DialogData) {}

  readonly saving = signal<boolean>(false);

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    description: [''],
    permissionInput: [''], // input temporal para chips
    permissions: this.fb.nonNullable.control<string[]>([]),
  });

  ngOnInit() {
    if (this.data.mode === 'edit') {
      const r = this.data.role;
      this.form.patchValue({
        name: r.name ?? '',
        description: r.description ?? '',
        permissions: r.permissions ?? [],
      });
    }
  }

  addPermissionFromInput() {
    const value = (this.form.value.permissionInput ?? '').trim();
    if (!value) return;
    const perms = new Set(this.form.value.permissions ?? []);
    perms.add(value);
    this.form.patchValue({ permissions: Array.from(perms), permissionInput: '' });
  }

  removePermission(perm: string) {
    const list = (this.form.value.permissions ?? []).filter(p => p !== perm);
    this.form.patchValue({ permissions: list });
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { name, description, permissions } = this.form.getRawValue();
    const payload = { name: name.trim(), description: description?.trim() || undefined, permissions };

    this.saving.set(true);

    if (this.data.mode === 'create') {
      this.svc.create(payload).subscribe({
        next: () => { this.saving.set(false); this.ref.close(true); },
        error: () => { this.saving.set(false); }
      });
    } else {
      const id = this.data.role._id;
      this.svc.update(id, payload).subscribe({
        next: () => { this.saving.set(false); this.ref.close(true); },
        error: () => { this.saving.set(false); }
      });
    }
  }

  close() { this.ref.close(false); }
}