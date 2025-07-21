import { TicketTracking } from "./TicketTracking";

export interface Ticket {
  _id?: string;
  folio: string;

  // Datos del reportante
  name: string;
  first_lastname?: string;    // Primer apellido
  second_lastname?: string;   // Segundo apellido
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
  street: string;               // "Av. Díaz Mirón"
  extNumber: string;           // "2010"
  intNumber?: string;          // "Depto. 5" o "Interior B"
  crossStreets?: string;       // "Entre Tuero Molina y Cañonero Tampico"
  neighborhood: string;        // "Moderno"
  borough?: string;            // "Veracruz" (en CDMX sería "Benito Juárez")
  locality?: string;           // "Veracruz" (delegación o municipio)
  city?: string;               // "Veracruz" o "Boca del Río"
  state: string;               // "Veracruz"
  postalCode: string;          // "91918"
  country: string;             // "México"
  references?: string;         // "Frente a la gasolinera"
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

  luminaria?: string; // Luminaria ID, opcional para tickets relacionados con luminarias
}
