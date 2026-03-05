export interface AccumulatedRecord {
  employeeName: string;
  predictedHours: string;
  workedHours: string;
  bonusHours: string;
  balance: string;
}

export interface ParsedTimeRecord {
  externalEmployeeId: string;
  employeeName?: string;
  date: string; // YYYY-MM-DD format
  punches: string[]; // Array of HH:MM times
  rawData?: Record<string, unknown>;
}

export interface ParseResult {
  success: boolean;
  documentType?: 'daily' | 'accumulated' | 'hybrid';
  sourceName?: string;
  periodStart?: string;
  periodEnd?: string;
  companyName?: string;
  records: ParsedTimeRecord[];
  accumulatedRecords?: AccumulatedRecord[];
  errors: ParseError[];
  error?: string; // Top-level error
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
