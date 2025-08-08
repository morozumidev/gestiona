// Angular Core
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
import { isPlatformBrowser, DatePipe } from '@angular/common';
import { PLATFORM_ID, ChangeDetectorRef } from '@angular/core';

// Angular Forms
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  FormArray,
} from '@angular/forms';

// Angular Material
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

// Models
import { Ticket } from '../../../models/Ticket';
import { TicketTracking } from '../../../models/TicketTracking';
import { Luminaria } from '../../../models/Luminaria';
import { Tema } from '../../../models/Tema';
import { Area } from '../../../models/Area';
import { Source } from '../../../models/Source';

// Services
import { TicketsService } from '../../../services/tickets-service';
import { AuthService } from '../../../services/auth.service';

// Dialogs
import { SuccessDialog } from '../../dialogs/success-dialog/success-dialog';
import { GalleryDialog } from '../../dialogs/gallery-dialog/gallery-dialog';

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
    DatePipe
  ],
})

export class TicketManagement implements AfterViewInit, OnDestroy, OnInit {
  private readonly authService = inject(AuthService);
  private readonly ticketsService = inject(TicketsService);
  private readonly zone = inject(NgZone);

  @ViewChild('fileInput', { static: false }) fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef;

  protected temas = signal<Tema[]>([]);
  protected areas = signal<Area[]>([]);
  protected sources = signal<Source[]>([])
  protected luminarias = signal<Luminaria[]>([]);
  protected showLuminarias = signal(false);
  protected areaEditable = signal(false);
  protected createdByUser = signal<{ name: string; first_lastname?: string; second_lastname?: string; email?: string; phone?: string } | null>(null);

  protected reportForm: FormGroup;
  protected commentForm: FormGroup;

  protected currentUser = this.authService.currentUser;
  protected previewUrl: string | ArrayBuffer | null = null;
  protected showMap = false;
  protected ticketFound = false;

  private isAdminOrAtencion = ['admin', 'atencion'].includes(this.currentUser.role?.name);
  private map!: any;
  private marker!: any;
  private isBrowser: boolean;
  private ticketHistory: TicketTracking[] = [];
  private origins: any;
  protected activeSection: string = 'citizen';
  protected activeStep: number = 0;
  protected previewUrls: string[] = [];

  /** Etiquetas de los pasos para mostrarlas en la barra lateral */
  protected stepLabels: string[] = [
    'Datos',
    'Ubicación',
    'Detalles',
    'Seguimiento/Comentarios'
  ];

  /** Avanza al siguiente paso */
  protected nextStep(): void {
    const lastIndex = this.ticketFound ? this.stepLabels.length - 1 : this.stepLabels.length - 2;
    if (this.activeStep < lastIndex) {
      this.activeStep++;
    }
  }

  /** Retrocede al paso anterior */
  protected prevStep(): void {
    if (this.activeStep > 0) {
      this.activeStep--;
    }
  }
  constructor(
    private fb: FormBuilder,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef,
    private injector: Injector,
    @Inject(PLATFORM_ID) protected platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    this.reportForm = this.fb.group({
      _id: [''],
      folio: [''],
      name: ['', Validators.required],
      first_lastname: [''],
      second_lastname: [''],
      phone: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      source: [''],
      status: ['68814abc0000000000000001'],
      problem: ['', Validators.required],
      description: ['', Validators.required],
      location: this.fb.group({
        street: [''],
        extNumber: [''],
        intNumber: [''],
        crossStreets: [''],
        neighborhood: [''],
        locality: [''],
        city: [''],
        state: [''],
        postalCode: [''],
        country: [''],
        references: [''],
        coordinates: this.fb.group({
          lat: [null],
          lng: [null],
        }),
      }),
      images: [[]],
      areaAssignments: this.fb.array([]),
      crewAssignments: this.fb.array([]), // ✅ ahora es FormArray
      tracking: this.fb.array([]),         // ✅ ahora es FormArray
      verifiedByReporter: [false],
      verifiedBy: [''],
      createdBy: [this.currentUser?._id || ''],
      createdAt: [null],
      updatedAt: [null],
      luminaria: [''],
    });
    this.commentForm = this.fb.group({
      description: ['', Validators.required],
    });
  }

ngOnInit(): void {
  this.loadCatalogos();

  if (this.isBrowser) {
    const existing = sessionStorage.getItem('ticket:current');
    if (existing) {
      sessionStorage.setItem('ticket:origin', 'active');
    }

    if (!this.ticketsService.getTicket()()) {
      this.ticketsService.restoreTicketFromSession();
    }

    const ticket = this.ticketsService.getTicket()();
    if (ticket && ticket._id) {
      this.ticketsService.getTicketById(ticket._id).subscribe((freshTicket) => {
        this.ticketsService.setTicket(freshTicket);
        this.ticketFound = true;
        this.patchFormWithTicket(freshTicket);
      });
    } else {
      // 👤 Autocompletar si no hay ticket
      if (this.currentUser?.role?.name === 'user') {
        const user = this.authService.currentUser;
        this.reportForm.patchValue({
          name: user.name,
          first_lastname: user.first_lastname || '',
          second_lastname: user.second_lastname || '',
          phone: user.phone || '',
          email: user.email || ''
        });
      }
    }
  }
}


  ngAfterViewInit(): void {
    if (this.isBrowser && this.showMap) {
      this.loadGoogleMapsScript(() => this.initMap());
    }
  }

  ngOnDestroy() {
    if (this.isBrowser) {
      // Limpiar mapa
      this.map = null;
      this.marker = null;
    }

    // Limpiar signal
    this.ticketsService.clearTicket();
  }


  private buildFormArrayFromObjects(items: any[]): FormArray {
    return this.fb.array(
      items.map(item => {
        const group: { [key: string]: any } = {};
        for (const key of Object.keys(item)) {
          const val = item[key];
          group[key] = [
            typeof val === 'object' && val?.$date
              ? new Date(val.$date)
              : typeof val === 'object' && val?.$oid
                ? val.$oid
                : val
          ];
        }
        return this.fb.group(group);
      })
    );
  }

  private loadGoogleMapsScript(callback: () => void): void {
    if (document.getElementById('google-maps-script')) return;

    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyBEMmz9EDp-RTq4xBZCc4b-4EToYSIN3T8&callback=initMapCallback&loading=async&libraries=marker,places&v=weekly`;

    script.async = true;
    script.defer = true;

    (window as any).initMapCallback = callback;

    document.body.appendChild(script);
  }

  private initMap(): void {
    const coords = this.reportForm.get('location.coordinates')?.value;
    const hasCoords = coords?.lat != null && coords?.lng != null;

    const latLng = hasCoords
      ? { lat: coords.lat, lng: coords.lng }
      : { lat: 19.1738, lng: -96.1342 }; // Veracruz default

    const mapOptions = {
      center: latLng,
      zoom: 15,
      disableDefaultUI: true,
      zoomControl: true,
      mapId: '6522eeb1db39df3c165e48e0'
    };

    this.map = new google.maps.Map(this.mapContainer.nativeElement, mapOptions);

    const { AdvancedMarkerElement } = google.maps.marker;

    this.marker = new AdvancedMarkerElement({
      map: this.map,
      position: latLng,
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

  private reverseGeocode(lat: number, lng: number): void {
    const geocoder = new google.maps.Geocoder();
    const latlng = { lat, lng };

    geocoder.geocode({ location: latlng }, (results: any, status: any) => {
      if (status === 'OK' && results[0]) {
        const result = results[0];
        const components = result.address_components;

        const getComponent = (types: string[]) =>
          components.find((comp: any) => types.every(type => comp.types.includes(type)))?.long_name || '';

        const patch = {
          street: getComponent(['route']),
          extNumber: getComponent(['street_number']),
          intNumber: '',
          crossStreets: getComponent(['intersection']),
          neighborhood: getComponent(['sublocality', 'sublocality_level_1']) || getComponent(['neighborhood']),
          locality: getComponent(['locality']),
          city: getComponent(['locality']),
          state: getComponent(['administrative_area_level_1']),
          postalCode: getComponent(['postal_code']),
          country: getComponent(['country']),
          references: getComponent(['point_of_interest']),
          coordinates: { lat, lng },
        };

        this.zone.run(() => {
          this.reportForm.get('location')?.patchValue(patch);
          this.showMap = false; // 👈 Ocultar el mapa automáticamente
        });
      } else {
        console.error('Geocoding failed:', status);
      }
    });
  }


  protected submitComment(): void {
    if (!this.commentForm.valid) return;

    const newComment = {
      event: 'Comentario',
      description: this.commentForm.getRawValue().description,
      user: {
        _id: this.currentUser._id,
        name: `${this.currentUser.name} ${this.currentUser.first_lastname || ''}`,
        role: this.currentUser.role?.name || 'desconocido'
      },
      files: [],
      date: new Date()
    };

    const ticketId = this.reportForm.get('_id')?.value;

    this.ticketsService.addComment(ticketId, newComment).subscribe({
      next: (updatedTicket) => {
        this.reportForm.setControl('tracking', this.buildFormArrayFromObjects(updatedTicket.tracking || []));

        // ✅ actualiza el signal global
        this.ticketsService.setTicket(updatedTicket);

        this.commentForm.reset();
      },
      error: (err) => {
        console.error('Error al guardar comentario:', err);
      }
    });

  }



  private loadCatalogos() {
    this.ticketsService.getTemas().subscribe(data => this.temas.set(data));
    this.ticketsService.getAreas().subscribe(data => this.areas.set(data));
    this.ticketsService.getSources().subscribe(data => { this.sources.set(data); });
  }

  protected onTemaSelected(temaId: string) {
    const tema = this.temas().find(t => t._id === temaId);
    if (!tema) return;

    const areaAssignments = this.reportForm.get('areaAssignments') as FormArray;
    const luminariaControl = this.reportForm.get('luminaria');

    // Lógica de luminarias (sin cambios)
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

    // Agregar nueva asignación de área
    if (tema.areaId) {
      const assignedBy = this.currentUser?._id || null;
      const currentAssignments = areaAssignments.value || [];
      const lastAssignment = currentAssignments.at(-1);

      const temaAreaId = typeof tema.areaId === 'string' ? tema.areaId : tema.areaId._id;
      const lastAreaId = lastAssignment?.area?.toString?.();
      const temaAreaIdStr = temaAreaId?.toString?.();

      const sameArea = lastAreaId === temaAreaIdStr;

      if (!sameArea) {
        const newAssignment = this.fb.group({
          area: temaAreaId,
          assignedBy,
          assignedAt: new Date(),
          accepted: null,
          respondedAt: null,
        });
        areaAssignments.push(newAssignment);

        const crewAssignments = this.reportForm.get('crewAssignments') as FormArray;
        const lastCrew = crewAssignments.at(crewAssignments.length - 1);
        lastCrew.patchValue({ valid: false });

      }
    }

    this.areaEditable.set(this.isAdminOrAtencion || !tema.areaId);
  }

  protected onManualAreaSelected(areaId: string) {
    const assignedBy = this.currentUser?._id || null;
    const newAssignment = this.fb.group({
      area: areaId,
      assignedBy,
      assignedAt: new Date(),
      accepted: null,
      rejectionReason: '',
      respondedAt: null,
    });

    (this.reportForm.get('areaAssignments') as FormArray).push(newAssignment);

    const crewAssignments = this.reportForm.get('crewAssignments') as FormArray;
    const lastCrew = crewAssignments.at(crewAssignments.length - 1);
    lastCrew.patchValue({ valid: false });
  }

  protected get selectedAreaId(): string | null {
    const assignments = this.reportForm.get('areaAssignments')?.value;
    return assignments?.length ? assignments.at(-1)?.area ?? null : null;
  }

  protected toggleMap(): void {
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

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const files = Array.from(input.files);

      const currentImages = this.reportForm.get('images')?.value || [];
      this.reportForm.patchValue({ images: [...currentImages, ...files] });

      files.forEach(file => {
        const reader = new FileReader();
        reader.onload = () => {
          this.zone.run(() => {
            this.previewUrls.push(reader.result as string);
            this.cdr.detectChanges();
          });
        };
        reader.readAsDataURL(file);
      });

      input.value = ''; // reset
    }
  }
  protected removeImage(url: string): void {
    const index = this.previewUrls.indexOf(url);
    if (index >= 0) {
      this.previewUrls.splice(index, 1);
      const currentImages = this.reportForm.get('images')?.value || [];
      currentImages.splice(index, 1);
      this.reportForm.patchValue({ images: currentImages });
    }
  }

  protected openGallery(): void {
    const images = this.reportForm.get('images')?.value || [];
    this.dialog.open(GalleryDialog, {
      data: { images },
      panelClass: 'image-dialog',
      maxWidth: '100vw',
      maxHeight: '100vh',
      autoFocus: false,
      disableClose: false
    });



  }
  protected submitForm(): void {
    if (!this.reportForm.valid) return;

    const formValues = this.reportForm.getRawValue();
    const ticket: Partial<Ticket> = { ...formValues };
    const images = formValues.images as File[];

    // 🧱 Construir FormData para enviar archivos + JSON
    const formData = new FormData();

    // 🎯 Añadir ticket como JSON string
    formData.append('ticket', JSON.stringify(ticket));

    // 📸 Añadir cada imagen
    images.forEach((img, index) => {
      formData.append('images', img);
    });

    // 📤 Enviar al backend con FormData
    this.ticketsService.manageTicket(formData).subscribe(
      (res: any) => {
        this.dialog.open(SuccessDialog, {
          data: {
            folio: res.ticket?.folio || 'Sin folio',
            isUpdate: this.ticketFound
          }
        });

        this.ticketsService.getTicketById(res.ticket._id).subscribe((updatedTicket) => {
          this.ticketsService.setTicket(updatedTicket);
          this.patchFormWithTicket(updatedTicket);
        });
      },
      (err) => {
        console.error('Error al enviar el ticket', err);
      }
    );
  }


  private patchFormWithTicket(ticket: Ticket) {
    this.reportForm.patchValue({
      _id: ticket._id || '',
      folio: ticket.folio || '',
      name: ticket.name || '',
      first_lastname: ticket.first_lastname || '',
      second_lastname: ticket.second_lastname || '',
      phone: ticket.phone || '',
      email: ticket.email || '',
      source: ticket.source || '',
      status: ticket.status || '68814abc0000000000000001',
      problem: ticket.problem || '',
      description: ticket.description || '',
      location: {
        street: ticket.location?.street || '',
        extNumber: ticket.location?.extNumber || '',
        intNumber: ticket.location?.intNumber || '',
        crossStreets: ticket.location?.crossStreets || '',
        neighborhood: ticket.location?.neighborhood || '',
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
      images: ticket.images || [],
      verifiedByReporter: ticket.verifiedByReporter ?? false,
      verifiedBy: ticket.verifiedBy || '',
      createdBy: ticket.createdBy || '',
      createdAt: ticket.createdAt || null,
      updatedAt: ticket.updatedAt || null,
      luminaria: ticket.luminaria || '',
    });

    this.reportForm.setControl('areaAssignments', this.buildFormArrayFromObjects(ticket.areaAssignments || []));
    this.reportForm.setControl('crewAssignments', this.buildFormArrayFromObjects(ticket.crewAssignments || []));
    this.reportForm.setControl('tracking', this.buildFormArrayFromObjects(ticket.tracking || []));

    if (ticket.images?.length > 0) {
      const firstImage = ticket.images?.[0];

      if (typeof firstImage === 'string') {
        this.previewUrl = firstImage; // ✅ es una URL ya lista
      } else if (firstImage instanceof File) {
        const reader = new FileReader();
        reader.onload = () => {
          this.zone.run(() => {
            this.previewUrl = reader.result;
          });
        };
        reader.readAsDataURL(firstImage);
      } else {
        this.previewUrl = null;
      }

    }

    const temaId = ticket.problem;
    console.log(temaId)
    if (temaId) this.onTemaSelected(temaId);
    if (ticket.createdBy && typeof ticket.createdBy === 'object') {
      const creator = ticket.createdBy as {
        name: string;
        first_lastname?: string;
        second_lastname?: string;
        email?: string;
        phone?: string;
      };

      this.createdByUser.set({
        name: creator.name,
        first_lastname: creator.first_lastname || '',
        second_lastname: creator.second_lastname || '',
        email: creator.email || '',
        phone: creator.phone || '',
      });

    }

  }

}
