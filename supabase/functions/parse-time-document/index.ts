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
  documentType: 'daily' | 'accumulated';
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
    console.log("JSON appears truncated, attempting repair...");
    cleaned = cleaned.substring(jsonStart);
    // Try to repair truncated JSON
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
  
  // Remove trailing incomplete values (e.g., "value": "incompl...)
  // Find last complete record by looking for complete objects in records array
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
      
      if (escapeNext) {
        currentRecord += char;
        escapeNext = false;
        continue;
      }
      
      if (char === '\\' && inString) {
        currentRecord += char;
        escapeNext = true;
        continue;
      }
      
      if (char === '"' && !escapeNext) {
        inString = !inString;
      }
      
      if (!inString) {
        if (char === '{') {
          if (depth === 0) currentRecord = "";
          depth++;
        } else if (char === '}') {
          depth--;
          if (depth === 0) {
            currentRecord += char;
            completeRecords.push(currentRecord.trim());
            currentRecord = "";
            continue;
          }
        }
      }
      
      if (depth > 0) {
        currentRecord += char;
      }
    }
    
    // Rebuild with only complete records
    if (completeRecords.length > 0) {
      repaired = beforeRecords + completeRecords.join(",\n    ") + '\n  ],\n  "errors": []\n}';
      console.log(`Repaired JSON with ${completeRecords.length} complete records`);
    }
  }
  
  // Count open brackets and braces
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
  
  // Close any remaining open structures
  while (openBrackets > 0) { repaired += ']'; openBrackets--; }
  while (openBraces > 0) { repaired += '}'; openBraces--; }
  
  return repaired;
}

const systemPrompt = `Você é um especialista em análise de documentos de controle de ponto brasileiro.
Sua tarefa é extrair registros de ponto de documentos (Excel, CSV ou PDF) e retornar EXCLUSIVAMENTE um objeto JSON.

EXISTEM DOIS TIPOS DE DOCUMENTO:

### TIPO 1 - Registro Diário de Ponto (batidas individuais por dia)
Contém colunas como CPF, Nome, Dia, Entrada 1, Saída 1, etc.
Retorne com "documentType": "daily"

### TIPO 2 - Relatório Acumulado (resumo de horas por colaborador em um período)
Contém uma tabela com colunas: Colaborador, Previstas, Trabalhadas, Abonos, Saldo.
Pode conter cabeçalho com "Apuração: de DD/MM/YYYY a DD/MM/YYYY" e dados do empregador.
Retorne com "documentType": "accumulated"

IMPORTANTE - Regras de parsing:
1. O separador do CSV pode ser ";" (ponto-e-vírgula) ou "," (vírgula)
2. Horários podem ter sufixos como "(C)", "(I)", "(A)" que devem ser REMOVIDOS
3. A data pode ter o dia da semana junto. Ex: "26/01/2026 SEG" -> extrair apenas "2026-01-26"
4. Campos como "Folga", "Justificado INSS", "Falta não justificada", "Atestado" NÃO são horários
5. O CPF deve ser usado como externalEmployeeId quando disponível
6. Horas no formato "HHH:MM" (ex: "203:00") devem ser preservadas como string
7. Ignore linhas de TOTAL/rodapé

Para TIPO 1 (daily), retorne:
{
  "documentType": "daily",
  "records": [
    {
      "externalEmployeeId": "CPF (apenas números)",
      "employeeName": "nome completo",
      "date": "YYYY-MM-DD",
      "punches": ["HH:MM", ...]
    }
  ],
  "suggestedMapping": { ... },
  "errors": []
}

Para TIPO 2 (accumulated), retorne:
{
  "documentType": "accumulated",
  "periodStart": "YYYY-MM-DD",
  "periodEnd": "YYYY-MM-DD",
  "companyName": "razão social da empresa",
  "accumulatedRecords": [
    {
      "employeeName": "nome completo do colaborador",
      "predictedHours": "203:00",
      "workedHours": "184:31",
      "bonusHours": "13:29",
      "balance": "-04:56"
    }
  ],
  "records": [],
  "errors": []
}

Se não conseguir identificar registros válidos, retorne arrays vazios e descreva o problema em errors.`;

// Call Google Gemini API
async function callGoogleGemini(apiKey: string, fileContent: string, fileName: string): Promise<string> {
  const userPrompt = `Analise o arquivo "${fileName}" e extraia registros de ponto.
Este é um trecho do arquivo (limitado para processamento):

${fileContent.substring(0, 30000)}

IMPORTANTE:
- Identifique o separador do CSV (pode ser ; ou ,)
- Remova sufixos dos horários como "(C)", "(I)"
- Converta datas como "26/01/2026 SEG" para "2026-01-26"
- Use o CPF como externalEmployeeId
- Ignore entradas que não são horários (Folga, Justificado, etc.)

Retorne o JSON com todos os registros encontrados.`;

  console.log('Calling Google Gemini API...');
  
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: systemPrompt + "\n\n" + userPrompt }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 32000,
        responseMimeType: "application/json"
      }
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Google Gemini API error:', response.status, errorText);
    throw new Error(`Google Gemini API request failed: ${response.status} - ${errorText}`);
  }

  const geminiResponse = await response.json();
  const content = geminiResponse.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!content) {
    throw new Error('No response content from Google Gemini');
  }

  return content;
}

// Call OpenAI API
async function callOpenAI(apiKey: string, fileContent: string, fileName: string): Promise<string> {
  const userPrompt = `Analise o arquivo "${fileName}" e extraia registros de ponto.
Este é um trecho do arquivo (limitado para processamento):

${fileContent.substring(0, 25000)}

IMPORTANTE:
- Identifique o separador do CSV (pode ser ; ou ,)
- Remova sufixos dos horários como "(C)", "(I)"
- Converta datas como "26/01/2026 SEG" para "2026-01-26"
- Use o CPF como externalEmployeeId
- Ignore entradas que não são horários (Folga, Justificado, etc.)

Retorne o JSON com todos os registros encontrados.`;

  console.log('Calling OpenAI API...');
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
      max_tokens: 16000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('OpenAI API error:', errorText);
    throw new Error(`OpenAI API request failed: ${response.status}`);
  }

  const openaiResponse = await response.json();
  const content = openaiResponse.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('No response from OpenAI');
  }

  return content;
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    // @ts-ignore: Deno global not recognized in local IDE
    const GOOGLE_AI_API_KEY = Deno.env.get('GOOGLE_AI_API_KEY');
    // @ts-ignore: Deno global not recognized in local IDE
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    
    if (!GOOGLE_AI_API_KEY && !OPENAI_API_KEY) {
      throw new Error('No AI API keys configured (GOOGLE_AI_API_KEY or OPENAI_API_KEY)');
    }

    const { fileContent, fileType, fileName } = await req.json();

    if (!fileContent) {
      return new Response(
        JSON.stringify({ success: false, error: 'File content is required' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing ${fileType} file: ${fileName} (${fileContent.length} chars)`);

    let content: string;
    let provider: string;

    // Try Google Gemini first, fallback to OpenAI
    if (GOOGLE_AI_API_KEY) {
      try {
        content = await callGoogleGemini(GOOGLE_AI_API_KEY, fileContent, fileName);
        provider = 'Google Gemini';
        console.log('Successfully got response from Google Gemini');
      } catch (geminiError) {
        console.error('Google Gemini failed:', geminiError);
        
        if (OPENAI_API_KEY) {
          console.log('Falling back to OpenAI...');
          content = await callOpenAI(OPENAI_API_KEY, fileContent, fileName);
          provider = 'OpenAI (fallback)';
          console.log('Successfully got response from OpenAI (fallback)');
        } else {
          throw geminiError;
        }
      }
    } else if (OPENAI_API_KEY) {
      content = await callOpenAI(OPENAI_API_KEY, fileContent, fileName);
      provider = 'OpenAI';
      console.log('Successfully got response from OpenAI');
    } else {
      throw new Error('No AI provider available');
    }

    console.log('AI response received, parsing...');

    let parsedResult;
    try {
      parsedResult = extractJsonFromResponse(content);
    } catch (parseError) {
      const specificErrorMessage = parseError instanceof Error ? parseError.message : 'Unknown parse error';
      console.error('Failed to parse AI response as JSON:', specificErrorMessage);
      console.error('Original full content:', content.substring(0, 1000) + (content.length > 1000 ? '...' : ''));
      return new Response(
        JSON.stringify({
          success: false,
          error: `Failed to parse AI response as JSON: ${specificErrorMessage}`,
          aiContent: content,
          records: [],
          errors: [{ row: 0, message: `Failed to parse AI response: ${specificErrorMessage}` }],
          totalRows: 0,
          provider
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result: ParseResult = {
      success: true,
      documentType: parsedResult.documentType || 'daily',
      periodStart: parsedResult.periodStart,
      periodEnd: parsedResult.periodEnd,
      companyName: parsedResult.companyName,
      records: parsedResult.records || [],
      accumulatedRecords: parsedResult.accumulatedRecords || [],
      errors: parsedResult.errors || [],
      totalRows: (parsedResult.records?.length || 0) + (parsedResult.accumulatedRecords?.length || 0),
      suggestedMapping: parsedResult.suggestedMapping,
      provider
    };

    console.log(`Successfully parsed ${result.records.length} records using ${provider}`);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in parse-time-document:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        records: [],
        errors: [{ row: 0, message: errorMessage }],
        totalRows: 0
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
