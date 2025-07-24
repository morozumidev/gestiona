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
  signal,
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
import { first } from 'rxjs';
import { Luminaria } from '../../../models/Luminaria';
import { Tema } from '../../../models/Tema';
import { Area } from '../../../models/Area';
import { Source } from '../../../models/Source';

/// <reference types="google.maps" />
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

  temas = signal<Tema[]>([]);
  areas = signal<Area[]>([]);
  sources = signal<Source[]>([])
  luminarias = signal<Luminaria[]>([]);
  showLuminarias = signal(false);
  areaEditable = signal(false);

  previewUrl: string | ArrayBuffer | null = null;
  showMap = false;
  map!: any;
  marker!: any;
  private isBrowser: boolean;
  protected ticketFound = false;

  @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef;

  ticketHistory: TicketTracking[] = [];
  origins: any;

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

      // Datos del reportante
      name: ['', Validators.required],
      first_lastname: [''],
      second_lastname: [''],
      phone: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],

      // Catálogos dinámicos
      source: [''],
      area: [''],
      status: ['68814abc0000000000000001'],
      workflowStage: ['generado'],

      // Detalles del problema
      problem: ['', Validators.required],
      description: ['', Validators.required],

      // Ubicación
      location: this.fb.group({
        street: [''],
        extNumber: [''],
        intNumber: [''],
        crossStreets: [''],
        neighborhood: [''],
        borough: [''],
        locality: [''],
        city: [''],
        state: [''],
        postalCode: [''],
        country: [''],
        references: [''],
        coordinates: this.fb.group({
          lat: [null, Validators.required],
          lng: [null, Validators.required],
        }),
      }),

      // Evidencias
      images: [[]],

      // Asignación de área
      areaAssignment: this.fb.group({
        assignedTo: [''],
        accepted: [null],
        rejectionReason: [''],
        respondedAt: [null],
      }),

      // Asignación de cuadrilla
      crewAssignment: this.fb.group({
        assignedTo: [''],
        accepted: [null],
        rejectionReason: [''],
        respondedAt: [null],
      }),

      // Verificación
      verifiedByReporter: [false],
      verifiedBy: [''],

      // Seguimiento
      tracking: [[]], // Si quieres que esto sea un FormArray, puedo estructurarlo también

      // Auditoría
      createdBy: [''],
      createdAt: [null],
      updatedAt: [null],

      luminaria: [''],
    });

  }

  ngOnInit(): void {
    this.loadCatalogos();
    runInInjectionContext(this.injector, () => {
      effect(() => {
        const ticket = this.ticketsService.getTicket()();
        if (ticket) {
          this.ticketFound = true;

          this.reportForm.patchValue({
            _id: ticket._id || '',
            folio: ticket.folio || '',

            // Datos del reportante
            name: ticket.name || '',
            first_lastname: ticket.first_lastname || '',
            second_lastname: ticket.second_lastname || '',
            phone: ticket.phone || '',
            email: ticket.email || '',

            // Catálogos
            source: ticket.source || '',
            status: ticket.status || '68814abc0000000000000001',

            // Problema
            problem: ticket.problem || '',
            description: ticket.description || '',

            // Ubicación
            location: {
              street: ticket.location?.street || '',
              extNumber: ticket.location?.extNumber || '',
              intNumber: ticket.location?.intNumber || '',
              crossStreets: ticket.location?.crossStreets || '',
              neighborhood: ticket.location?.neighborhood || '',
              borough: ticket.location?.borough || '',
              locality: ticket.location?.locality || '',
              city: ticket.location?.city || '',
              state: ticket.location?.state || '',
              postalCode: ticket.location?.postalCode || '',
              country: ticket.location?.country || '',
              references: ticket.location?.references || '',
              coordinates: {
                lat: ticket.location?.coordinates?.lat || null,
                lng: ticket.location?.coordinates?.lng || null,
              },
            },

            // Evidencias
            images: ticket.images || [],



            // Verificación
            verifiedByReporter: ticket.verifiedByReporter ?? false,
            verifiedBy: ticket.verifiedBy || '',

            // Seguimiento
            tracking: ticket.tracking || [],

            // Auditoría
            createdBy: ticket.createdBy || '',
            createdAt: ticket.createdAt || null,
            updatedAt: ticket.updatedAt || null,
            luminaria: ticket.luminaria || '',
          });

          // Imagen de vista previa
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
    script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyBEMmz9EDp-RTq4xBZCc4b-4EToYSIN3T8&callback=initMapCallback&loading=async&libraries=marker,places&v=weekly`;

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
      const pos = this.marker.getPosition();
      if (pos) {
        this.reverseGeocode(pos.lat(), pos.lng());
      }
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
        const intNumber = ''; // No se obtiene con Geocoder
        const crossStreets = getComponent(['intersection']);
        const neighborhood = getComponent(['sublocality', 'sublocality_level_1']) || getComponent(['neighborhood']);
        const borough = ''; // Opcional, según ubicación
        const locality = getComponent(['locality']);
        const city = locality; // Puedes modificar si es distinto
        const state = getComponent(['administrative_area_level_1']);
        const postalCode = getComponent(['postal_code']);
        const country = getComponent(['country']);
        const references = getComponent(['point_of_interest']); // Opcional

        // ✅ Actualiza todos los campos dentro de location
        this.zone.run(() => {
          this.reportForm.get('location')?.patchValue({
            street,
            extNumber,
            intNumber,
            crossStreets,
            neighborhood,
            borough,
            locality,
            city,
            state,
            postalCode,
            country,
            references,
            coordinates: { lat, lng }
          });
        });
      } else {
        console.error('Geocoding failed:', status);
      }
    });
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
    const ticket: Partial<Ticket> = {
      _id: formValues._id,
      folio: formValues.folio,

      // Datos del reportante
      name: formValues.name,
      first_lastname: formValues.first_lastname,
      second_lastname: formValues.second_lastname,
      phone: formValues.phone,
      email: formValues.email,

      // Catálogos dinámicos
      source: formValues.source,
      status: formValues.status,

      // Detalles del problema
      problem: formValues.problem,
      description: formValues.description,

      // Ubicación
      location: {
        street: formValues.location.street,
        extNumber: formValues.location.extNumber,
        intNumber: formValues.location.intNumber,
        crossStreets: formValues.location.crossStreets,
        neighborhood: formValues.location.neighborhood,
        borough: formValues.location.borough,
        locality: formValues.location.locality,
        city: formValues.location.city,
        state: formValues.location.state,
        postalCode: formValues.location.postalCode,
        country: formValues.location.country,
        references: formValues.location.references,
        coordinates: {
          lat: formValues.location.coordinates.lat,
          lng: formValues.location.coordinates.lng,
        }
      },

      // Evidencias
      images: formValues.images || [],

      // Asignaciones

      // Verificación
      verifiedByReporter: formValues.verifiedByReporter,
      verifiedBy: formValues.verifiedBy,

      // Seguimiento
      tracking: formValues.tracking || [],

      // Auditoría
      createdBy: formValues.createdBy,
      createdAt: formValues.createdAt,
      updatedAt: formValues.updatedAt,
      luminaria: formValues.luminaria,
    };
    const coordinates = this.marker?.position
      ? {
        lat: this.marker.position.lat,
        lng: this.marker.position.lng
      }
      : { lat: 0, lng: 0 };

    const currentUser = this.authService.currentUser;

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
  loadCatalogos() {
    this.ticketsService.getTemas().subscribe(data => this.temas.set(data));
    this.ticketsService.getAreas().subscribe(data => this.areas.set(data));
    this.ticketsService.getSources().subscribe(data => {this.sources.set(data);});
  }

  onTemaSelected(temaId: string) {
    const tema = this.temas().find(t => t._id === temaId);
    if (!tema) return;

    const areaControl = this.reportForm.get('area');
    const luminariaControl = this.reportForm.get('luminaria');

    // Cargar luminarias solo si es necesario
    if (tema.requiresLuminaria) {
      this.ticketsService.getLuminarias().subscribe(data => this.luminarias.set(data));
      this.showLuminarias.set(true);
      luminariaControl?.enable();
    } else {
      this.luminarias.set([]);
      this.showLuminarias.set(false);
      luminariaControl?.disable();
      luminariaControl?.reset();
    }

    // Área predefinida o editable
    if (tema.areaId) {
      areaControl?.setValue(typeof tema.areaId === 'string' ? tema.areaId : tema.areaId._id);
      areaControl?.disable();
    } else {
      areaControl?.enable();
      areaControl?.reset();
    }
  }



}
