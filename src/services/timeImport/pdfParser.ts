import * as pdfjsLib from 'pdfjs-dist';
import type { ParseResult, ParsedTimeRecord, ParseError, ColumnMapping } from "./types";

// Helper to init PDF worker
const initWorker = () => {
    if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
        // Use a fixed version that is compatible with the installed pdfjs-dist
        // pdfjs-dist@5.4.624 is the latest as of checking, let's use the explicit standard legacy/build path
        // or try esm.sh which handles module resolution well.
        // The error suggests unpkg failed. Let's try cdnjs or a slightly different unpkg path.
        // Actually, for Vite apps, it's often best to copy the worker to public, but for now let's try a robust CDN.

        // Trying to use the exact version match from package.json
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
    }
};

// Helper to extract text from PDF
export async function extractPDFText(file: ArrayBuffer): Promise<string> {
    initWorker();
    const loadingTask = pdfjsLib.getDocument({ data: file });
    const pdf = await loadingTask.promise;

    let fullText = "";

    // Extract text from all pages
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const strings = content.items.map((item: any) => item.str);
        fullText += strings.join(" ") + "\n";
    }
    return fullText;
}

export async function parsePDF(
    file: ArrayBuffer,
    mapping?: ColumnMapping // Optional for PDF as we might use heuristics
): Promise<ParseResult> {
    // initWorker() called inside extractPDFText

    const errors: ParseError[] = [];
    const records: ParsedTimeRecord[] = [];
    let totalDataFound = 0;

    try {
        const fullText = await extractPDFText(file);


        // Check for "Relatório de Presença" specific format (One day, multiple employees)
        const isDailyReport = fullText.toLowerCase().includes("relatório de presença") || fullText.toLowerCase().includes("diário de presença");

        let dailyReportDate: string | null = null;
        if (isDailyReport) {
            const headerDateMatch = fullText.match(/Dia\s+(\d{2}\/\d{2}\/\d{4})/i);
            if (headerDateMatch) {
                const [day, month, year] = headerDateMatch[1].split('/');
                dailyReportDate = `${year}-${month}-${day}`;
            }
        }

        if (isDailyReport && dailyReportDate) {
            // Parsing strategy for Daily Report: Look for "Name .... Time(E)"
            // Image shows: "Name Name Name   08:29(E)   ..."

            // We need to match lines that start with a Name (text) and have timestamps.
            // Split by lines again
            const lines = fullText.split('\n');

            lines.forEach((line, index) => {
                // Skip header lines
                if (line.toLowerCase().includes("relatório") || line.toLowerCase().includes("emitido")) return;

                // Regex for: Name (letters spaces) ... Time(Type)
                // Example: "Amanda Ferreira da Silva 08:29(E)"
                // Or just times: "08:29 17:00"

                const timeMatches = [...line.matchAll(/(\d{2}:\d{2})/g)];
                if (timeMatches.length > 0) {
                    // Potential row.
                    // Extract Name: Everything before the first number?
                    const firstTimeIndex = line.search(/\d{2}:\d{2}/);
                    if (firstTimeIndex > 2) {
                        const namePart = line.substring(0, firstTimeIndex).trim();
                        // Clean up common table artifacts
                        // If namePart contains "Colaborador", it's the header row
                        if (namePart.toLowerCase().includes("colaborador") || namePart.toLowerCase().includes("marcações")) return;

                        // Validation: Name should have at least some letters
                        if (/[a-zA-Z]/.test(namePart)) {
                            const punches = timeMatches.map(m => m[1]);
                            records.push({
                                externalEmployeeId: namePart, // Use Name as ID for this report type
                                employeeName: namePart,
                                date: dailyReportDate!,
                                punches: punches,
                                rawData: { line }
                            });
                            totalDataFound++;
                        }
                    }
                }
            });

        } else {
            // Standard "Timecard" Parsing Strategy (One employee, multiple days)
            // Normalize text
            const lines = fullText.split('\n');
            let currentEmployeeId = "unknown";

            // Regex Patterns
            const datePattern = /(\d{2}\/\d{2}\/\d{4})/;
            const timePattern = /(\d{2}:\d{2})/g;
            const employeePattern = /(?:Funcionário|Colaborador|Nome):\s*(\d+)?\s*-?\s*([A-Za-z\s]+)/i;

            lines.forEach((line, index) => {
                const rowNumber = index + 1;

                // Try to find employee context
                const empMatch = line.match(employeePattern);
                if (empMatch) {
                    currentEmployeeId = empMatch[1] || empMatch[2] || currentEmployeeId; // Prefer ID, fallback to Name
                    // Optimization: could capture name too
                }

                // Find date
                const dateMatch = line.match(datePattern);
                if (dateMatch) {
                    const dateStr = dateMatch[1];
                    // Convert DD/MM/YYYY to YYYY-MM-DD
                    const [day, month, year] = dateStr.split('/');
                    const isoDate = `${year}-${month}-${day}`;

                    // Find all times in this line
                    const timeMatches = [...line.matchAll(timePattern)];
                    const punches = timeMatches.map(m => m[1]);

                    if (punches.length > 0) {
                        records.push({
                            externalEmployeeId: currentEmployeeId,
                            date: isoDate,
                            punches: punches,
                            rawData: { line }
                        });
                        totalDataFound++;
                    }
                }
            });
        }

        if (totalDataFound === 0) {
            return {
                success: false,
                records: [],
                errors: [{ row: 0, message: "Não foi possível identificar registros de ponto no PDF. Tente usar a opção 'Usar IA' se o formato for complexo." }],
                totalRows: 0,
            };
        }

        return {
            success: true,
            records,
            errors: [],
            totalRows: totalDataFound, // Cast types correctly if needed or keep loose
        };

    } catch (err) {
        console.error("PDF Parse Error:", err);
        return {
            success: false,
            records: [],
            errors: [{ row: 0, message: `Erro ao ler arquivo PDF: ${err}` }],
            totalRows: 0,
        };
    }
}
