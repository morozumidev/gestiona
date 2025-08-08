import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-success-dialog',
  imports: [MatIconModule,CommonModule ],
  templateUrl: './success-dialog.html',
  styleUrl: './success-dialog.scss'
})
export class SuccessDialog {
  folio: string;

  constructor(@Inject(MAT_DIALOG_DATA) public data: { folio: string; isUpdate: boolean }) {

    this.folio = data.folio;

  }
}
