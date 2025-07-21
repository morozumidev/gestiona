export interface Maintenance {
  date: Date;
  cuadrillaId: string;
  description?: string;
  observations?: string;
  materialsUsed?: string[];
  resolvedStatusId?: string;
}