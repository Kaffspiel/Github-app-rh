const https = require('https');

function testPdfImport() {
    const supabaseUrl = "https://nnmrlucwrzoqkwzytbbl.supabase.co";
    const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ubXJsdWN3cnpvcWt3enl0YmJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3MTA4MzIsImV4cCI6MjA4NTI4NjgzMn0.I4dLM5R-_qQe8xy1VYevXLd6BvkAcam5CYZ9jQvOxRA";

    console.log("--- TESTE AUTÔNOMO DE IMPORTAÇÃO PDF ---");

    const simulatedText = `
--- PÁGINA 1 ---
[L1]  Folha de Ponto
[L2]  Apuração: de 01/02/2026 a 05/03/2026
[L4]  DADOS DO EMPREGADOR
[L5]  Razão Social:   AUTOMOTRIZ INDÚSTRIA E COMÉRCIO DE PEÇAS
[L8]  DADOS DO TRABALHADOR
[L9]  Matrícula: 703497 | Nome: Rodolfo Da Costa Bayma Marinho
[L10] CPF: 000.000.000-00 | Admissão: 01/01/2020
[L17] | 02/02/2026 seg | | 08:29(E) | | 12:03(S) | | 13:00(E) | | 18:03(S) | | 08:30 | | 08:37 | - | 00:07 
[L18] | 03/02/2026 ter | | 08:25(E) | | 12:05(S) | | 13:02(E) | | 18:05(S) | | 08:30 | | 08:42 | - | 00:12
[L47] | 04/03/2026 qua | | 08:31(E) | | 12:01(S) | | 13:00(E) | | 18:01(S) | | 08:30 | | 08:31 | - | 00:01
[L100] Resumo do Período:
[L101] Horas Previstas: 220:00
[L102] Horas Trabalhadas: 180:01
[L103] Saldo: -39:59
  `;

    const payload = JSON.stringify({
        fileContent: simulatedText,
        fileName: "Relatório Folha de Ponto - Rodolfo Marinho (703497).pdf",
        fileType: "pdf"
    });

    const options = {
        hostname: 'nnmrlucwrzoqkwzytbbl.supabase.co',
        path: '/functions/v1/parse-time-document',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`,
            'apikey': supabaseKey,
            'Content-Length': Buffer.byteLength(payload)
        }
    };

    console.log("Chamando Edge Function 'parse-time-document'...");

    const req = https.request(options, (res) => {
        let rawData = '';
        res.on('data', (chunk) => { rawData += chunk; });
        res.on('end', () => {
            try {
                const result = JSON.parse(rawData);
                console.log("\n--- RESULTADO DA IA ---");
                console.log("Success:", result.success);
                console.log("Provider:", result.provider);
                console.log("Document Type:", result.documentType);
                console.log("Total Records (Daily):", result.records?.length || 0);

                if (result.records && result.records.length > 0) {
                    console.log("\nExemplo de Registro:");
                    console.log(JSON.stringify(result.records[0], null, 2));

                    const hasPunches = result.records.some(r => r.punches && r.punches.length > 0);
                    if (hasPunches) {
                        console.log("\n✅ TESTE BEM SUCEDIDO: Batidas diárias foram extraídas!");
                    } else {
                        console.log("\n❌ TESTE FALHOU: Registros criados mas sem horários (punches).");
                    }
                } else {
                    console.log("\n❌ TESTE FALHOU: Nenhum registro diário extraído.");
                    console.log("Accumulated Records:", result.accumulatedRecords?.length || 0);
                }
            } catch (e) {
                console.error("Erro ao processar JSON:", e.message);
                console.log("Raw Response:", rawData);
            }
        });
    });

    req.on('error', (e) => {
        console.error("Erro na requisição:", e.message);
    });

    req.write(payload);
    req.end();
}

testPdfImport();
