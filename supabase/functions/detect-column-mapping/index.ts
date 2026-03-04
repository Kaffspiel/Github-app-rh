import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { csvSample, fileName } = await req.json();

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    const GOOGLE_AI_API_KEY = Deno.env.get("GOOGLE_AI_API_KEY");

    if (!OPENAI_API_KEY && !GOOGLE_AI_API_KEY) {
      throw new Error("Nenhuma chave de API de IA configurada");
    }

    const systemPrompt = `Você é um especialista em análise de planilhas de controle de ponto (time tracking) brasileiras.
Dado um trecho de uma planilha convertida para CSV, identifique EXATAMENTE os nomes das colunas que correspondem a cada campo.

Retorne um JSON com esta estrutura:
{
  "employeeId": "nome exato da coluna que representa ID ou matrícula do funcionário (pode ser nome se não houver ID)",
  "employeeName": "nome exato da coluna do nome do funcionário (ou null se não existir separado)",
  "date": "nome exato da coluna da data",
  "punch1": "nome exato da coluna da 1ª batida/marcação de ponto (ou null)",
  "punch2": "nome exato da coluna da 2ª batida (ou null)",
  "punch3": "nome exato da coluna da 3ª batida (ou null)",
  "punch4": "nome exato da coluna da 4ª batida (ou null)",
  "punch5": "nome exato da coluna da 5ª batida (ou null)",
  "punch6": "nome exato da coluna da 6ª batida (ou null)",
  "punch7": "nome exato da coluna da 7ª batida (ou null)",
  "punch8": "nome exato da coluna da 8ª batida (ou null)",
  "confidence": "alta|média|baixa",
  "notes": "observações sobre o formato detectado"
}

Regras importantes:
- "employeeId" é OBRIGATÓRIO. Se não houver coluna de ID/matrícula, use a coluna de nome.
- "date" é OBRIGATÓRIO.
- As batidas são as colunas de horários (entrada 1, saída 1, entrada 2, saída 2, etc.)
- Se uma coluna não existir, retorne null para ela.
- Use os nomes EXATOS das colunas como aparecem no cabeçalho da planilha.
- Planilhas brasileiras costumam ter: Nome, Matrícula, Data, Dia, Entrada, Saída, 1ª Entrada, 1ª Saída, etc.
- Retorne APENAS o JSON, sem markdown ou texto adicional.`;

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
