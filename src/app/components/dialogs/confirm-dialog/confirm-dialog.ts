import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
type ConfirmData = { title: string; message: string; confirmText?: string; type?: 'danger' | 'default' };
@Component({
  selector: 'app-confirm-dialog',
 imports: [CommonModule, MatDialogModule, MatButtonModule],
  templateUrl: './confirm-dialog.html',
  styleUrl: './confirm-dialog.scss'
})
export class ConfirmDialog {
  readonly ref = inject(MatDialogRef<ConfirmDialog>);
  readonly data = inject<ConfirmData>(MAT_DIALOG_DATA);
  close(){ this.ref.close(); }
  ok(){ this.ref.close({ ok: true }); }
}