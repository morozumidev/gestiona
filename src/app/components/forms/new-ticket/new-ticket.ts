import {
  Component,
  AfterViewInit,
  OnDestroy,
  NgZone,
  ElementRef,
  ViewChild,
  PLATFORM_ID,
  Inject,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { isPlatformBrowser } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { SuccessDialog } from '../../dialogs/success-dialog/success-dialog';
import { MatDialog } from '@angular/material/dialog';
import { Session } from '../../../services/session';

@Component({
  selector: 'app-new-ticket',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
  ],
  templateUrl: './new-ticket.html',
  styleUrls: ['./new-ticket.scss'],
})
export class NewTicket implements AfterViewInit, OnDestroy {
  reportForm: FormGroup;
  temas = ['Luminaria sin funcionar', 'Ausencia de ruta de basura', 'Bacheo'];
  luminarias = ['LM-001', 'LM-002', 'LM-003'];
  showLuminarias = false;
  previewUrl: string | ArrayBuffer | null = null;

  showMap = false;
  map!: any;
  marker!: any;

  @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef;

  private L: any;
  private isBrowser: boolean;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private dialog: MatDialog,
    private sessionService: Session,
    private zone: NgZone,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    this.reportForm = this.fb.group({
      nombre: ['', Validators.required],
      apellidoPaterno: ['', Validators.required],
      apellidoMaterno: ['', Validators.required],
      telefono: ['', Validators.required],
      direccion: [''],
      tema: ['', Validators.required],
      luminaria: [''],
      evidencia: [null],
      origen:['WhatsApp']
    });
  }

  async ngAfterViewInit() {
    if (this.isBrowser) {
      this.L = await import('leaflet');

      delete (this.L.Icon.Default.prototype as any)._getIconUrl;

      this.L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'assets/marker-icon-2x.png',
        iconUrl: 'assets/marker-icon.png',
        shadowUrl: 'assets/marker-shadow.png',
      });

      if (this.showMap) {
        this.initMap();
      }
    }
  }

  toggleMap() {
    this.showMap = !this.showMap;
    if (this.showMap && this.isBrowser) {
      setTimeout(() => this.initMap(), 0);
    }
  }

  initMap() {
    if (!this.isBrowser) return;

    if (this.map) {
      this.map.invalidateSize();
      return;
    }

    this.map = this.L.map(this.mapContainer.nativeElement).setView(
      [19.1738, -96.1342],
      13
    );

    this.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(this.map);

    this.map.on('click', (e: any) => {
      if (this.marker) {
        this.marker.setLatLng(e.latlng);
      } else {
        this.marker = this.L.marker(e.latlng).addTo(this.map);
      }
      this.reverseGeocode(e.latlng.lat, e.latlng.lng);
    });
  }

  reverseGeocode(lat: number, lng: number) {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`;
    this.http.get<any>(url).subscribe((res) => {
      const address = res.display_name || '';
      this.zone.run(() => {
        this.reportForm.patchValue({ direccion: address });
      });
    });
  }

  onTemaChange(): void {
    const selected = this.reportForm.get('tema')?.value;
    this.showLuminarias = selected === 'Luminaria sin funcionar';
    if (!this.showLuminarias) {
      this.reportForm.get('luminaria')?.reset();
    }
  }

  onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      this.reportForm.patchValue({ evidencia: file });
      const reader = new FileReader();
      reader.onload = () => (this.previewUrl = reader.result);
      reader.readAsDataURL(file);
    }
  }

  submitForm(): void {
    if (this.reportForm.valid) {
      const formData = new FormData();
      Object.entries(this.reportForm.value).forEach(([key, value]) => {
        if (value instanceof Blob) {
          formData.append(key, value);
        } else {
          formData.append(
            key,
            value !== null && value !== undefined ? value.toString() : ''
          );
        }
      });

      // Simula éxito
      console.log('Formulario válido:', this.reportForm.value);

      // Abre modal de éxito
      this.dialog.open(SuccessDialog, {});

      this.reportForm.reset();
      this.previewUrl = null;
    }
  }

  ngOnDestroy() {
    if (this.isBrowser && this.map) {
      this.map.remove();
    }
  }
}
