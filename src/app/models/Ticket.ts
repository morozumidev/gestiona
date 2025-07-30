import { TicketTracking } from './TicketTracking';

export interface Ticket {
  _id?: string;
  folio: string;

  // Datos del reportante
  name: string;
  first_lastname?: string;
  second_lastname?: string;
  phone: string;
  email: string;

  // Catálogos dinámicos
  source: string | null;
  status: string | null;

  // Detalles del problema
  problem: string;
  description: string;

  // Ubicación
  location: {
    street: string;
    extNumber: string;
    intNumber?: string;
    crossStreets?: string;
    neighborhood: string;
    borough?: string;
    locality?: string;
    city?: string;
    state: string;
    postalCode: string;
    country: string;
    references?: string;
    coordinates: {
      lat: number;
      lng: number;
    };
  };

  // Evidencias
  images: string[];

  // Asignaciones a áreas (historial)
  areaAssignments: {
    area: string;
    accepted: boolean;
    rejectionReason: string | null;
    respondedAt: Date | null;
    assignedAt: Date;
    assignedBy: string;
    rejectedBy?: string | null;
  }[];


  // Asignaciones a cuadrillas (historial)
  crewAssignments: {
    cuadrilla: string;
    accepted: boolean;
    rejectionReason: string | null;
    respondedAt: Date | null;
    assignedAt: Date;
    assignedBy: string;
  }[];


  // Verificación
  verifiedByReporter: boolean;
  verifiedBy?: string;

  // Seguimiento
  tracking: TicketTracking[];

  // Auditoría
  createdBy?: string;
  createdAt?: Date;
  updatedAt?: Date;

  // Otros
  luminaria?: string;
}
