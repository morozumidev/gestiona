import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { CatalogsService } from '../../../services/catalog-service';
import { Catalog } from '../../../models/Catalog';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
type DialogData = { mode: 'create'|'edit'; catalog?: Catalog; types: string[] };
@Component({
  selector: 'app-catalog-dialog',
  imports: [   CommonModule, ReactiveFormsModule, MatDialogModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule, ],
  templateUrl: './catalog-dialog.html',
  styleUrl: './catalog-dialog.scss'
})
export class CatalogDialog {
 private readonly fb = inject(FormBuilder);
  private readonly ref = inject(MatDialogRef<CatalogDialog>);
  private readonly svc = inject(CatalogsService);
  data = inject<DialogData>(MAT_DIALOG_DATA);

  busy = signal(false);
  form = this.fb.group({
    type: [this.data.catalog?.type ?? '', [Validators.required]],
    key: [this.data.catalog?.key ?? '', [Validators.required]],
    label: [this.data.catalog?.label ?? '', [Validators.required]],
    description: [this.data.catalog?.description ?? ''],
    metadataText: [JSON.stringify(this.data.catalog?.metadata ?? {}, null, 2)],
    order: [this.data.catalog?.order ?? 0, []],
    active: [this.data.catalog?.active ?? true]
  });

  save() {
    if (this.form.invalid) return;
    let metadata: any = {};
    try {
      metadata = this.form.value.metadataText ? JSON.parse(this.form.value.metadataText) : {};
    } catch {
      alert('Metadata debe ser JSON válido.');
      return;
    }

    const payload = {
      type: this.form.value.type!,
      key: this.form.value.key!,
      label: this.form.value.label!,
      description: this.form.value.description ?? '',
      metadata,
      order: Number(this.form.value.order ?? 0),
      active: !!this.form.value.active
    };

    this.busy.set(true);
    const obs = this.data.mode === 'create'
      ? this.svc.create(payload)
      : this.svc.update(this.data.catalog!.id, payload);

    obs.subscribe({
      next: (cat) => { this.busy.set(false); this.ref.close(cat); },
      error: (e) => { this.busy.set(false); alert(e?.error?.message ?? 'Error al guardar'); }
    });
  }

  close() { this.ref.close(); }
}