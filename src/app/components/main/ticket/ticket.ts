import {
  Component,
  AfterViewInit,
  OnDestroy,
  NgZone,
  ElementRef,
  ViewChild,
  Inject,
  effect,
  inject,
  OnInit,
  runInInjectionContext,
  Injector,
} from '@angular/core';
import { ChangeDetectorRef } from '@angular/core';
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
import { Ticket } from '../../../models/Ticket';
import { SuccessDialog } from '../../dialogs/success-dialog/success-dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TicketsService } from '../../../services/tickets-service';
import { AuthService } from '../../../services/auth.service';
import { TicketTracking } from '../../../models/TicketTracking';

declare const google: any;

@Component({
  selector: 'app-ticket',
  templateUrl: './ticket.html',
  styleUrl: './ticket.scss',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatCardModule,
    MatIconModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
  ],
})
export class TicketManagement implements AfterViewInit, OnDestroy, OnInit {
  private readonly authService = inject(AuthService);
  private readonly ticketsService = inject(TicketsService);
  private readonly zone = inject(NgZone);
  reportForm: FormGroup;
  @ViewChild('fileInput', { static: false }) fileInput!: ElementRef<HTMLInputElement>;

  temas = ['Luminaria sin funcionar', 'Encendido diurno', 'Intermitencia'];
  luminarias = ['LM-001', 'LM-002', 'LM-003'];
  cuadrillas = ['Cuadrilla-001', 'Cuadrilla-002', 'Cuadrilla-003'];
  areas = [
    { id: 'servicios', name: 'Servicios Generales' },
    { id: 'alumbrado', name: 'Alumbrado Público' }
  ];

  showLuminarias = false;
  showCuadrillas = false;

  previewUrl: string | ArrayBuffer | null = null;
  showMap = false;
  map!: any;
  marker!: any;
  private isBrowser: boolean;
  protected ticketFound = false;

  @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef;

  ticketHistory: TicketTracking[] = [];

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef,
    private injector: Injector,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    this.reportForm = this.fb.group({
      _id: [''],
      folio: [''],
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
      area: [''],
      descripcion: ['', Validators.required],
      evidencia: [null],
      origen: ['Facebook'],
      status: ['pendiente'],
      workflowStage: ['generado']
    });
  }

  ngOnInit(): void {
    runInInjectionContext(this.injector, () => {
      effect(() => {
        const ticket = this.ticketsService.getTicket()();
        if (ticket) {
          this.ticketFound = true;
          const [nombre = '', apellidoPaterno = '', apellidoMaterno = ''] = (ticket.name || '').split(' ');

          this.reportForm.patchValue({
            _id: ticket._id || '',
            folio: ticket.folio || '',
            nombre,
            apellidoPaterno,
            apellidoMaterno,
            telefono: ticket.phone || '',
            email: ticket.email || '',
            direccion: ticket.location?.street || '',
            entreCalles: ticket.location?.crossStreets || '',
            numeroExterior: ticket.location?.extNumber || '',
            colonia: ticket.location?.neighborhood || '',
            tema: ticket.problem || '',
            luminaria: '',
            cuadrilla: '',
            area: ticket.area || '',
            descripcion: ticket.description || '',
            origen: ticket.source || 'Facebook',
            status: ticket.status || 'pendiente',
            workflowStage: ticket.workflowStage || 'generado'
          });

          if (ticket.images?.length > 0) {
            this.previewUrl = ticket.images[0];
          }

          this.ticketHistory = ticket.tracking || [];
        }
      });
    });
  }

  ngAfterViewInit(): void {
    if (this.isBrowser && this.showMap) {
      this.loadGoogleMapsScript(() => this.initMap());
    }
  }

  toggleMap(): void {
    this.showMap = !this.showMap;
    if (this.showMap && this.isBrowser) {
      setTimeout(() => {
        if (!(window as any).google) {
          this.loadGoogleMapsScript(() => this.initMap());
        } else {
          this.initMap();
        }
      });
    }
  }

  loadGoogleMapsScript(callback: () => void): void {
    if (document.getElementById('google-maps-script')) return;

    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyBEMmz9EDp-RTq4xBZCc4b-4EToYSIN3T8&callback=initMapCallback&loading=async&libraries=marker`;
    script.async = true;
    script.defer = true;

    (window as any).initMapCallback = callback;

    document.body.appendChild(script);
  }

  initMap(): void {
    const defaultLatLng = { lat: 19.1738, lng: -96.1342 };
const mapOptions = {
  center: defaultLatLng,
  zoom: 15,
  disableDefaultUI: true,
  zoomControl: true,
  mapId: '6522eeb1db39df3c165e48e0'
};

    this.map = new google.maps.Map(this.mapContainer.nativeElement, mapOptions);

    const { AdvancedMarkerElement } = google.maps.marker;

    this.marker = new AdvancedMarkerElement({
      map: this.map,
      position: defaultLatLng,
      gmpDraggable: true,
    });

    this.map.addListener('click', (e: any) => {
      this.marker.position = e.latLng;
      this.reverseGeocode(e.latLng.lat(), e.latLng.lng());
    });

    this.marker.addListener('dragend', () => {
      const pos = this.marker.position;
      this.reverseGeocode(pos.lat(), pos.lng());
    });
  }

reverseGeocode(lat: number, lng: number): void {
  const geocoder = new google.maps.Geocoder();
  const latlng = { lat, lng };

  geocoder.geocode({ location: latlng }, (results: any, status: any) => {
    if (status === 'OK' && results[0]) {
      const result = results[0];
      const components = result.address_components;

      const getComponent = (types: string[]) =>
        components.find((comp: any) => types.every(type => comp.types.includes(type)))?.long_name || '';

      const street = getComponent(['route']);
      const extNumber = getComponent(['street_number']);
      const neighborhood = getComponent(['sublocality', 'sublocality_level_1']) || getComponent(['neighborhood']);
      const postalCode = getComponent(['postal_code']);
      const locality = getComponent(['locality']);
      const state = getComponent(['administrative_area_level_1']);
      const country = getComponent(['country']);

      const crossStreets = `Cerca de ${street}`; // Alternativa si no se usan APIs adicionales

      this.zone.run(() => {
        this.reportForm.patchValue({
          direccion: result.formatted_address,
          numeroExterior: extNumber,
          colonia: neighborhood,
          entreCalles: crossStreets
        });

        // Si deseas guardar todo en el backend también:
        this.reportForm.patchValue({
          locationDetails: {
            postalCode,
            locality,
            state,
            country
          }
        });
      });
    } else {
      console.error('Geocoding failed: ', status);
    }
  });
}


  onTemaChange(): void {
    const tema = this.reportForm.get('tema')?.value?.toLowerCase() || '';
    this.showLuminarias = tema.includes('luminaria');
    this.showCuadrillas = tema.includes('bache') || tema.includes('basura');
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (input.files && input.files.length > 0) {
      const file = input.files[0];

      this.reportForm.patchValue({ evidencia: file });

      const reader = new FileReader();
      reader.onload = () => {
        this.zone.run(() => {
          this.previewUrl = reader.result;
          this.fileInput.nativeElement.value = '';
          this.cdr.detectChanges();
        });
      };

      reader.readAsDataURL(file);
    }
  }

  submitForm(): void {
    if (!this.reportForm.valid) return;

    const formValues = this.reportForm.value;

    const coordinates = this.marker?.position
      ? {
          lat: this.marker.position.lat(),
          lng: this.marker.position.lng()
        }
      : { lat: 0, lng: 0 };

    const currentUser = this.authService.getTokenData().user;

    const trackingEntry: TicketTracking = {
      event: this.ticketFound ? 'modificacion' : 'creacion',
      description: this.ticketFound
        ? 'Ticket actualizado desde el formulario.'
        : 'Ticket creado desde el formulario.',
      files: [],
      date: new Date(),
      user: {
        _id: currentUser?._id || 'anon',
        name: currentUser?.name || 'Anónimo',
        role: currentUser?.role || 'ciudadano'
      }
    };

    const ticket: Partial<Ticket> = {
      _id: formValues._id,
      folio: formValues.folio,
      name: `${formValues.nombre} ${formValues.apellidoPaterno} ${formValues.apellidoMaterno}`.trim(),
      phone: formValues.telefono,
      email: formValues.email,
      source: formValues.origen,
      service: formValues.tema,
      area: formValues.area,
      problem: formValues.tema,
      description: formValues.descripcion,
      status: formValues.status,
      workflowStage: formValues.workflowStage,
      location: {
        street: formValues.direccion,
        crossStreets: formValues.entreCalles,
        extNumber: formValues.numeroExterior,
        neighborhood: formValues.colonia,
        coordinates,
      },
      images: [],
      tracking: [trackingEntry]
    };

    const evidencia = formValues.evidencia;

    this.ticketsService.manageTicket(ticket, evidencia).subscribe(
      (res: any) => {
        this.dialog.open(SuccessDialog, {
          data: { folio: res.ticket?.folio || 'Sin folio' }
        });
        this.reportForm.reset();
        this.ticketsService.clearTicket?.();
        this.previewUrl = null;
      },
      (err) => {
        console.error('Error al enviar el ticket', err);
      }
    );
  }

  ngOnDestroy() {
    if (this.isBrowser && this.map) {
      this.map = null;
      this.marker = null;
    }
    this.ticketsService.clearTicket?.();
  }
}
