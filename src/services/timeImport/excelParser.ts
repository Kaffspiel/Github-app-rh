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

    // Keep track of the last valid column map to use as fallback for continuation sheets
    let globalColumnMap: Record<string, number> | null = null;
    let globalHeaderRowIndex = -1; // To know if we should skip the first row or not? 
    // Actually, if we reuse map, we assume data starts at 0 unless we find a new header.

    // Process all sheets
    workbook.SheetNames.forEach((sheetName, sheetIndex) => {
      const worksheet = workbook.Sheets[sheetName];

      // 1. Convert to array of arrays to have full control
      const rawData = XLSX.utils.sheet_to_json<any[]>(worksheet, {
        header: 1,
        raw: false,
        defval: "",
      });

      if (rawData.length === 0) return;

      // 2. Find the header row index for THIS sheet
      let headerRowIndex = -1;
      let sheetColumnMap: Record<string, number> = {};
      let sheetEmployeeName: string | undefined;

      // Scan first rows for Metadata (Employee Name) AND Header Row
      const requiredColumns = [mapping.employeeId, mapping.date].map(c => c.toLowerCase());

      let foundHeaders = false;

      for (let i = 0; i < Math.min(20, rawData.length); i++) {
        const row = rawData[i];
        const rowValues = row.map((v: any) => String(v).trim().toLowerCase());
        const rowString = rowValues.join(" ");

        // Try to extract metadata "Nome: ..."
        if (!sheetEmployeeName) {
          const nameMatch = rowString.match(/nome:\s*([^\s][^-]+)/i); // Simple match "Nome: Fulano..."
          // In array of arrays, "Nome" might be in col 0 and "Amanda" in col 2.
          // Let's look for the cell containing "Nome:"
          row.forEach((cell: any, idx: number) => {
            const val = String(cell || "");
            if (val.toLowerCase().includes("nome:")) {
              // value might be "Nome: Amanda" OR "Nome:" and next cell is "Amanda"
              const parts = val.split(":");
              if (parts[1] && parts[1].trim().length > 2) {
                sheetEmployeeName = parts[1].trim();
              } else if (row[idx + 1]) {
                sheetEmployeeName = String(row[idx + 1]).trim();
              }
            } else if (val.toLowerCase() === "nome" && row[idx + 1]) {
              sheetEmployeeName = String(row[idx + 1]).trim();
            }
          });
        }

        // Check if this row contains our required headers
        // If mapping.employeeId is missing/generic, we might rely on Date column to find the table
        // But for now, let's assume the user mapped "Dia" -> Date
        const matchesRequest = requiredColumns.every(reqCol => {
          // loose check: if reqCol is empty ignore it? 
          // no, user mapping is mandatory.
          return rowValues.some(rv => rv.includes(reqCol));
        });

        if (matchesRequest) {
          headerRowIndex = i;
          foundHeaders = true;
          // Build the map
          row.forEach((colName: any, idx: number) => {
            if (colName) {
              sheetColumnMap[String(colName).trim()] = idx;
            }
          });
          globalColumnMap = { ...sheetColumnMap };
          break;
        }
      }

      // Logic for sheets without headers (Continuation Sheets)
      if (!foundHeaders) {
        if (globalColumnMap) {
          sheetColumnMap = globalColumnMap;
          headerRowIndex = -1;
        } else {
          // If we didn't find specific headers, maybe the user wants to treat this as raw list?
          // Fallback
          headerRowIndex = 0;
          const firstRow = rawData[0];
          if (firstRow) {
            firstRow.forEach((colName: any, idx: number) => {
              if (colName) sheetColumnMap[String(colName).trim()] = idx;
            });

            // IMPORTANT: If this is the first sheet (or we haven't found a global map yet), 
            // and we successfully built a map (even via fallback), define it as the global map.
            // This allows Sheet 2 (continuation) to use this map if it has no headers.
            if (!globalColumnMap && Object.keys(sheetColumnMap).length > 0) {
              globalColumnMap = { ...sheetColumnMap };
            }
          }
        }
      }

      const startRow = headerRowIndex + 1;

      const getValue = (row: any[], mapName?: string) => {
        if (!mapName) return undefined;
        let idx = sheetColumnMap[mapName];
        if (idx === undefined) {
          const lowerMapName = mapName.toLowerCase();
          const key = Object.keys(sheetColumnMap).find(k => k.toLowerCase() === lowerMapName);
          if (key) idx = sheetColumnMap[key];
        }
        if (idx === undefined) return undefined;
        return row[idx];
      };

      for (let i = startRow; i < rawData.length; i++) {
        const row = rawData[i];
        const rowNumber = i + 1;

        try {
          // Employee ID: 
          // If mapping is pointing to a column, use it.
          // If not found in row (empty), but we found a sheet header name, use a generated ID or the Name?
          // The interface requires `employeeId` mapping. 
          // If the user's Excel DOES NOT have an ID column, they might map mapped "Nome" to ID?
          // Let's use standard retrieval:
          let employeeId = String(getValue(row, mapping.employeeId) || "").trim();
          let employeeName = mapping.employeeName ? String(getValue(row, mapping.employeeName) || "") : "";

          // Fallback to sheet metadata if row data is missing (common in reports)
          if (!employeeName && sheetEmployeeName) employeeName = sheetEmployeeName;

          // If ID is missing, try to use Name as ID if available, or skip
          if (!employeeId && employeeName) {
            // Heuristic: If we have a name but no ID column value, maybe the ID is implicit?
            // Use Name as External ID to allow import
            employeeId = employeeName;
          }

          // Skip empty garbage rows
          if (!employeeId ||
            employeeId.toLowerCase().includes("total") || // Footer row
            employeeId.toLowerCase().includes("banco de horas") ||
            employeeId.toLowerCase().includes("nome:")) {
            continue;
          }

          // Special Check: Is this a "Header" row inside the data? (Repeated header)
          if (employeeId.toLowerCase() === mapping.employeeId.toLowerCase() ||
            (mapping.date && String(getValue(row, mapping.date)).toLowerCase().includes(mapping.date.toLowerCase()))
          ) {
            continue;
          }

          const dateValue = getValue(row, mapping.date);
          const date = parseDate(dateValue);

          if (!date) {
            // If date is invalid, it's likely not a data row (header, footer, spacer)
            continue;
          }

          // Collect punches
          const punches: string[] = [];
          const punchFields = [
            mapping.punch1, mapping.punch2, mapping.punch3, mapping.punch4,
            mapping.punch5, mapping.punch6, mapping.punch7, mapping.punch8,
          ].filter(Boolean) as string[];

          for (const field of punchFields) {
            const val = getValue(row, field);
            if (val) {
              const valStr = String(val);
              // Check if it has MULTIPLE times in one cell (e.g. "08:00 12:00")
              // Regex finds HH:MM patterns
              const timeMatches = valStr.match(/(\d{1,2}:\d{2})/g);

              if (timeMatches && timeMatches.length > 0) {
                // Push all found times
                timeMatches.forEach(t => punches.push(t));
              } else {
                // Try standard single parse
                const time = parseTime(val);
                if (time) punches.push(time);
              }
            }
          }

          records.push({
            externalEmployeeId: employeeId,
            employeeName: employeeName || undefined,
            date,
            punches,
            rawData: { ...row, sheet: sheetName },
          });

          totalRows++;

        } catch (err) {
          errors.push({ row: rowNumber, message: `[${sheetName}] Erro: ${err}`, data: row });
        }
      }
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
