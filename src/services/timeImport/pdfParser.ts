import * as pdfjsLib from 'pdfjs-dist';
import type { ParseResult, ParsedTimeRecord, ParseError, ColumnMapping } from "./types";

// Helper to init PDF worker
const initWorker = () => {
    if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
    }
};

// Helper to extract text from PDF
export async function extractPDFText(file: ArrayBuffer): Promise<string> {
    try {
        initWorker();
        const data = new Uint8Array(file);
        const loadingTask = pdfjsLib.getDocument({ data });
        const pdf = await loadingTask.promise;

        let fullText = "";

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();

            const items = content.items as any[];
            const lines: { [key: number]: any[] } = {};
            const TOLERANCE = 2;

            items.forEach(item => {
                const rawY = item.transform[5];
                let matchedY = Object.keys(lines).map(Number).find(y => Math.abs(y - rawY) <= TOLERANCE);

                if (matchedY === undefined) {
                    matchedY = Math.round(rawY);
                    lines[matchedY] = [];
                }
                lines[matchedY].push(item);
            });

            const sortedY = Object.keys(lines).map(Number).sort((a, b) => b - a);
            let lineCounter = 1;
            const pageText = sortedY.map(y => {
                const lineItems = lines[y].sort((a, b) => a.transform[4] - b.transform[4]);
                let lineStr = `[L${lineCounter++}] `;

                lineItems.forEach((item, index) => {
                    if (index > 0) {
                        // Opção Nuclear: Força divisores de coluna para qualquer fragmento de texto
                        lineStr += " | ";
                    }
                    lineStr += item.str;
                });
                return lineStr;
            }).join("\n");

            fullText += `\n--- PÁGINA ${i} ---\n${pageText}\n`;
        }
        return fullText;
    } catch (err) {
        console.error("Error extracting PDF text:", err);
        throw new Error(`Falha ao extrair texto do PDF: ${err instanceof Error ? err.message : String(err)}`);
    }
}

// Function to parse PDF (Legacy/Manual path)
export async function parsePDF(
    file: ArrayBuffer,
    mapping?: ColumnMapping
): Promise<ParseResult> {
    const records: ParsedTimeRecord[] = [];
    let totalDataFound = 0;

    try {
        const fullText = await extractPDFText(file);

        // Check for "Relatório de Presença" specific format
        const isDailyReport = fullText.toLowerCase().includes("relatório de presença") || fullText.toLowerCase().includes("diário de presença");

        let dailyReportDate: string | null = null;
        if (isDailyReport) {
            const headerDateMatch = fullText.match(/Dia\s+(\d{2}\/\d{2}\/\d{4})/i);
            if (headerDateMatch) {
                const [day, month, year] = headerDateMatch[1].split('/');
                dailyReportDate = `${year}-${month}-${day}`;
            }
        }

        const lines = fullText.split('\n');

        if (isDailyReport && dailyReportDate) {
            lines.forEach((line) => {
                if (line.toLowerCase().includes("relatório") || line.toLowerCase().includes("emitido")) return;

                const timeMatches = [...line.matchAll(/(\d{2}:\d{2})/g)];
                if (timeMatches.length > 0) {
                    const firstTimeIndex = line.search(/\d{2}:\d{2}/);
                    if (firstTimeIndex > 2) {
                        const namePart = line.substring(0, firstTimeIndex).replace(/\[L\d+\]\s*/, "").replace(/\|/g, "").trim();
                        if (namePart.toLowerCase().includes("colaborador") || namePart.toLowerCase().includes("marcações")) return;

                        if (/[a-zA-Z]/.test(namePart)) {
                            const punches = timeMatches.map(m => m[1]);
                            records.push({
                                externalEmployeeId: namePart,
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
            const datePattern = /(\d{2}\/\d{2}\/\d{4})/;
            const timePattern = /(\d{2}:\d{2})/g;
            const employeePattern = /(?:Nome|Empregado|Funcionário):\s*([^|\[\n]+)/i;

            let currentEmployeeId = "unknown";

            lines.forEach(line => {
                const empMatch = line.match(employeePattern);
                if (empMatch) {
                    currentEmployeeId = empMatch[1].replace(/\|/g, "").trim() || currentEmployeeId;
                }

                const dateMatch = line.match(datePattern);
                if (dateMatch) {
                    const dateStr = dateMatch[1];
                    const [day, month, year] = dateStr.split('/');
                    const isoDate = `${year}-${month}-${day}`;

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
            totalRows: totalDataFound,
        };

    } catch (err) {
        console.error("PDF Parse Error:", err);
        return {
            success: false,
            records: [],
            errors: [{ row: 0, message: `Erro ao ler arquivo PDF: ${err instanceof Error ? err.message : String(err)}` }],
            totalRows: 0,
        };
    }
}
