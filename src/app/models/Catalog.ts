export interface Catalog {
  id: string;
  type: string;
  key: string;
  label: string;
  description?: string;
  metadata?: Record<string, unknown>;
  order: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Especificación de sort explícita para evitar unions con undefined */
export type SortField = 'type' | 'key' | 'label' | 'order' | 'active' | 'createdAt' | 'updatedAt';
export type SortDir = 'asc' | 'desc';
export interface SortSpec { field: SortField; dir: SortDir; }

export interface CatalogSearchRequest {
  filters?: { type?: string; active?: boolean };
  search?: string;
  page: number;
  pageSize: number;
  /** Puede ser opcional para el backend, pero en el FE usamos SortSpec concreto */
  sort?: SortSpec;
}

export interface CatalogSearchResponse {
  items: Catalog[];
  total: number;
  page: number;
  pageSize: number;
  types: string[];
}
