import "https://deno.land/x/xhr@0.1.0/mod.ts";
// @ts-ignore: Deno types not available in local IDE
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Origin': '*',
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
  try {
    return JSON.parse(response.trim());
  } catch {
    // Continue
  }

  let cleaned = response
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    // Continue
  }

  const jsonStart = cleaned.indexOf("{");
  let jsonEnd = cleaned.lastIndexOf("}");

  if (jsonStart === -1) {
    throw new Error("No JSON object found in response");
  }

  if (jsonEnd === -1 || jsonEnd < jsonStart) {
    cleaned = cleaned.substring(jsonStart);
    cleaned = repairTruncatedJson(cleaned);
  } else {
    cleaned = cleaned.substring(jsonStart, jsonEnd + 1);
  }

  try {
    return JSON.parse(cleaned);
  } catch (e) {
    cleaned = cleaned
      .replace(/,\s*}/g, "}")
      .replace(/,\s*]/g, "]")
      .replace(/[\x00-\x1F\x7F]/g, "");

    try {
      return JSON.parse(cleaned);
    } catch {
      return JSON.parse(repairTruncatedJson(cleaned));
    }
  }
}

function repairTruncatedJson(json: string): string {
  let repaired = json.trim();
  const recordsMatch = repaired.match(/"records"\s*:\s*\[/);
  if (recordsMatch) {
    const recordsStart = repaired.indexOf(recordsMatch[0]) + recordsMatch[0].length;
    const beforeRecords = repaired.substring(0, recordsStart);
    let recordsContent = repaired.substring(recordsStart);
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

const systemPrompt = `Você é um robô de extração de RH de alta precisão. Sua missão é converter uma Folha de Ponto (PDF/Texto) para JSON estruturado em português.

### 📜 REGRA DE OURO (VITAL):
Este documento **É OBRIGATORIAMENTE** do tipo "daily" se contiver horários com marcadores (E) ou (S) — independentemente do formato (tabela Markdown, texto com [L], ou texto corrido).
A extração dos registros individuais para o array "records" é sua PRIORIDADE MÁXIMA.

### 🔎 COMO IDENTIFICAR O FORMATO:

**FORMATO 1 — Tabela Markdown (gerado por PDF parser):**
Exemplo:
| 02/02/2026 seg | 08:29(E) 12:03(S) 13:00(E) 18:03(S) | 08:30 | 08:37 | - | 00:07 |

**FORMATO 2 — Texto com marcadores [L] (gerado por pdfjs):**
Exemplo:
[L17] | 02/02/2026 seg | | 08:29(E) | | 12:03(S) | | 13:00(E) | | 18:03(S) | | 08:30 | | 08:37

### 🔎 COMO EXTRAIR AS BATIDAS REAIS (punches):
Em AMBOS os formatos, extraia APENAS os horários que possuem o marcador (E) ou (S) imediatamente após.
- PUNCHES VÁLIDOS: "08:29(E)", "12:03(S)", "13:00(E)", "18:03(S)" → extrair como ["08:29", "12:03", "13:00", "18:03"]
- IGNORE: horários sem (E) ou (S) como "08:30", "08:37" (são colunas de Previstas/Trabalhadas)

### 🎯 MISSÃO:
1. Leia o cabeçalho do documento para extrair o Nome e CPF/ID do trabalhador.
2. Para cada linha/row com data (DD/MM/YYYY), crie um objeto em "records".
3. Se a linha for Falta, Feriado, "-" ou domingo sem batidas, use punches: [].
4. O array "records" NÃO PODE SER VAZIO se houver batidas reais com (E)/(S) no texto.
5. Se não encontrar CPF/ID, use o número entre parênteses do nome do arquivo (ex: "703497") ou "N/A".

### 📦 FORMATO JSON:
{
  "documentType": "daily",
  "records": [
    {
      "externalEmployeeId": "CPF só números ou matrícula ou 'N/A'",
      "employeeName": "Nome Completo",
      "date": "YYYY-MM-DD",
      "punches": ["08:29", "12:03", "13:00", "18:03"]
    }
  ],
  "accumulatedRecords": [],
  "errors": []
}`;

async function callGoogleGemini(apiKey: string, fileContent: string, fileName: string): Promise<string> {
  const userPrompt = `Analise o arquivo "${fileName}" e extraia registros de ponto individuais.
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
  const userPrompt = `Analise o arquivo "${fileName}" e extraia registros de ponto individuais.
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
    // @ts-ignore
    const GOOGLE_AI_API_KEY = Deno.env.get('GOOGLE_AI_API_KEY');
    // @ts-ignore
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    const { fileContent, fileName } = await req.json();

    let content;
    let provider;

    try {
      if (GOOGLE_AI_API_KEY) {
        content = await callGoogleGemini(GOOGLE_AI_API_KEY, fileContent, fileName);
        provider = 'Google Gemini';
      } else if (OPENAI_API_KEY) {
        content = await callOpenAI(OPENAI_API_KEY, fileContent, fileName);
        provider = 'OpenAI';
      } else throw new Error('No AI provider available');
    } catch (e) {
      if (OPENAI_API_KEY && GOOGLE_AI_API_KEY) {
        content = await callOpenAI(OPENAI_API_KEY, fileContent, fileName);
        provider = 'OpenAI (fallback)';
      } else {
        throw e;
      }
    }

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
