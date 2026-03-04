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

IMPORTANTE: Planilhas brasileiras de folha de ponto frequentemente têm:
- Linhas de metadados no topo (Nome do empregador, CNPJ, endereço, dados do trabalhador)
- Uma linha de cabeçalho real mais abaixo com as colunas de dados
- A coluna "Marcações" pode ser um cabeçalho que abrange várias sub-colunas sem nome (Col3, Col4, Col5, etc.)
- O nome do funcionário pode estar em uma linha de metadado "Nome: XXXX" antes da tabela de dados
- Cada batida de ponto pode estar em uma sub-coluna vazia adjacente à coluna "Marcações"

Ao analisar, procure PRIMEIRO a linha de cabeçalho real da tabela de dados (que contém "Dia", "Marcações", "Previstas", etc.)
Depois, para as colunas de batidas, se "Marcações" abrange múltiplas colunas, liste as sub-colunas como Col3, Col4, Col5 para punch1, punch2, punch3.

Se o nome do funcionário só aparece em linha de metadado (Ex: "Nome: Amanda...") e NÃO como coluna de dados, 
então use a coluna de data ou algum campo identificador disponível na tabela para "employeeId".

Retorne um JSON com esta estrutura:
{
  "employeeId": "nome exato da coluna que representa ID ou matrícula do funcionário (pode ser o campo de Nome da tabela, ou 'Nome' do metadado)",
  "employeeName": "nome exato da coluna do nome do funcionário (ou null se só existir como metadado)",
  "date": "nome exato da coluna da data (geralmente 'Dia' ou 'Data')",
  "punch1": "nome exato da 1ª coluna de batida/marcação (ou null)",
  "punch2": "nome exato da 2ª coluna de batida (ou null) — pode ser Col3, Col4 etc se sub-colunas sem nome",
  "punch3": "nome exato da 3ª coluna de batida (ou null)",
  "punch4": "nome exato da 4ª coluna de batida (ou null)",
  "punch5": "nome exato da 5ª coluna (ou null)",
  "punch6": "nome exato da 6ª coluna (ou null)",
  "punch7": "nome exato da 7ª coluna (ou null)",
  "punch8": "nome exato da 8ª coluna (ou null)",
  "headerRow": número da linha (0-indexado) onde está o cabeçalho real da tabela de dados,
  "confidence": "alta|média|baixa",
  "notes": "observações sobre o formato detectado"
}

Regras importantes:
- "date" é OBRIGATÓRIO. Use "Dia" ou "Data" ou o nome exato da coluna de data.
- "employeeId" é OBRIGATÓRIO.
- Use os nomes EXATOS como aparecem no cabeçalho da tabela.
- Para sub-colunas sem nome depois de "Marcações", use "Col3", "Col4" etc (número baseado na posição da coluna, 1-indexado).
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
