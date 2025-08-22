// models/ticket.ts
export interface TrackingUser {
  _id: string;
  name?: string;
  role?: string;
}

export interface TicketTracking {
  event: string;
  description: string;
  files: string[];
  date?: string;           // ISO
  user: TrackingUser;
}

export interface CrewClosure {
  closedBy: string | null;
  closedAt: string | null; // ISO
  workSummary: string;
  materialsUsed: string[];
  photos: string[];
}

export interface CrewAssignment {
  cuadrilla: string;              // ObjectId
  accepted: boolean;
  rejectionReason: string | null;
  respondedAt?: string | null;    // ISO
  assignedAt: string;             // ISO
  assignedBy?: string | null;
  valid: boolean;
  closure?: CrewClosure | null;   // ✅ NUEVO
}

export interface AreaAssignment {
  area: string;                   // ObjectId
  accepted: boolean;
  rejectionReason: string | null;
  respondedAt?: string | null;    // ISO
  assignedAt: string;             // ISO
  assignedBy?: string | null;
  rejectedBy?: string | null;
}

export interface LocationInfo {
  street?: string;
  extNumber?: string;
  intNumber?: string;
  crossStreets?: string;
  neighborhood?: string;
  locality?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  references?: string;
  coordinates?: { lat?: number | null; lng?: number | null } | null;
}



export interface Ticket {
  _id: string;
  folio?: string;

  // Datos del reportante
  name?: string;
  first_lastname?: string;
  second_lastname?: string;
  phone?: string;
  email?: string;

  // Catálogos dinámicos
  source: string | null;
  status: string | null;

  // Detalles del problema
  problem: string | null;
  description?: string;

  // Ubicación
  location: LocationInfo;

  // Evidencias (API almacena strings/URLs)
  images: File[];

  // Comentario ciudadano (✅ nuevo en modelo)
  citizenComment: string;

  // Asignaciones (historial)
  areaAssignments: AreaAssignment[];
  crewAssignments: CrewAssignment[];

  // Verificación
  verifiedByReporter: boolean;
  verifiedBy?: string | null;

  // Seguimiento
  tracking: TicketTracking[];

  // Auditoría
  createdBy?: string | null;

  // Relaciones
  luminaria?: string | null;

  // Activos / derivados
  activeArea: string | null;
  activeCuadrilla: string | null;
  lastClosedAt: string | null;           // ISO
  sentBackToAttentionAt: string | null;  // ISO

  // Geo

  // Timestamps
  createdAt: string;  // ISO
  updatedAt: string;  // ISO
}
