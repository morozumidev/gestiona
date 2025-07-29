import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';

@Component({
  selector: 'app-rejection-details-dialog',
  imports: [MatDialogModule,CommonModule,MatButton],
  templateUrl: './rejection-details-dialog.html',
  styleUrl: './rejection-details-dialog.scss'
})
export class RejectionDetailsDialog {
  constructor(@Inject(MAT_DIALOG_DATA) public data: {
    areaName: string;
    userName: string;
    reason: string;
    date: Date;
  }) {
  }
}
