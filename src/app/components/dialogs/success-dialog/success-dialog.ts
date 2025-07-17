import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-success-dialog',
  imports: [],
  templateUrl: './success-dialog.html',
  styleUrl: './success-dialog.scss'
})
export class SuccessDialog {
  folio: string;

  constructor(@Inject(MAT_DIALOG_DATA) public data: { folio: string }) {

    this.folio = data.folio;

  }
}
