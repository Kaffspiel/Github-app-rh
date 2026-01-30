export interface ParsedTimeRecord {
  externalEmployeeId: string;
  employeeName?: string;
  date: string; // YYYY-MM-DD format
  punches: string[]; // Array of HH:MM times
  rawData?: Record<string, unknown>;
}

export interface ParseResult {
  success: boolean;
  records: ParsedTimeRecord[];
  errors: ParseError[];
  totalRows: number;
}

export interface ParseError {
  row: number;
  message: string;
  data?: unknown;
}

export interface ColumnMapping {
  employeeId: string;
  employeeName?: string;
  date: string;
  punch1?: string;
  punch2?: string;
  punch3?: string;
  punch4?: string;
  punch5?: string;
  punch6?: string;
  punch7?: string;
  punch8?: string;
}

export type FileFormat = "excel" | "csv" | "rep";
