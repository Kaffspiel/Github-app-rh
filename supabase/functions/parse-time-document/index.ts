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

interface ParseResult {
  success: boolean;
  records: TimeRecord[];
  errors: { row: number; message: string }[];
  totalRows: number;
  suggestedMapping?: {
    employeeIdColumn?: string;
    employeeNameColumn?: string;
    dateColumn?: string;
    punchColumns?: string[];
  };
}

// Robust JSON extraction from AI responses
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
  const jsonEnd = cleaned.lastIndexOf("}");

  if (jsonStart === -1 || jsonEnd === -1) {
    throw new Error("No JSON object found in response");
  }

  cleaned = cleaned.substring(jsonStart, jsonEnd + 1);

  // Step 5: Attempt parse with error handling
  try {
    return JSON.parse(cleaned);
  } catch {
    // Step 6: Try to fix common issues
    cleaned = cleaned
      .replace(/,\s*}/g, "}") // Remove trailing commas before }
      .replace(/,\s*]/g, "]") // Remove trailing commas before ]
      .replace(/[\x00-\x1F\x7F]/g, ""); // Remove control characters

    return JSON.parse(cleaned);
  }
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    // @ts-ignore: Deno global not recognized in local IDE
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    const { fileContent, fileType, fileName } = await req.json();

    if (!fileContent) {
      return new Response(
        JSON.stringify({ success: false, error: 'File content is required' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing ${fileType} file: ${fileName} (${fileContent.length} chars)`);

    // Build prompt for AI to parse the document
    const systemPrompt = `Você é um especialista em análise de documentos de controle de ponto.
Sua tarefa é extrair registros de ponto de documentos (Excel, CSV ou PDF) e retornar EXCLUSIVAMENTE um objeto JSON.

O retorno deve ser um JSON válido no seguinte formato:
{
  "records": [
    {
      "externalEmployeeId": "string - ID/matrícula do funcionário",
      "employeeName": "string - nome do funcionário (opcional)",
      "date": "string - data no formato YYYY-MM-DD",
      "punches": ["HH:MM", "HH:MM", ...] - array de horários de batida
    }
  ],
  "suggestedMapping": {
    "employeeIdColumn": "nome da coluna identificada como ID",
    "employeeNameColumn": "nome da coluna identificada como nome",
    "dateColumn": "nome da coluna identificada como data",
    "punchColumns": ["nomes das colunas de batidas"]
  },
  "errors": [
    {"row": 1, "message": "descrição do erro"}
  ]
}

Se não conseguir identificar registros válidos, retorne um array vazio em records e descreva o problema em errors.`;

    const userPrompt = `Analise o arquivo "${fileName}" e extraia todos os registros de ponto:

${fileContent.substring(0, 40000)}

Retorne APENAS o JSON.`;

    console.log('Sending request to OpenAI API...');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
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
        max_tokens: 4000,
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
      throw new Error('No response from AI');
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
          totalRows: 0
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result: ParseResult = {
      success: true,
      records: parsedResult.records || [],
      errors: parsedResult.errors || [],
      totalRows: parsedResult.records?.length || 0,
      suggestedMapping: parsedResult.suggestedMapping,
    };

    console.log(`Successfully parsed ${result.records.length} records`);

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
