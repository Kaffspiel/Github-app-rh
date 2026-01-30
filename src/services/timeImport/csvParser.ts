import Papa from "papaparse";
import type { ParseResult, ParsedTimeRecord, ParseError, ColumnMapping } from "./types";

export function parseCsv(
  content: string,
  mapping: ColumnMapping
): ParseResult {
  const errors: ParseError[] = [];
  const records: ParsedTimeRecord[] = [];

  try {
    const result = Papa.parse<Record<string, string>>(content, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
    });

    if (result.errors.length > 0) {
      result.errors.forEach((err) => {
        errors.push({
          row: err.row || 0,
          message: err.message,
        });
      });
    }

    if (result.data.length === 0) {
      return {
        success: false,
        records: [],
        errors: [{ row: 0, message: "Arquivo vazio ou sem dados" }],
        totalRows: 0,
      };
    }

    result.data.forEach((row, index) => {
      const rowNumber = index + 2; // +2 for header and 0-index

      try {
        const employeeId = (row[mapping.employeeId] || "").trim();
        const dateValue = row[mapping.date];

        if (!employeeId) {
          errors.push({ row: rowNumber, message: "ID do funcionário vazio", data: row });
          return;
        }

        const date = parseDate(dateValue);
        if (!date) {
          errors.push({ row: rowNumber, message: "Data inválida", data: row });
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
          employeeName: mapping.employeeName ? row[mapping.employeeName] : undefined,
          date,
          punches,
          rawData: row,
        });
      } catch (err) {
        errors.push({ row: rowNumber, message: `Erro ao processar linha: ${err}`, data: row });
      }
    });

    return {
      success: errors.length === 0,
      records,
      errors,
      totalRows: result.data.length,
    };
  } catch (err) {
    return {
      success: false,
      records: [],
      errors: [{ row: 0, message: `Erro ao ler arquivo CSV: ${err}` }],
      totalRows: 0,
    };
  }
}

export function getCsvHeaders(content: string): string[] {
  try {
    const result = Papa.parse(content, {
      preview: 1,
      header: false,
    });

    if (result.data.length > 0) {
      return (result.data[0] as string[]).map((h) => h.trim());
    }

    return [];
  } catch {
    return [];
  }
}

function parseDate(value: string): string | null {
  if (!value) return null;

  const strValue = value.trim();

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

  // Try DD-MM-YYYY format
  const dashMatch = strValue.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dashMatch) {
    const [, day, month, year] = dashMatch;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  return null;
}

function parseTime(value: string): string | null {
  if (!value) return null;

  const strValue = value.trim();

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
