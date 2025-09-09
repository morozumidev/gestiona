export interface Role {
  _id: string;
  name: string;
  description?: string;
  permissions?: string[];
  createdAt?: string;
  updatedAt?: string;
}
export interface RolesSearchRequest {
  page: number;
  pageSize: number;
  search?: string;
  sort?: { field: string; direction: 'asc' | 'desc' };
  // Si luego agregas filtros, agrégalos aquí
  // filters?: { ... };
}

export interface RolesSearchResponse {
  page: number;
  pageSize: number;
  total: number;
  items: Role[];
}