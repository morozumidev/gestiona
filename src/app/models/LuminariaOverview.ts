export interface LuminariaMaintenanceSummary {
  count: number;
  lastDate?: string | Date | null;
  lastDescription?: string | null;
  lastObservations?: string | null;
  lastResolvedStatusId?: string | null;
}

export interface LuminariaMaintenancePreview {
  date?: string | Date | null;
  description?: string | null;
  observations?: string | null;
  performedBy?: string | null;
  resolvedStatusId?: string | null;
  materialsUsed?: string[];
}

export interface LuminariaStatusRef {
  _id?: string;
  name?: string;
  description?: string;
}

export interface LuminariaOverview {
  _id: string;
  code?: string;
  type?: string;
  power?: number;
  voltage?: number;
  poleHeight?: number;
  location?: {
    lat?: number;
    lng?: number;
  };
  statusId?: LuminariaStatusRef | string | null;
  installationDate?: string | Date | null;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
  maintenanceSummary?: LuminariaMaintenanceSummary;
  maintenancePreview?: LuminariaMaintenancePreview[];
}
