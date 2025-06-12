import { Component, computed, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';

import { MatTableModule } from '@angular/material/table';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';

import { MatTableDataSource } from '@angular/material/table';
import {
  animate,
  state,
  style,
  transition,
  trigger,
} from '@angular/animations';

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import autoTable from 'jspdf-autotable';

export interface Luminaria {
  id: string;
  nomenclatura: string;
  estado: string;
  tipo: string;
  potencia: string;
  ubicacion: string;
  latitud: number;
  longitud: number;
  fotoUrl: string;
  fechaInstalacion: string;
  status: string;
  observaciones: string;
}

const LUMINARIAS_DATA: Luminaria[] = [
  {
    id: 'L001',
    nomenclatura: 'CA-1008',
    estado: 'Operativa',
    tipo: 'LED',
    potencia: '150W',
    ubicacion: 'Av. Reforma y 5 de Mayo',
    latitud: 19.1723,
    longitud: -96.1345,
    fotoUrl: 'https://example.com/luminaria1.jpg',
    fechaInstalacion: '2021-05-12',
    status: 'Encendida',
    observaciones: 'Funcionando correctamente',
  },
  {
    id: 'L002',
    nomenclatura: 'AL-15',
    estado: 'En mantenimiento',
    tipo: 'Sodio',
    potencia: '250W',
    ubicacion: 'Calle Juárez y Hidalgo',
    latitud: 19.1737,
    longitud: -96.135,
    fotoUrl: 'https://example.com/luminaria2.jpg',
    fechaInstalacion: '2019-11-20',
    status: 'Apagada',
    observaciones: 'Requiere cambio de balasto',
  },
  // ... más datos
];

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
        style({ opacity: 0, transform: 'scale(0.95)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'scale(1)' })),
      ]),
      transition(':leave', [
        animate(
          '300ms ease-in',
          style({ opacity: 0, transform: 'scale(0.95)' })
        ),
      ]),
    ]),
  ],
})
export class Luminarias implements OnInit {
  displayedColumns: string[] = [
    'id',
    'nomenclatura',
    'estado',
    'tipo',
    'potencia',
    'ubicacion',
    'fechaInstalacion',
    'status',
    'actions',
  ];
  dataSource = new MatTableDataSource<Luminaria>(LUMINARIAS_DATA);

  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  selectedLuminaria: Luminaria | null = null;

  ngOnInit() {
    // Null check on ViewChild (por seguridad)
    if (this.sort) this.dataSource.sort = this.sort;
    if (this.paginator) this.dataSource.paginator = this.paginator;
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value
      .trim()
      .toLowerCase();
    this.dataSource.filter = filterValue;
  }

  selectLuminaria(row: Luminaria) {
    this.selectedLuminaria = row;
  }

semaforoCounts() {
  const counts = {
    verde: 0,   // Encendido
    ambar: 0,   // Intermitente
    rojo: 0     // Apagado
  };

  for (const lum of this.dataSource.data) {
    switch (lum.status) {
      case 'Encendida':
        counts.verde++;
        break;
      case 'Intermitente':
        counts.ambar++;
        break;
      case 'Apagada':
        counts.rojo++;
        break;
    }
  }

  return counts;
}


  clearSelection() {
    this.selectedLuminaria = null;
  }
async printLuminaria() {
  if (!this.selectedLuminaria) return;

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    console.warn('Solo disponible en cliente');
    return;
  }

  const { nomenclatura, estado, tipo, potencia, ubicacion, fechaInstalacion, status, observaciones, fotoUrl, latitud, longitud } = this.selectedLuminaria;

  const [{ default: L }, { default: html2canvas }] = await Promise.all([
    import('leaflet'),
    import('html2canvas'),
  ]);


  // Contenedor visible pero oculto
  const mapContainer = document.createElement('div');
  mapContainer.id = 'print-map';
  mapContainer.style.width = '600px';
  mapContainer.style.height = '400px';
  mapContainer.style.visibility = 'hidden'; // importante: no usar display: none
  document.body.appendChild(mapContainer);

  const map = L.map(mapContainer).setView([latitud, longitud], 15);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
  }).addTo(map);

  L.marker([latitud, longitud]).addTo(map);

  // Forzar redimensionamiento
  map.invalidateSize();

  // Espera a que los tiles se carguen
  const tilesLoaded = new Promise<void>((resolve) => {
    map.on('load', () => resolve());
  });

  setTimeout(async () => {
    await tilesLoaded;

    html2canvas(mapContainer).then(canvas => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF();

      pdf.text(`Luminaria ${nomenclatura}`, 10, 10);

      autoTable(pdf, {
        startY: 20,
        head: [['Propiedad', 'Detalle']],
        body: [
          ['ID', this.selectedLuminaria!.id],
          ['Estado', estado],
          ['Tipo', tipo],
          ['Potencia', potencia],
          ['Ubicación', ubicacion],
          ['Fecha Instalación', fechaInstalacion],
          ['Status Actual', status],
          ['Observaciones', observaciones],
        ],
      });

      const finalY = (pdf as any).lastAutoTable?.finalY || 40;

      pdf.addImage(fotoUrl, 'JPEG', 10, finalY + 10, 80, 60);
      pdf.addImage(imgData, 'PNG', 100, finalY + 10, 80, 60);

      pdf.output('dataurlnewwindow');

      map.remove();
      document.body.removeChild(mapContainer);
    });
  }, 1000);
}

}
