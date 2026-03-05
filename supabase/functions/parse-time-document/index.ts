import "https://deno.land/x/xhr@0.1.0/mod.ts";
// @ts-ignore: Deno types not available in local IDE
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TimeRecord {
  externalEmployeeId: string;
  employeeName?: string;
  date: string;
  punches: string[];
}

interface AccumulatedRecord {
  employeeName: string;
  predictedHours: string;
  workedHours: string;
  bonusHours: string;
  balance: string;
}

interface ParseResult {
  success: boolean;
  documentType: 'daily' | 'accumulated' | 'hybrid';
  periodStart?: string;
  periodEnd?: string;
  companyName?: string;
  records: TimeRecord[];
  accumulatedRecords?: AccumulatedRecord[];
  errors: { row: number; message: string }[];
  totalRows: number;
  suggestedMapping?: {
    employeeIdColumn?: string;
    employeeNameColumn?: string;
    dateColumn?: string;
    punchColumns?: string[];
  };
  provider?: string;
}

// Robust JSON extraction from AI responses - handles truncated responses
function extractJsonFromResponse(response: string): any {
  // Step 1: Try direct parse first
  try {
    return JSON.parse(response.trim());
  } catch {
    // Continue to other methods
  }

  // Step 2: Remove markdown code blocks
  let cleaned = response
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  // Step 3: Try parse after cleaning markdown
  try {
    return JSON.parse(cleaned);
  } catch {
    // Continue to extraction
  }

  // Step 4: Find JSON boundaries
  const jsonStart = cleaned.indexOf("{");
  let jsonEnd = cleaned.lastIndexOf("}");

  if (jsonStart === -1) {
    throw new Error("No JSON object found in response");
  }

  // If no closing brace, the JSON was truncated
  if (jsonEnd === -1 || jsonEnd < jsonStart) {
    cleaned = cleaned.substring(jsonStart);
    cleaned = repairTruncatedJson(cleaned);
  } else {
    cleaned = cleaned.substring(jsonStart, jsonEnd + 1);
  }

  // Step 5: Attempt parse with error handling
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    // Step 6: Try to fix common issues and repair truncation
    cleaned = cleaned
      .replace(/,\s*}/g, "}") // Remove trailing commas before }
      .replace(/,\s*]/g, "]") // Remove trailing commas before ]
      .replace(/[\x00-\x1F\x7F]/g, ""); // Remove control characters

    try {
      return JSON.parse(cleaned);
    } catch {
      // Final attempt: repair truncated JSON
      return JSON.parse(repairTruncatedJson(cleaned));
    }
  }
}

// Repair truncated JSON by closing open brackets/braces
function repairTruncatedJson(json: string): string {
  let repaired = json.trim();

  const recordsMatch = repaired.match(/"records"\s*:\s*\[/);
  if (recordsMatch) {
    const recordsStart = repaired.indexOf(recordsMatch[0]) + recordsMatch[0].length;
    const beforeRecords = repaired.substring(0, recordsStart);
    let recordsContent = repaired.substring(recordsStart);

    // Find all complete objects in the array
    const completeRecords: string[] = [];
    let depth = 0;
    let currentRecord = "";
    let inString = false;
    let escapeNext = false;

    for (let i = 0; i < recordsContent.length; i++) {
      const char = recordsContent[i];
      if (escapeNext) { currentRecord += char; escapeNext = false; continue; }
      if (char === '\\' && inString) { currentRecord += char; escapeNext = true; continue; }
      if (char === '"' && !escapeNext) { inString = !inString; }
      if (!inString) {
        if (char === '{') { if (depth === 0) currentRecord = ""; depth++; }
        else if (char === '}') {
          depth--;
          if (depth === 0) {
            currentRecord += char;
            completeRecords.push(currentRecord.trim());
            currentRecord = "";
            continue;
          }
        }
      }
      if (depth > 0) currentRecord += char;
    }
    if (completeRecords.length > 0) {
      repaired = beforeRecords + completeRecords.join(",\n    ") + '\n  ],\n  "errors": []\n}';
    }
  }

  let openBraces = 0;
  let openBrackets = 0;
  let inStr = false;
  let escape = false;

  for (const char of repaired) {
    if (escape) { escape = false; continue; }
    if (char === '\\') { escape = true; continue; }
    if (char === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (char === '{') openBraces++;
    if (char === '}') openBraces--;
    if (char === '[') openBrackets++;
    if (char === ']') openBrackets--;
  }

  while (openBrackets > 0) { repaired += ']'; openBrackets--; }
  while (openBraces > 0) { repaired += '}'; openBraces--; }

  return repaired;
}

const systemPrompt = `Você é um especialista em análise de documentos de controle de ponto (Brasil).
Sua tarefa é extrair TODOS os registros de ponto de um documento (PDF/Excel) e retornar um JSON formatado.

MUITO IMPORTANTE:
O documento pode conter múltiplas abas ou páginas. Elas podem estar delimitadas por "--- ABA: [Nome] ---" ou "--- PÁGINA X ---".
Analise o documento INTEIRO e extraia records para TODOS os colaboradores encontrados em QUALQUER parte do arquivo.
Não pare a extração antes de percorrer o arquivo completo.

REGRA DE OURO:
A extração das BATIDAS DIÁRIAS (records) é a prioridade absoluta. Se um colaborador aparece no resumo mas não tem registros diários extraídos, você falhou.
Cada objeto em "records" deve representar UM dia de UM colaborador com suas batidas exatas.

### SEÇÃO 1: Registros Diários (records)
Extraia cada batida de cada colaborador em cada dia.
Procure por tabelas com colunas: PIS/CPF/ID, Nome, Data/Dia, Horários.
- Converta datas para YYYY-MM-DD.
- No campo "punches", inclua todas as batidas (Ex: ["08:00", "12:05", "13:00", "18:10"]).

### SEÇÃO 2: Resumo Mensal/Acumulado (accumulatedRecords)
Extraia tabelas de totais (Colaborador, Horas Previstas, Trabalhadas, Saldo).

Regras:
- DocumentType: "hybrid" se ambos, "daily" se apenas diário, "accumulated" se apenas resumo.
- Remova marcações como "(E)", "(S)", "(C)", "(A)", "*" dos horários (ex: "08:00(E)" vira "08:00").
- Horas devem ser sempre no formato HH:mm.

Retorne obrigatoriamente neste formato JSON:
{
  "documentType": "daily" | "accumulated" | "hybrid",
  "records": [
    {
      "externalEmployeeId": "ID/PIS/CPF",
      "employeeName": "Nome",
      "date": "YYYY-MM-DD",
      "punches": ["08:00", "12:00", "13:00", "18:00"]
    }
  ],
  "accumulatedRecords": [
    {
      "employeeName": "Nome",
      "predictedHours": "HH:mm",
      "workedHours": "HH:mm",
      "balance": "HH:mm"
    }
  ],
  "errors": []
}`;

async function callGoogleGemini(apiKey: string, fileContent: string, fileName: string): Promise<string> {
  const userPrompt = `Analise o arquivo "${fileName}" e extraia registros de ponto individuais E o resumo acumulado.
${fileContent.substring(0, 100000)}`;

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: systemPrompt + "\n\n" + userPrompt }] }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 32000, responseMimeType: "application/json" }
    }),
  });

  if (!response.ok) throw new Error(`Google Gemini error: ${response.status}`);
  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text;
}

async function callOpenAI(apiKey: string, fileContent: string, fileName: string): Promise<string> {
  const userPrompt = `Analise o arquivo "${fileName}" e extraia registros de ponto individuais E o resumo acumulado.
${fileContent.substring(0, 100000)}`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
      response_format: { type: "json_object" },
      temperature: 0.1,
    }),
  });

  if (!response.ok) throw new Error(`OpenAI error: ${response.status}`);
  const data = await response.json();
  return data.choices?.[0]?.message?.content;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders, status: 204 });

  try {
    // @ts-ignore: Deno is a global in Supabase Edge Functions
    const GOOGLE_AI_API_KEY = Deno.env.get('GOOGLE_AI_API_KEY');
    // @ts-ignore: Deno is a global in Supabase Edge Functions
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    const { fileContent, fileName } = await req.json();

    let content;
    let provider;

    if (GOOGLE_AI_API_KEY) {
      content = await callGoogleGemini(GOOGLE_AI_API_KEY, fileContent, fileName);
      provider = 'Google Gemini';
    } else if (OPENAI_API_KEY) {
      content = await callOpenAI(OPENAI_API_KEY, fileContent, fileName);
      provider = 'OpenAI';
    } else throw new Error('No AI provider available');

    const parsedResult = extractJsonFromResponse(content);

    let docType = parsedResult.documentType || 'daily';
    if (parsedResult.records?.length > 0 && parsedResult.accumulatedRecords?.length > 0) docType = 'hybrid';
    else if (parsedResult.accumulatedRecords?.length > 0) docType = 'accumulated';

    const result = {
      success: true,
      documentType: docType,
      records: parsedResult.records || [],
      accumulatedRecords: parsedResult.accumulatedRecords || [],
      errors: parsedResult.errors || [],
      totalRows: (parsedResult.records?.length || 0) + (parsedResult.accumulatedRecords?.length || 0),
      provider
    };

    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
