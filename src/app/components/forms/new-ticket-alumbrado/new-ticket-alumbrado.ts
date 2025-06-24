import {
  Component,
  AfterViewInit,
  OnDestroy,
  NgZone,
  ElementRef,
  ViewChild,
  Inject,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule
} from '@angular/forms';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { PLATFORM_ID } from '@angular/core';
import { TicketsService } from '../../../services/tickets-service';
import { Ticket } from '../../../models/Ticket';
import { SuccessDialog } from '../../dialogs/success-dialog/success-dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import {MatInputModule} from '@angular/material/input';
@Component({
  selector: 'app-new-ticket-alumbrado',
  standalone: true,
  imports: [
    ReactiveFormsModule,
       MatFormFieldModule,
       MatSelectModule,
       MatCardModule,
       MatIconModule,
       MatInputModule
  ],
  templateUrl: './new-ticket-alumbrado.html',
  styleUrl: './new-ticket-alumbrado.scss',
})
export class NewTicketAlumbrado implements AfterViewInit, OnDestroy {
  reportForm: FormGroup;
  temas = ['Luminaria sin funcionar', 'Encendido diurno', 'Intermitencia'];
  luminarias = ['LM-001', 'LM-002', 'LM-003'];
  showLuminarias = false;
  cuadrillas = ['Cuadrilla-001', 'Cuadrilla-002', 'Cuadrilla-003'];
  showCuadrillas = false;
  previewUrl: string | ArrayBuffer | null = null;

  showMap = false;
  map!: any;
  marker!: any;

  @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef;

  private L: any;
  private isBrowser: boolean;

  constructor(
    private ticketsService: TicketsService,
    private fb: FormBuilder,
    private http: HttpClient,
    private dialog: MatDialog,
    private zone: NgZone,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    this.reportForm = this.fb.group({
      nombre: ['', Validators.required],
      apellidoPaterno: ['', Validators.required],
      apellidoMaterno: ['', Validators.required],
      telefono: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      direccion: [''],
      entreCalles: [''],
      numeroExterior: [''],
      colonia: [''],
      tema: ['', Validators.required],
      luminaria: [''],
      cuadrilla: [''],
      descripcion: ['', Validators.required],
      evidencia: [null],
      origen: ['Facebook']
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

    this.map = this.L.map(this.mapContainer.nativeElement).setView([19.1738, -96.1342], 13);

    this.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
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
    this.showLuminarias = true;
    if (!this.showLuminarias) {
      this.reportForm.get('luminaria')?.reset();
    }
  }

  onLuminariaChange(): void {
    this.showCuadrillas = true;
    if (!this.showCuadrillas) {
      this.reportForm.get('cuadrilla')?.reset();
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
      const formValues = this.reportForm.value;

      const coordinates = this.marker
        ? { lat: this.marker.getLatLng().lat, lng: this.marker.getLatLng().lng }
        : { lat: 0, lng: 0 };

      const ticket: Partial<Ticket> = {
        folio: 'TEMP-' + Date.now(),
        name: `${formValues.nombre} ${formValues.apellidoPaterno} ${formValues.apellidoMaterno}`,
        phone: formValues.telefono,
        email: formValues.email,
        source: formValues.origen,
        service: formValues.tema,
        area: 'alumbrado',
        problem: formValues.tema,
        description: formValues.descripcion,
        status: 'Pendiente',
        location: {
          street: formValues.direccion || '',
          crossStreets: formValues.entreCalles || '',
          extNumber: formValues.numeroExterior || '',
          neighborhood: formValues.colonia || '',
          coordinates,
        },
        images: [],
        tracking: [],
      };

      this.ticketsService.createTicket(ticket, formValues.evidencia).subscribe({
        next: () => {
          this.dialog.open(SuccessDialog);
          this.reportForm.reset();
          this.previewUrl = null;
        },
        error: (err) => {
          console.error('Error al crear el ticket', err);
        }
      });
    }
  }

  ngOnDestroy() {
    if (this.isBrowser && this.map) {
      this.map.remove();
    }
  }
}
