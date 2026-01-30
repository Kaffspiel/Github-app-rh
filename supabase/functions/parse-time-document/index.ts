import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const { fileContent, fileType, fileName } = await req.json();

    if (!fileContent) {
      return new Response(
        JSON.stringify({ success: false, error: 'File content is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing ${fileType} file: ${fileName}`);

    // Build prompt for AI to parse the document
    const systemPrompt = `Você é um especialista em análise de documentos de controle de ponto.
Sua tarefa é extrair registros de ponto de documentos (Excel, CSV ou PDF).

Regras de extração:
1. Identifique o ID ou matrícula do funcionário
2. Identifique o nome do funcionário (se disponível)
3. Identifique a data do registro (converter para formato YYYY-MM-DD)
4. Identifique as batidas/marcações de ponto (horários no formato HH:MM)
5. Cada linha representa um dia de trabalho de um funcionário

Responda APENAS com um JSON válido no seguinte formato:
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

    const userPrompt = `Analise o seguinte conteúdo de um arquivo de ponto (${fileType}) chamado "${fileName}" e extraia todos os registros de ponto:

${fileContent}

Retorne APENAS o JSON com os registros extraídos, sem explicações adicionais.`;

    console.log('Sending request to Lovable AI Gateway...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1,
        max_tokens: 8000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', errorText);
      throw new Error(`AI Gateway request failed: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No response from AI');
    }

    console.log('AI response received, parsing...');

    // Extract JSON from response (handle markdown code blocks)
    let jsonContent = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonContent = jsonMatch[1].trim();
    }

    let parsedResult;
    try {
      parsedResult = JSON.parse(jsonContent);
    } catch (parseError) {
      console.error('Failed to parse AI response:', jsonContent);
      throw new Error('Failed to parse AI response as JSON');
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
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
