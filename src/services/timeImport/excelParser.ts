import * as XLSX from "xlsx";
import type { ParseResult, ParsedTimeRecord, ParseError, ColumnMapping } from "./types";

export function parseExcel(
  file: ArrayBuffer,
  mapping: ColumnMapping
): ParseResult {
  const errors: ParseError[] = [];
  const records: ParsedTimeRecord[] = [];
  let totalRows = 0;

  try {
    const workbook = XLSX.read(file, { type: "array" });
    
    // Process all sheets
    workbook.SheetNames.forEach(sheetName => {
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert to JSON with header row
      const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
        raw: false,
        defval: "",
      });

      if (data.length === 0) {
        // Skip empty sheets but don't error unless all are empty
        return;
      }

      totalRows += data.length;

      data.forEach((row, index) => {
        const rowNumber = index + 2; // +2 because of header row and 0-index

        try {
          const employeeId = String(row[mapping.employeeId] || "").trim();
          const dateValue = row[mapping.date];
          
          if (!employeeId) {
            errors.push({ row: rowNumber, message: `[${sheetName}] ID do funcionário vazio`, data: row });
            return;
          }

          const date = parseDate(dateValue);
          if (!date) {
            errors.push({ row: rowNumber, message: `[${sheetName}] Data inválida`, data: row });
            return;
          }

          // Collect all punches
          const punches: string[] = [];
          const punchFields = [
            mapping.punch1, mapping.punch2, mapping.punch3, mapping.punch4,
            mapping.punch5, mapping.punch6, mapping.punch7, mapping.punch8,
          ].filter(Boolean) as string[];

          for (const field of punchFields) {
            const punchValue = row[field];
            if (punchValue) {
              const time = parseTime(punchValue);
              if (time) {
                punches.push(time);
              }
            }
          }

          records.push({
            externalEmployeeId: employeeId,
            employeeName: mapping.employeeName ? String(row[mapping.employeeName] || "") : undefined,
            date,
            punches,
            rawData: row,
          });
        } catch (err) {
          errors.push({ row: rowNumber, message: `[${sheetName}] Erro ao processar linha: ${err}`, data: row });
        }
      });
    });

    if (totalRows === 0) {
      return {
        success: false,
        records: [],
        errors: [{ row: 0, message: "Arquivo vazio ou sem dados em nenhuma aba" }],
        totalRows: 0,
      };
    }

    return {
      success: errors.length === 0,
      records,
      errors,
      totalRows,
    };
  } catch (err) {
    return {
      success: false,
      records: [],
      errors: [{ row: 0, message: `Erro ao ler arquivo Excel: ${err}` }],
      totalRows: 0,
    };
  }
}

export function getExcelHeaders(file: ArrayBuffer): string[] {
  try {
    const workbook = XLSX.read(file, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1");
    const headers: string[] = [];
    
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cell = worksheet[XLSX.utils.encode_cell({ r: 0, c: col })];
      headers.push(cell?.v?.toString() || `Coluna ${col + 1}`);
    }
    
    return headers;
  } catch {
    return [];
  }
}

function parseDate(value: unknown): string | null {
  if (!value) return null;

  // Handle Excel serial date
  if (typeof value === "number") {
    const date = XLSX.SSF.parse_date_code(value);
    if (date) {
      return `${date.y}-${String(date.m).padStart(2, "0")}-${String(date.d).padStart(2, "0")}`;
    }
  }

  const strValue = String(value).trim();

  // Try DD/MM/YYYY format
  const brMatch = strValue.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (brMatch) {
    const [, day, month, year] = brMatch;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  // Try YYYY-MM-DD format
  const isoMatch = strValue.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return strValue.substring(0, 10);
  }

  return null;
}

function parseTime(value: unknown): string | null {
  if (!value) return null;

  // Handle Excel serial time
  if (typeof value === "number") {
    const totalMinutes = Math.round(value * 24 * 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  }

  const strValue = String(value).trim();

  // Try HH:MM format
  const timeMatch = strValue.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (timeMatch) {
    const [, hours, minutes] = timeMatch;
    return `${hours.padStart(2, "0")}:${minutes}`;
  }

  // Try HHMM format (without separator)
  const compactMatch = strValue.match(/^(\d{2})(\d{2})$/);
  if (compactMatch) {
    const [, hours, minutes] = compactMatch;
    return `${hours}:${minutes}`;
  }

  return null;
}
