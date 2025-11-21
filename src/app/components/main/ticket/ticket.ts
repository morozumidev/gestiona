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
  Injector,
  signal,
} from '@angular/core';
import { isPlatformBrowser, DatePipe } from '@angular/common';
import { PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { firstValueFrom } from 'rxjs';

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
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar'; // ✅ NUEVO

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
import { TicketDto } from '../../../models/TicketDto';
import { Status } from '../../../models/Status';
import { Maintenance } from '../../../models/Maintenance';
import { Cuadrilla } from '../../../models/Cuadrilla';
import { User } from '../../../models/User';
import { UserService } from '../../../services/user-service';

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
    MatSnackBarModule, // ✅ NUEVO
    DatePipe
  ],
})
export class TicketManagement implements AfterViewInit, OnDestroy, OnInit {
  private readonly authService = inject(AuthService);
  private readonly userService = inject(UserService);
  private readonly ticketsService = inject(TicketsService);
  private readonly zone = inject(NgZone);
  private readonly snack = inject(MatSnackBar); // ✅ NUEVO

  @ViewChild('fileInput', { static: false }) fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef;

  protected temas = signal<Tema[]>([]);
  protected areas = signal<Area[]>([]);
  protected sources = signal<Source[]>([]);
  protected luminarias = signal<Luminaria[]>([]);
  protected showLuminarias = signal(false);
  protected areaEditable = signal(false);
  protected createdByUser = signal<{ name: string; first_lastname?: string; second_lastname?: string; email?: string; phone?: string } | null>(null);
  protected currentCuadrilla = signal<Cuadrilla | null>(null);
  protected currentSupervisor = signal<User | null>(null);

  protected reportForm: FormGroup;
  protected commentForm: FormGroup;

  /** Muestra nombre de área ya sea id (string) u objeto poblado */
  protected displayArea(a: unknown): string {
    if (!a) return '—';
    if (typeof a === 'string') return a;
    if (typeof a === 'object' && 'name' in (a as any)) return (a as any).name ?? '—';
    return '—';
  }

  /** Muestra nombre de turno ya sea id (string) u objeto poblado */
  protected displayShift(s: unknown): string {
    if (!s) return '—';
    if (typeof s === 'string') return s;
    if (typeof s === 'object' && 'name' in (s as any)) return (s as any).name ?? '—';
    return '—';
  }

  /** Nombre legible de un miembro ya sea id (string) u objeto poblado */
  protected displayMemberName(m: unknown): string {
    if (!m) return '—';
    if (typeof m === 'string') return m;
    const o = m as any;
    const parts = [o?.name, o?.first_lastname, o?.second_lastname].filter(Boolean);
    return parts.length ? parts.join(' ') : '—';
  }

  /** trackBy para miembros (soporta string u objeto con _id) */
  protected trackByMember = (_: number, m: unknown) =>
    (m && typeof m === 'object' && '_id' in (m as any)) ? (m as any)._id : m as string;

  protected currentUser = this.authService.currentUser;
  protected previewUrl: string | ArrayBuffer | null = null;
  protected showMap = false;
  protected ticketFound = false;
  private userCache = new Map<string, string>();
  private isAdminOrAtencion = ['admin', 'atencion'].includes(this.currentUser.role?.name);
  private map!: any;
  private marker!: any;
  private isBrowser: boolean;
  private ticketHistory: TicketTracking[] = [];
  private origins: any;
  protected activeSection: string = 'citizen';
  protected activeStep: number = 0;
  protected previewUrls: string[] = [];
  private statusCache = new Map<string, string>();

  /** Etiquetas de pasos */
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
      lastClosedAt: [null],
      sentBackToAttentionAt: [null],
      areaAssignments: this.fb.array([]),
      crewAssignments: this.fb.array([]),
      tracking: this.fb.array([]),
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

  private async resolveUserName(userId?: string): Promise<string> {
    if (!userId) return '—';
    if (this.userCache.has(userId)) return this.userCache.get(userId)!;

    try {
      const user = await firstValueFrom(this.userService.getById(userId));
      const fullName = [user.name, user.first_lastname, user.second_lastname].filter(Boolean).join(' ');
      this.userCache.set(userId, fullName || 'Usuario desconocido');
      return this.userCache.get(userId)!;
    } catch {
      return 'Usuario desconocido';
    }
  }

  public canReopen(): boolean {
    // Debe existir ticket cargado, rol permitido y estar realmente cerrado
    const hasTicket = !!this.reportForm?.get('_id')?.value;
    if (!hasTicket) return false;

    const role = this.currentUser?.role?.name ?? '';
    const roleCan = role === 'admin' || role === 'atencion';

    return roleCan && this.isClosedStrict();
  }

  private isClosedStrict(): boolean {
    // CERRADO = verificado por ciudadano (bandera del backend)
    return this.reportForm.get('verifiedByReporter')?.value === true;
  }

  // (opcional pero recomendado) protege el handler también
  protected reopenFromAttention(): void {
    const ticketId = this.reportForm.get('_id')?.value;
    if (!ticketId || !this.isClosedStrict()) return; // si está abierto, no hace nada

    const citizenComment = (window.prompt('Motivo de reapertura:', '') || '').trim();

    this.ticketsService.verifyCitizen({ ticketId, resolved: false, citizenComment }).subscribe({
      next: (resp) => {
        this.ticketsService.setTicket(resp.ticket);
        this.patchFormWithTicket(resp.ticket);
        this.dialog.open(SuccessDialog, {
          data: { folio: resp.ticket?.folio, isUpdate: true, message: 'Ticket reabierto.' }
        });
      },
      error: (err) => console.error('Error al reabrir:', err)
    });
  }

  private isClosed(): boolean {
    // “Cerrado” = verificado por ciudadano (estado final)
    return this.isCitizenVerified();
  }

  private get trackingLog(): any[] {
    const arr = (this.reportForm.get('tracking') as FormArray)?.value;
    return Array.isArray(arr) ? arr : [];
  }

  /** ¿El ticket ya está cerrado (verificado por ciudadano)? */
  private isCitizenVerified(): boolean {
    // 1) Fuente confiable: flag directo guardado por backend
    if (this.reportForm.get('verifiedByReporter')?.value === true) return true;

    // 2) Fallback robusto por timeline:
    //    Buscar ÚLTIMO evento de verificación de ciudadano que no sea “no verificado”,
    //    y verificar que sea posterior a cualquier reapertura.
    const log = this.trackingLog;
    if (!log.length) return false;

    const flatText = (ev: any) =>
      (`${ev?.event ?? ''} ${ev?.description ?? ''}`).toString().toLowerCase();

    // A) Coincidencias “positivas” de verificación ciudadana
    const isPositiveCitizenVerify = (t: string) =>
      /(?:verificaci[oó]n|confirmaci[oó]n).*(ciudadan)/.test(t)
      && !/(?:^|\s)(no|sin)\s+(?:verificaci[oó]n|confirmaci[oó]n)/.test(t)
      && !/(?:^|\s)no\s+verificad[oa]\b/.test(t);

    const lastVerify = [...log].reverse().find(ev => isPositiveCitizenVerify(flatText(ev)));

    // B) Cualquier reapertura anula verificación previa
    const isReopen = (t: string) => /reabr/.test(t);
    const lastReopen = [...log].reverse().find(ev => isReopen(flatText(ev)));

    const verAt = lastVerify?.date ? new Date(lastVerify.date).getTime() : -1;
    const repAt = lastReopen?.date ? new Date(lastReopen.date).getTime() : -1;

    return verAt > 0 && verAt > repAt;
  }

  private async resolveStatusNameById(id?: string): Promise<string> {
    if (!id) return '—';
    if (this.statusCache.has(id)) return this.statusCache.get(id)!;

    try {
      const st = await firstValueFrom(this.ticketsService.getStatusById(id));
      const name =
        (st as any)?.name ||
        (st as any)?.label ||
        (st as any)?.description ||
        id; // fallback al ID si no trae nombre
      this.statusCache.set(id, name);
      return name;
    } catch {
      return id; // fallback seguro
    }
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
        // Autocompletar si no hay ticket
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
      this.map = null;
      this.marker = null;
    }
    this.ticketsService.clearTicket();
  }

  private toFullName(u?: User | null): string {
    if (!u) return 'Desconocido';
    const parts = [u.name, u.first_lastname, u.second_lastname].filter(Boolean);
    return parts.length ? parts.join(' ') : 'Desconocido';
  }

  // ---------- Helpers de catálogo / formato ----------
  private getTemaName(id?: string | null): string {
    if (!id) return '—';
    return this.temas().find(t => t._id === id)?.name ?? '—';
  }
  private getAreaName(id?: string | null): string {
    if (!id) return '—';
    return this.areas().find(a => a._id === id)?.name ?? '—';
  }
  private getSourceName(id?: string | null): string {
    if (!id) return '—';
    return this.sources().find(s => s._id === id)?.name ?? '—';
  }
  private getLuminariaById(id?: string | null): Luminaria | undefined {
    if (!id) return undefined;
    return this.luminarias().find(l => l._id === id);
  }
  private getCurrentAreaAssignment(): any {
    const arr = (this.reportForm.get('areaAssignments') as FormArray)?.value || [];
    return arr.length ? arr.at(-1) : null;
  }
  private getCurrentCrewAssignment(): any {
    const arr = (this.reportForm.get('crewAssignments') as FormArray)?.value || [];
    return arr.length ? arr.at(-1) : null;
  }
  private formatDate(d?: any): string {
    if (!d) return '—';
    try {
      const dt = typeof d === 'string' ? new Date(d) : d;
      return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(dt);
    } catch {
      return String(d);
    }
  }

  // ---------- PDF: botón público ----------
  protected async generatePdfs(): Promise<void> {
    await this.generateTicketPdf();
    const lumId = this.reportForm.get('luminaria')?.value;
    if (lumId) {
      // asegurar catálogo cargado (si el ticket viene ya con luminaria)
      if (!this.luminarias().length) {
        try {
          const data = await firstValueFrom(this.ticketsService.getLuminarias());
          this.luminarias.set(data || []);
        } catch {
          // ignora
        }
      }
      await this.generateLuminariaPdf();
    }
  }

  // ---------- Implementación PDF ----------
  private async generateTicketPdf(): Promise<void> {
    const { jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;

    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const folio = this.reportForm.get('folio')?.value || 'Sin folio';

    // Header
    doc.setFontSize(16);
    doc.text(`Ticket ${folio}`, 40, 40);
    doc.setFontSize(10);
    doc.text(`Generado: ${this.formatDate(new Date())}`, 40, 58);

    // Datos de ciudadano
    const name = this.reportForm.get('name')?.value || '';
    const fl = this.reportForm.get('first_lastname')?.value || '';
    const sl = this.reportForm.get('second_lastname')?.value || '';
    const phone = this.reportForm.get('phone')?.value || '';
    const email = this.reportForm.get('email')?.value || '';

    autoTable(doc, {
      startY: 75,
      head: [['Datos del ciudadano', '']],
      body: [
        ['Nombre', `${name} ${fl} ${sl}`.trim()],
        ['Teléfono', phone || '—'],
        ['Correo', email || '—'],
      ],
      styles: { fontSize: 10 },
      headStyles: { fillColor: [33, 150, 243] }
    });

    // Detalles
    const sourceName = this.getSourceName(this.reportForm.get('source')?.value);
    const temaName = this.getTemaName(this.reportForm.get('problem')?.value);
    const desc = this.reportForm.get('description')?.value || '—';

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 12,
      head: [['Detalles del reporte', '']],
      body: [
        ['Origen', sourceName],
        ['Problema', temaName],
        ['Descripción', desc],
      ],
      styles: { fontSize: 10 },
      headStyles: { fillColor: [33, 150, 243] }
    });

    // Ubicación
    const loc = this.reportForm.get('location')?.value || {};
    const coord = loc?.coordinates || {};
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 12,
      head: [['Ubicación', '']],
      body: [
        ['Calle', loc.street || '—'],
        ['No. Ext / Int', `${loc.extNumber || '—'} / ${loc.intNumber || '—'}`],
        ['Entre calles', loc.crossStreets || '—'],
        ['Colonia', loc.neighborhood || '—'],
        ['Ciudad / Municipio', `${loc.city || loc.locality || '—'}`],
        ['Estado / CP', `${loc.state || '—'} / ${loc.postalCode || '—'}`],
        ['País', loc.country || '—'],
        ['Referencias', loc.references || '—'],
        ['Coordenadas', (coord.lat != null && coord.lng != null) ? `${coord.lat}, ${coord.lng}` : '—'],
      ],
      styles: { fontSize: 10 },
      headStyles: { fillColor: [33, 150, 243] }
    });

    // Asignaciones
    const area = this.getCurrentAreaAssignment();
    const crew = this.getCurrentCrewAssignment();

    const assignedByName = await this.resolveUserName(area?.assignedBy);

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 12,
      head: [['Asignaciones', '']],
      body: [
        ['Área actual', this.getAreaName(area?.area) || '—'],
        ['Asignado por', assignedByName],
        ['Asignado el', area?.assignedAt ? this.formatDate(area.assignedAt) : '—'],
        ['Aceptado', area?.accepted == null ? 'Pendiente' : (area.accepted ? 'Sí' : 'No')],
        ['Cuadrilla actual', crew?.crew ? String(crew.crew) : '—'],
        ['Respuesta cuadrilla', crew?.respondedAt ? this.formatDate(crew.respondedAt) : '—'],
      ],
      styles: { fontSize: 10 },
      headStyles: { fillColor: [33, 150, 243] }
    });

    // Imágenes (miniaturas)
    const maxPerRow = 3;
    const thumbW = 140;
    const thumbH = 100;
    let x = 40;
    let y = (doc as any).lastAutoTable.finalY + 24;

    if (this.previewUrls.length) {
      doc.setFontSize(12);
      doc.text('Evidencia fotográfica', 40, y);
      y += 12;

      for (let i = 0; i < this.previewUrls.length; i++) {
        const dataUrl = this.previewUrls[i];
        try {
          doc.addImage(dataUrl, 'JPEG', x, y, thumbW, thumbH, undefined, 'FAST');
        } catch {
          // Ignorar imágenes que no puedan cargarse
        }
        x += thumbW + 12;
        if ((i + 1) % maxPerRow === 0) {
          x = 40;
          y += thumbH + 12;
          if (y > 760) {
            doc.addPage();
            y = 40;
          }
        }
      }
    }

    // Footer
    const folioTxt = `Folio: ${folio}`;
    doc.setFontSize(9);
    const pages = doc.getNumberOfPages();
    for (let p = 1; p <= pages; p++) {
      doc.setPage(p);
      const w = doc.internal.pageSize.getWidth();
      doc.text(
        `${folioTxt}  ·  Página ${p} de ${pages}`,
        w - 40,
        doc.internal.pageSize.getHeight() - 20,
        { align: 'right' }
      );
    }

    doc.save(`Ticket_${folio}.pdf`);
  }

  private getStatusLabelById(id?: string): string {
    if (!id) return '—';
    return id; // fallback
  }

  /** Fila de tabla de mantenimiento alineada al modelo real */
  private maintenanceToRow(m: Maintenance, idx: number): any[] {
    const dateTxt = m?.date ? this.formatDate(m.date) : '—';
    const cuadrillaTxt = m?.cuadrillaId || '—';
    const descTxt = m?.description || '—';
    const obsTxt = m?.observations || '—';
    const materialsTxt = Array.isArray(m?.materialsUsed) && m.materialsUsed.length
      ? m.materialsUsed.join(', ')
      : '—';
    const resolvedStatusTxt = this.getStatusLabelById(m?.resolvedStatusId);

    return [
      String(idx + 1),
      dateTxt,
      cuadrillaTxt,
      descTxt,
      obsTxt,
      materialsTxt,
      resolvedStatusTxt,
    ];
  }

  private async generateLuminariaPdf(): Promise<void> {
    // === Helpers autocontenidos ===
    const daysBetween = (a: Date | string | null | undefined, b: Date | string | null | undefined): number | '—' => {
      if (!a || !b) return '—';
      const d1 = typeof a === 'string' ? new Date(a) : a;
      const d2 = typeof b === 'string' ? new Date(b) : b;
      if (isNaN((d1 as Date).getTime()) || isNaN((d2 as Date).getTime())) return '—';
      const ms = Math.abs((d2 as Date).getTime() - (d1 as Date).getTime());
      return Math.floor(ms / (1000 * 60 * 60 * 24));
    };

    const nextAutoTableY = (doc: any, gap = 16, reserve = 120, bottomMargin = 60, topOnNewPage = 40): number => {
      const lastY = (doc as any).lastAutoTable?.finalY ?? 75;
      const y = lastY + gap;
      const pageH = doc.internal.pageSize.getHeight();
      if (y > pageH - bottomMargin - reserve) {
        doc.addPage();
        return topOnNewPage;
      }
      return y;
    };

    // Normaliza anchos
    const normalizeColumnWidths = (
      contentW: number,
      percents: number[],
      mins: number[],
      expandTo: number[]
    ): number[] => {
      let w = percents.map(p => p * contentW);
      w = w.map((val, i) => Math.max(val, mins[i]));
      let sum = w.reduce((a, b) => a + b, 0);

      if (sum > contentW) {
        let overflow = sum - contentW;
        const caps = w.map((val, i) => Math.max(0, val - mins[i]));
        let totalCap = caps.reduce((a, b) => a + b, 0);

        if (totalCap > 0) {
          w = w.map((val, i) => {
            if (caps[i] === 0) return val;
            const cut = overflow * (caps[i] / totalCap);
            return Math.max(mins[i], val - cut);
          });

          sum = w.reduce((a, b) => a + b, 0);
          const diff = sum - contentW;
          if (Math.abs(diff) > 0.5) {
            const lastFlex = caps.lastIndexOf(Math.max(...caps));
            if (lastFlex >= 0) w[lastFlex] = Math.max(mins[lastFlex], w[lastFlex] - diff);
          }
        } else {
          w[w.length - 1] -= overflow;
        }
      } else if (sum < contentW && expandTo.length) {
        let leftover = contentW - sum;
        const base = expandTo.map(i => w[i]);
        const baseSum = base.reduce((a, b) => a + b, 0) || 1;
        expandTo.forEach((i) => {
          const add = leftover * (w[i] / baseSum);
          w[i] += add;
        });
      }

      w = w.map(v => Math.round(v));
      let finalSum = w.reduce((a, b) => a + b, 0);
      if (finalSum !== contentW) {
        const prefer = expandTo.length ? expandTo[expandTo.length - 1] : (w.length - 1);
        w[prefer] = Math.max(mins[prefer], w[prefer] + (contentW - finalSum));
      }
      return w;
    };

    const { jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;

    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const folio = this.reportForm.get('folio')?.value || 'Sin folio';
    const lumId: string | null = this.reportForm.get('luminaria')?.value || null;

    const lum: Luminaria | undefined = this.getLuminariaById(lumId || undefined);
    if (!lum) {
      doc.setFontSize(14);
      doc.text(`No se encontró la luminaria asociada al Ticket ${folio}`, 40, 60);
      doc.save(`Luminaria_${folio}.pdf`);
      return;
    }

    // Header
    doc.setFontSize(16);
    doc.text(`Luminaria asociada · Ticket ${folio}`, 40, 40);
    doc.setFontSize(10);
    doc.text(`Generado: ${this.formatDate(new Date())}`, 40, 58);

    // --------- Datos básicos ----------
    const statusId = typeof lum.statusId === 'string' ? lum.statusId : (lum.statusId as any)?._id;
    const statusLabel = await this.resolveStatusNameById(statusId);
    const latTxt = lum.location?.lat != null ? String(lum.location.lat) : '—';
    const lngTxt = lum.location?.lng != null ? String(lum.location.lng) : '—';

    autoTable(doc, {
      startY: 75,
      head: [['Datos de luminaria', '']],
      body: [
        ['Código', lum.code ?? '—'],
        ['Tipo', lum.type ?? '—'],
        ['Potencia (W)', lum.power != null ? String(lum.power) : '—'],
        ['Voltaje (V)', lum.voltage != null ? String(lum.voltage) : '—'],
        ['Altura de poste (m)', lum.poleHeight != null ? String(lum.poleHeight) : '—'],
        ['Ubicación (lat, lng)', `${latTxt}, ${lngTxt}`],
        ['Estado', statusLabel],
        ['Instalada el', lum.installationDate ? this.formatDate(lum.installationDate) : '—'],
        ['Creada el', lum.createdAt ? this.formatDate(lum.createdAt) : '—'],
        ['Actualizada el', lum.updatedAt ? this.formatDate(lum.updatedAt) : '—'],
      ],
      styles: { fontSize: 10 },
      headStyles: { fillColor: [255, 193, 7] },
      margin: { left: 40, right: 40, top: 40, bottom: 60 }
    });

    // --------- Historial de mantenimientos ----------
    const maint = Array.isArray(lum.maintenances) ? lum.maintenances.slice() : [];
    maint.sort((a, b) => {
      const da = a?.date ? new Date(a.date).getTime() : 0;
      const db = b?.date ? new Date(b.date).getTime() : 0;
      return db - da;
    });

    const uniqueStatusIds = Array.from(
      new Set([statusId, ...maint.map(m => m?.resolvedStatusId).filter(Boolean) as string[]].filter(Boolean))
    ) as string[];
    await Promise.all(uniqueStatusIds.map(id => this.resolveStatusNameById(id)));

    const totalMaint = maint.length;
    const lastMaintDate = totalMaint ? maint[0]?.date ?? null : null;
    const daysSinceLast = daysBetween(lastMaintDate || null, new Date());

    autoTable(doc, {
      startY: nextAutoTableY(doc, 12, 60),
      head: [['Resumen histórico', '']],
      body: [
        ['Total de mantenimientos', String(totalMaint)],
        ['Última falla/mantenimiento', lastMaintDate ? this.formatDate(lastMaintDate) : '—'],
        ['Días desde la última atención', typeof daysSinceLast === 'number' ? String(daysSinceLast) : '—'],
      ],
      styles: { fontSize: 10 },
      headStyles: { fillColor: [66, 165, 245] },
      margin: { left: 40, right: 40, top: 40, bottom: 60 }
    });

    const bodyRows = await Promise.all(
      maint.map(async (m, i) => {
        const dateTxt = m?.date ? this.formatDate(m.date) : '—';
        const cuadrillaTxt = m?.cuadrillaId || '—';
        const descTxt = m?.description || '—';
        const obsTxt = m?.observations || '—';
        const materialsTxt = Array.isArray(m?.materialsUsed) && m.materialsUsed.length ? m.materialsUsed.join(', ') : '—';
        const resolvedStatusTxt = await this.resolveStatusNameById(m?.resolvedStatusId);
        return [String(i + 1), dateTxt, cuadrillaTxt, descTxt, obsTxt, materialsTxt, resolvedStatusTxt];
      })
    );

    // --------- Tabla de mantenimientos ----------
    {
      const pageW = doc.internal.pageSize.getWidth();
      const left = 40, right = 40;
      const contentW = Math.round(pageW - left - right);

      const P = [0.045, 0.11, 0.11, 0.25, 0.23, 0.16, 0.095];
      const mins = [22, 60, 60, 120, 110, 90, 72];
      const growCols = [3, 4, 5];

      const colW = normalizeColumnWidths(contentW, P, mins, growCols);

      autoTable(doc, {
        startY: nextAutoTableY(doc, 16, 160),
        head: [[ '#', 'Fecha', 'Cuadrilla', 'Descripción', 'Observaciones', 'Materiales usados', 'Estatus resuelto' ]],
        body: bodyRows.length ? bodyRows : [['—', '—', '—', '—', '—', '—', '—']],
        margin: { left, right, top: 40, bottom: 60 },
        tableWidth: contentW,
        styles: {
          fontSize: 9,
          cellPadding: { top: 3, right: 3, bottom: 3, left: 3 },
          overflow: 'linebreak',
          halign: 'left',
          valign: 'top'
        },
        headStyles: {
          fillColor: [76, 175, 80],
          fontStyle: 'bold',
          halign: 'left',
          cellPadding: { top: 4, right: 3, bottom: 4, left: 3 }
        },
        columnStyles: {
          0: { cellWidth: colW[0], halign: 'center' },
          1: { cellWidth: colW[1], halign: 'center' },
          2: { cellWidth: colW[2] },
          3: { cellWidth: colW[3], overflow: 'linebreak' },
          4: { cellWidth: colW[4], overflow: 'linebreak' },
          5: { cellWidth: colW[5], overflow: 'linebreak' },
          6: { cellWidth: colW[6] }
        },
        rowPageBreak: 'avoid',
        pageBreak: 'auto'
      });
    }

    // Footer paginado
    doc.setFontSize(9);
    const pages = doc.getNumberOfPages();
    for (let p = 1; p <= pages; p++) {
      doc.setPage(p);
      const w = doc.internal.pageSize.getWidth();
      doc.text(
        `Ticket ${folio} · Luminaria ${lum.code || lum._id || ''}  ·  Página ${p} de ${pages}`,
        w - 40,
        doc.internal.pageSize.getHeight() - 20,
        { align: 'right' }
      );
    }

    doc.save(`Luminaria_${folio}.pdf`);
  }

  // ---------- Google Maps ----------
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
          this.showMap = false; // Ocultar mapa automáticamente
        });
      } else {
        console.error('Geocoding failed:', status);
      }
    });
  }

  // ---------- Comentarios ----------
  protected submitComment(): void {
    if (!this.commentForm.valid) {
      this.commentForm.markAllAsTouched();
      this.snack.open('El comentario es obligatorio.', 'Ok', { duration: 2500 });
      return;
    }

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
        this.ticketsService.setTicket(updatedTicket);
        this.commentForm.reset();
      },
      error: (err) => {
        console.error('Error al guardar comentario:', err);
      }
    });
  }

  // ---------- Catálogos ----------
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

    // Luminarias
    if ((tema as any).requiresLuminaria) {
      this.ticketsService.getLuminarias().subscribe(data => this.luminarias.set(data));
      this.showLuminarias.set(true);
      luminariaControl?.enable();
    } else {
      this.luminarias.set([]);
      this.showLuminarias.set(false);
      luminariaControl?.disable();
      luminariaControl?.reset();
    }

    // Asignación de área (histórico)
    if ((tema as any).areaId) {
      const assignedBy = this.currentUser?._id || null;
      const currentAssignments = areaAssignments.value || [];
      const lastAssignment = currentAssignments.at(-1);

      const temaAreaId = typeof (tema as any).areaId === 'string' ? (tema as any).areaId : (tema as any).areaId._id;
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
        lastCrew?.patchValue?.({ valid: false });
      }
    }

    this.areaEditable.set(this.isAdminOrAtencion || !(tema as any).areaId);
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
    lastCrew?.patchValue?.({ valid: false });
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

  // ---------- Imágenes ----------
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

  // ---------- Submit ----------
  protected submitForm(): void {
    if (!this.reportForm.valid) {
      // ✅ NUEVO: feedback visible
      this.reportForm.markAllAsTouched();
      this.reportForm.updateValueAndValidity();

      this.snack.open(
        'Faltan datos obligatorios. Revisa los campos marcados en rojo.',
        'Ok',
        { duration: 3500 }
      );

      this.scrollToFirstInvalidControl();
      return;
    }

    const formValues = this.reportForm.getRawValue();
    const ticket: Partial<Ticket> = { ...formValues };
    const images = formValues.images as File[];

    const formData = new FormData();
    formData.append('ticket', JSON.stringify(ticket));
    images.forEach((img) => formData.append('images', img));

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
        this.snack.open('No se pudo guardar el ticket. Intenta de nuevo.', 'Ok', {
          duration: 3500
        });
      }
    );
  }

  // ✅ NUEVO helper: scroll al primer inválido
  private scrollToFirstInvalidControl(): void {
    const firstInvalid: HTMLElement | null =
      document.querySelector('form .ng-invalid');

    if (firstInvalid) {
      firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
      firstInvalid.focus();
    }
  }

  private patchFormWithTicket(ticket: TicketDto) {
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
      lastClosedAt: ticket.lastClosedAt ?? null,
      sentBackToAttentionAt: ticket.sentBackToAttentionAt ?? null,
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

    // --- Resolver cuadrilla asignada (última) y supervisor ---
    try {
      const lastCrew = this.getCurrentCrewAssignment();
      const crewId: string | undefined = lastCrew?.cuadrilla;

      if (crewId) {
        this.ticketsService.getCuadrillaById(crewId).subscribe({
          next: (resp) => {
            console.log(resp)
            if (resp?.ok && resp.cuadrilla) {
              this.currentCuadrilla.set(resp.cuadrilla);

              const sup = resp.cuadrilla.supervisor as any;
              if (sup && typeof sup === 'object' && sup._id) {
                this.currentSupervisor.set(sup as User);
              } else if (typeof sup === 'string') {
                this.userService.getById(sup).subscribe({
                  next: (usr: any) => {
                    const supervisor: User = {
                      _id: usr?._id,
                      name: usr?.name,
                      first_lastname: usr?.first_lastname,
                      second_lastname: usr?.second_lastname,
                      email: usr?.email,
                      phone: usr?.phone
                    };
                    this.currentSupervisor.set(supervisor);
                  },
                  error: () => this.currentSupervisor.set(null)
                });
              } else {
                this.currentSupervisor.set(null);
              }
            } else {
              this.currentCuadrilla.set(null);
              this.currentSupervisor.set(null);
            }
          },
          error: () => {
            this.currentCuadrilla.set(null);
            this.currentSupervisor.set(null);
          }
        });
      } else {
        this.currentCuadrilla.set(null);
        this.currentSupervisor.set(null);
      }
    } catch {
      this.currentCuadrilla.set(null);
      this.currentSupervisor.set(null);
    }

    if (ticket.images?.length > 0) {
      const firstImage = ticket.images?.[0];
      if (typeof firstImage === 'string') {
        this.previewUrl = firstImage;
      } else if (firstImage instanceof File) {
        const reader = new FileReader();
        reader.onload = () => {
          this.zone.run(() => { this.previewUrl = reader.result; });
        };
        reader.readAsDataURL(firstImage);
      } else {
        this.previewUrl = null;
      }
    }

    const temaId = ticket.problem;
    if (temaId) this.onTemaSelected(temaId);

    // Datos del creador (poblado)
    this.createdByUser.set({
      name: ticket.createdByPreview?.name ?? 'Usuario desconocido',
      first_lastname: ticket.createdByPreview?.first_lastname ?? '',
      second_lastname: ticket.createdByPreview?.second_lastname ?? '',
      email: ticket.createdByPreview?.email ?? '',
      phone: ticket.createdByPreview?.phone ?? '',
    });

    if (ticket.luminaria && !this.luminarias().length) {
      this.ticketsService.getLuminarias().subscribe(data => this.luminarias.set(data));
    }
  }

  private get role() { return this.currentUser?.role?.name as string; }

  private get lastCrewAssignment(): any {
    const arr = (this.reportForm.get('crewAssignments') as FormArray)?.value || [];
    return arr.length ? arr.at(-1) : null;
  }

  public canTechClose(): boolean {
    const allowed = ['admin','atencion','supervisor'];
    const arr = (this.reportForm.get('crewAssignments') as FormArray)?.value || [];
    const last = arr.length ? arr.at(-1) : null;
    return allowed.includes(this.currentUser?.role?.name || '')
      && !!last
      && !last?.closure?.closedAt;
  }

  public canSendToAttention(): boolean {
    const allowed = ['admin','atencion','funcionario'];
    const lastClosedAt = this.reportForm.get('lastClosedAt')?.value;
    const sentBackToAttentionAt = this.reportForm.get('sentBackToAttentionAt')?.value;
    return allowed.includes(this.currentUser?.role?.name || '')
      && !!lastClosedAt
      && !sentBackToAttentionAt;
  }

  public canVerifyWithCitizen(): boolean {
    const allowed = ['admin','atencion'];
    const sentBackToAttentionAt = this.reportForm.get('sentBackToAttentionAt')?.value;
    const verifiedByReporter = this.reportForm.get('verifiedByReporter')?.value;
    return allowed.includes(this.currentUser?.role?.name || '')
      && !!sentBackToAttentionAt
      && !verifiedByReporter;
  }

  protected closeAsSupervisor(): void {
    const ticketId = this.reportForm.get('_id')?.value;
    if (!ticketId) return;

    const workSummary = (window.prompt('Resumen del trabajo realizado:', '') || '').trim();
    const materialsUsed = (window.prompt('Materiales usados (coma separada):', '') || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    this.ticketsService.crewClose({ ticketId, workSummary, materialsUsed }).subscribe({
      next: (resp) => {
        this.ticketsService.setTicket(resp.ticket);
        this.patchFormWithTicket(resp.ticket);
        this.dialog.open(SuccessDialog, {
          data: { folio: resp.ticket?.folio, isUpdate: true, message: 'Cierre técnico registrado.' }
        });
      },
      error: (err) => console.error('Error en cierre técnico:', err)
    });
  }

  protected sendTicketToAttention(): void {
    const ticketId = this.reportForm.get('_id')?.value;
    if (!ticketId) return;
    const comment = (window.prompt('Comentario para atención (opcional):', '') || '').trim();

    this.ticketsService.sendToAttention({ ticketId, comment }).subscribe({
      next: (resp) => {
        this.ticketsService.setTicket(resp.ticket);
        this.patchFormWithTicket(resp.ticket);
        this.dialog.open(SuccessDialog, {
          data: { folio: resp.ticket?.folio, isUpdate: true, message: 'Enviado a atención para verificación.' }
        });
      },
      error: (err) => console.error('Error al enviar a atención:', err)
    });
  }

  protected verifyResolved(): void {
    const ticketId = this.reportForm.get('_id')?.value;
    if (!ticketId) return;
    const citizenComment = (window.prompt('Nota de verificación (opcional):', '') || '').trim();

    this.ticketsService.verifyCitizen({ ticketId, resolved: true, citizenComment }).subscribe({
      next: (resp) => {
        this.ticketsService.setTicket(resp.ticket);
        this.patchFormWithTicket(resp.ticket);
        this.dialog.open(SuccessDialog, {
          data: { folio: resp.ticket?.folio, isUpdate: true, message: 'Ticket verificado y cerrado definitivamente.' }
        });
      },
      error: (err) => console.error('Error al verificar cierre:', err)
    });
  }
}
