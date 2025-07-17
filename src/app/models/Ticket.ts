import { TicketTracking } from "./TicketTracking";

export interface Ticket {
  _id?: string;
  folio: string;

  // Datos del reportante
  name: string;
  phone: string;
  email: string;

  // Catálogos dinámicos
  source: string;             // type: 'source'
  service: string;            // type: 'service'
  area: string;               // type: 'area'
  status: string;             // type: 'ticket_status'
  workflowStage: string;      // type: 'ticket_stage'

  // Detalles del problema
  problem: string;
  description: string;

  // Ubicación
location: {
  street: string;               // Ej. "Av. Díaz Mirón"
  extNumber: string;           // Ej. "2010"
  crossStreets?: string;       // Ej. "Entre Tuero Molina y Cañonero Tampico"
  neighborhood: string;        // Ej. "Moderno"
  postalCode?: string;         // Ej. "91918"
  locality?: string;           // Ej. "Veracruz"
  state?: string;              // Ej. "Veracruz"
  country?: string;            // Ej. "México"
  coordinates: {
    lat: number;
    lng: number;
  };
}


  // Evidencias
  images: string[];

  // Asignación de área
  areaAssignment?: {
    assignedTo: string; // Area ID
    accepted: boolean | null;
    rejectionReason: string | null;
    respondedAt: Date | null;
  };

  // Asignación de cuadrilla
  crewAssignment?: {
    assignedTo: string; // User ID (cuadrilla)
    accepted: boolean | null;
    rejectionReason: string | null;
    respondedAt: Date | null;
  };

  // Verificación
  verifiedByReporter?: boolean;
  verifiedBy?: string; // User ID

  // Seguimiento
  tracking: TicketTracking[];

  // Auditoría
  createdBy?: string; // User ID
  createdAt?: Date;
  updatedAt?: Date;
}
