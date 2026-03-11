import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { csvSample, fileName } = await req.json();

    const GOOGLE_AI_API_KEY = Deno.env.get("GOOGLE_AI_API_KEY");
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

    if (!GOOGLE_AI_API_KEY && !OPENAI_API_KEY) {
      throw new Error("Nenhuma chave de API de IA configurada");
    }

    const systemPrompt = `Você é um especialista em análise de planilhas de controle de ponto (time tracking) brasileiras.
Dado um trecho de uma planilha convertida para CSV, identifique EXATAMENTE os nomes das colunas que correspondem a cada campo.

IMPORTANTE: Planilhas brasileiras de folha de ponto frequentemente têm:
- Linhas de metadados no topo (Nome do empregador, CNPJ, endereço, dados do trabalhador)
- Uma linha de cabeçalho real mais abaixo com as colunas de dados (com "Dia", "Marcações", etc.)
- A coluna "Marcações" pode abranger várias sub-colunas sem nome (Col3, Col4, Col5, etc.)
- O nome do funcionário pode estar em uma linha de metadado "Nome: XXXX" antes da tabela de dados
- Cada batida de ponto pode estar em sub-colunas vazias adjacentes à coluna "Marcações"

REGRA CRÍTICA para "employeeId":
- Se o nome do funcionário só aparece como metadado "Nome: Amanda Ferreira..." (e NÃO existe coluna "Nome" na tabela de dados), use o valor literal "Nome" como employeeId.
  O sistema vai extrair o nome automaticamente da linha de metadado "Nome: XXXX".
- Se existe uma coluna real "Nome" ou "Matrícula" na tabela de dados, use esse nome de coluna.
- NUNCA use o valor do dado (ex: "Nome: Amanda Ferreira da Silva") — use apenas o identificador do campo.

Para colunas sem nome no CSV (sub-colunas de "Marcações"), use "Col3", "Col4", "Col5" etc. (posição 1-indexada).

Retorne um JSON com esta estrutura:
{
  "employeeId": "Nome" (se nome só está em metadado) ou nome da coluna real,
  "employeeName": null (se nome só está em metadado) ou nome da coluna real,
  "date": "Dia" ou nome exato da coluna de data,
  "punch1": nome da 1ª coluna de batida ou null,
  "punch2": nome da 2ª coluna de batida ou null,
  "punch3": nome da 3ª coluna ou null,
  "punch4": nome da 4ª coluna ou null,
  "punch5": nome da 5ª coluna ou null,
  "punch6": nome da 6ª coluna ou null,
  "punch7": nome da 7ª coluna ou null,
  "punch8": nome da 8ª coluna ou null,
  "headerRow": número da linha 0-indexado do cabeçalho real da tabela,
  "confidence": "alta|média|baixa",
  "notes": "observações sobre o formato"
}

Retorne APENAS o JSON, sem markdown ou texto adicional.`;


    const userPrompt = `Arquivo: ${fileName}\n\nAmostra da planilha (CSV):\n${csvSample}`;

    let responseText: string;

    if (OPENAI_API_KEY) {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.1,
          max_tokens: 500,
        }),
      });
      const data = await response.json();
      responseText = data.choices?.[0]?.message?.content || "";
    } else {
      // Fallback to Google Gemini
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GOOGLE_AI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: systemPrompt + "\n\n" + userPrompt }] }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 500 },
          }),
        }
      );
      const data = await response.json();
      responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    }

    // Parse JSON from response
    let mapping;
    try {
      // Remove markdown code blocks if present
      const clean = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      mapping = JSON.parse(clean);
    } catch {
      throw new Error(`IA retornou resposta inválida: ${responseText.substring(0, 200)}`);
    }

    return new Response(
      JSON.stringify({ success: true, mapping }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("detect-column-mapping error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
