import type { ParseResult, ColumnMapping } from "./types";

export function parseRep(
    file: string,
    mapping: ColumnMapping
): ParseResult {
    // Placeholder implementation
    return {
        success: false,
        records: [],
        errors: [{ row: 0, message: "Importação de arquivo REP (AFD) ainda não implementada." }],
        totalRows: 0,
    };
}

export function getRepHeaders(file: string): string[] {
    return [];
}
