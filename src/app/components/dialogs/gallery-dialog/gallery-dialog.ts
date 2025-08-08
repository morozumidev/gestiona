import { Component, HostListener, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { CoreService } from '../../../services/core-service';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import {MatButtonModule} from '@angular/material/button';
@Component({
  selector: 'app-gallery-dialog',
  imports: [MatIconModule, MatDialogModule, MatFormFieldModule,MatButtonModule],
  templateUrl: './gallery-dialog.html',
  styleUrl: './gallery-dialog.scss'
})
export class GalleryDialog {
  currentIndex = 0;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { images: string[] },
    protected coreService: CoreService,
    protected dialogRef: MatDialogRef<GalleryDialog>
  ) { }

  @HostListener('document:keydown.arrowRight')
  onRight(): void {
    this.next();
  }

  @HostListener('document:keydown.arrowLeft')
  onLeft(): void {
    this.prev();
  }

  prev(): void {
    this.currentIndex =
      (this.currentIndex - 1 + this.data.images.length) % this.data.images.length;
  }

  next(): void {
    this.currentIndex = (this.currentIndex + 1) % this.data.images.length;
  }
}
