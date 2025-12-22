import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';

import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';

import {
  animate,
  style,
  transition,
  trigger,
} from '@angular/animations';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { CatalogsService } from '../../../services/catalog-service';
import { LuminariaOverview } from '../../../models/LuminariaOverview';

type StatusTone = 'good' | 'warn' | 'bad' | 'neutral';

interface LuminariaRow extends LuminariaOverview {
  statusLabel: string;
  statusTone: StatusTone;
  coordsLabel: string;
  maintenanceCount: number;
  lastMaintenanceDate?: string | Date | null;
  lastMaintenanceNote?: string | null;
}

@Component({
  selector: 'app-luminarias',
  templateUrl: './luminarias.html',
  styleUrls: ['./luminarias.scss'],
  imports: [
    CommonModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
  ],
  animations: [
    trigger('fadeInOut', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(8px)' }),
        animate('320ms ease-out', style({ opacity: 1, transform: 'translateY(0)' })),
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ opacity: 0, transform: 'translateY(8px)' })),
      ]),
    ]),
  ],
})
export class Luminarias implements OnInit, AfterViewInit {
  displayedColumns: string[] = [
    'code',
    'type',
    'power',
    'voltage',
    'poleHeight',
    'location',
    'status',
    'lastMaintenance',
    'actions',
  ];

  dataSource = new MatTableDataSource<LuminariaRow>([]);
  loading = false;
  errorMessage: string | null = null;
  lastUpdated: Date | null = null;
  statusFilter: 'all' | StatusTone = 'all';
  searchTerm = '';

  selectedLuminaria: LuminariaRow | null = null;
  selectedMapUrl: SafeResourceUrl | null = null;

  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private readonly catalogsService: CatalogsService,
    private readonly sanitizer: DomSanitizer
  ) {}

  ngOnInit() {
    this.setupFilterPredicate();
    this.setupSortingAccessor();
    this.loadLuminarias();
  }

  ngAfterViewInit() {
    if (this.sort) this.dataSource.sort = this.sort;
    if (this.paginator) this.dataSource.paginator = this.paginator;
  }

  reload() {
    this.loadLuminarias();
  }

  applyFilter(event: Event) {
    this.searchTerm = (event.target as HTMLInputElement).value.trim().toLowerCase();
    this.applyCombinedFilter();
  }

  setStatusFilter(filter: 'all' | StatusTone) {
    this.statusFilter = filter;
    this.applyCombinedFilter();
  }

  selectLuminaria(row: LuminariaRow) {
    this.selectedLuminaria = row;
    this.selectedMapUrl = this.buildMapUrl(row);
  }

  clearSelection() {
    this.selectedLuminaria = null;
    this.selectedMapUrl = null;
  }

  totalCount(): number {
    return this.dataSource.data.length;
  }

  statusCounts() {
    const counts = { good: 0, warn: 0, bad: 0, neutral: 0 };
    for (const lum of this.dataSource.data) {
      counts[lum.statusTone]++;
    }
    return counts;
  }

  daysSince(date?: string | Date | null): number | null {
    if (!date) return null;
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return null;
    const diff = Date.now() - d.getTime();
    return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
  }

  statusToneLabel(tone: 'all' | StatusTone): string {
    if (tone === 'all') return 'Todas';
    switch (tone) {
      case 'good':
        return 'Operativas';
      case 'warn':
        return 'Atencion';
      case 'bad':
        return 'Fuera de servicio';
      default:
        return 'Sin estado';
    }
  }

  async printLuminaria() {
    if (!this.selectedLuminaria) return;

    if (typeof window === 'undefined' || typeof document === 'undefined') {
      console.warn('Solo disponible en cliente');
      return;
    }

    const lum = this.selectedLuminaria;
    const coords = lum.location;
    const lat = coords?.lat;
    const lng = coords?.lng;

    const [{ default: L }, { default: html2canvas }] = await Promise.all([
      import('leaflet'),
      import('html2canvas'),
    ]);

    const mapContainer = document.createElement('div');
    mapContainer.id = 'print-map';
    mapContainer.style.width = '600px';
    mapContainer.style.height = '400px';
    mapContainer.style.visibility = 'hidden';
    document.body.appendChild(mapContainer);

    let map: any = null;

    if (lat != null && lng != null) {
      map = L.map(mapContainer).setView([lat, lng], 15);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
      }).addTo(map);

      L.marker([lat, lng]).addTo(map);
      map.invalidateSize();
    }

    const finish = async (mapImage?: string) => {
      const pdf = new jsPDF();

      pdf.setFontSize(14);
      pdf.text(`Luminaria ${lum.code ?? lum._id ?? ''}`, 10, 14);

      autoTable(pdf, {
        startY: 22,
        head: [['Propiedad', 'Detalle']],
        body: [
          ['Codigo', lum.code ?? '—'],
          ['Estado', lum.statusLabel ?? '—'],
          ['Tipo', lum.type ?? '—'],
          ['Potencia (W)', lum.power != null ? String(lum.power) : '—'],
          ['Voltaje (V)', lum.voltage != null ? String(lum.voltage) : '—'],
          ['Altura (m)', lum.poleHeight != null ? String(lum.poleHeight) : '—'],
          ['Coordenadas', lum.coordsLabel || '—'],
          ['Instalada', lum.installationDate ? new Date(lum.installationDate).toLocaleDateString() : '—'],
          ['Mantenimientos', String(lum.maintenanceCount ?? 0)],
          ['Ultima atencion', lum.lastMaintenanceDate ? new Date(lum.lastMaintenanceDate).toLocaleDateString() : '—'],
          ['Notas recientes', lum.lastMaintenanceNote || '—'],
        ],
      });

      const finalY = (pdf as any).lastAutoTable?.finalY || 40;

      if (mapImage) {
        pdf.addImage(mapImage, 'PNG', 10, finalY + 10, 180, 110);
      }

      pdf.save(`Luminaria_${lum.code || lum._id || 'detalle'}.pdf`);
    };

    if (map) {
      setTimeout(async () => {
        const canvas = await html2canvas(mapContainer);
        const imgData = canvas.toDataURL('image/png');
        await finish(imgData);
        map.remove();
        document.body.removeChild(mapContainer);
      }, 900);
    } else {
      await finish();
      document.body.removeChild(mapContainer);
    }
  }

  private loadLuminarias() {
    this.loading = true;
    this.errorMessage = null;

    this.catalogsService.getLuminariasOverview().subscribe({
      next: (data) => {
        const rows = (data || []).map((lum) => this.mapToRow(lum));
        this.dataSource.data = rows;
        this.lastUpdated = new Date();
        this.applyCombinedFilter(false);
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al cargar luminarias:', err);
        this.errorMessage = 'No se pudieron cargar las luminarias.';
        this.loading = false;
      },
    });
  }

  private setupFilterPredicate() {
    this.dataSource.filterPredicate = (data: LuminariaRow, filter: string) => {
      let criteria: { search: string; tone: 'all' | StatusTone } = { search: '', tone: 'all' };
      try {
        criteria = JSON.parse(filter);
      } catch {
        criteria.search = filter;
      }

      const haystack = [
        data.code,
        data.type,
        data.statusLabel,
        data.coordsLabel,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const matchesSearch = !criteria.search || haystack.includes(criteria.search);
      const matchesTone = criteria.tone === 'all' || data.statusTone === criteria.tone;

      return matchesSearch && matchesTone;
    };
  }

  private setupSortingAccessor() {
    this.dataSource.sortingDataAccessor = (item: LuminariaRow, property: string) => {
      switch (property) {
        case 'power':
          return item.power ?? 0;
        case 'voltage':
          return item.voltage ?? 0;
        case 'poleHeight':
          return item.poleHeight ?? 0;
        case 'status':
          return item.statusLabel ?? '';
        case 'location':
          return item.coordsLabel ?? '';
        case 'lastMaintenance':
          return item.lastMaintenanceDate ? new Date(item.lastMaintenanceDate).getTime() : 0;
        default:
          return (item as any)[property] ?? '';
      }
    };
  }

  private applyCombinedFilter(resetPage = true) {
    this.dataSource.filter = JSON.stringify({
      search: this.searchTerm,
      tone: this.statusFilter,
    });

    if (resetPage && this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  private mapToRow(lum: LuminariaOverview): LuminariaRow {
    const statusLabel = this.resolveStatusLabel(lum.statusId);
    const statusTone = this.resolveStatusTone(statusLabel);
    const coordsLabel = this.formatCoords(lum.location);
    const summary = lum.maintenanceSummary;
    const maintenanceCount = typeof summary?.count === 'number' ? summary.count : 0;
    const lastMaintenanceDate = summary?.lastDate ?? null;
    const lastMaintenanceNote = summary?.lastObservations || summary?.lastDescription || null;

    return {
      ...lum,
      statusLabel,
      statusTone,
      coordsLabel,
      maintenanceCount,
      lastMaintenanceDate,
      lastMaintenanceNote,
    };
  }

  private resolveStatusLabel(status: LuminariaOverview['statusId']): string {
    if (!status) return 'Sin estado';
    if (typeof status === 'string') return 'Estado sin nombre';
    return status.name || 'Sin estado';
  }

  private resolveStatusTone(label: string): StatusTone {
    const value = label.toLowerCase();

    if (/(operativa|activa|encendida|funcionando)/.test(value)) {
      return 'good';
    }
    if (/(mantenimiento|intermitente|revision|atencion|reparacion)/.test(value)) {
      return 'warn';
    }
    if (/(apagada|fuera|inactiva|danada|critica)/.test(value)) {
      return 'bad';
    }
    return 'neutral';
  }

  private formatCoords(location?: { lat?: number; lng?: number } | null): string {
    if (location?.lat == null && location?.lng == null) return '—';
    const lat = location?.lat != null ? location.lat.toFixed(5) : '—';
    const lng = location?.lng != null ? location.lng.toFixed(5) : '—';
    return `${lat}, ${lng}`;
  }

  private buildMapUrl(lum: LuminariaRow): SafeResourceUrl | null {
    const lat = lum.location?.lat;
    const lng = lum.location?.lng;
    if (lat == null || lng == null) return null;
    const url = `https://maps.google.com/maps?q=${lat},${lng}&z=16&output=embed`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }
}
