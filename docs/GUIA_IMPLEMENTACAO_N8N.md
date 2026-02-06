# 🚀 Guia de Implementação: Migração Edge Functions -> n8n

Este guia detalha o processo para substituir Supabase Edge Functions por webhooks do n8n no OpsControl.

---

## 🏗️ Passo 1: Configuração no n8n

Para cada função que deseja migrar, você deve criar um workflow no n8n:

1. **Webhook Trigger**:
   - Método: `POST`.
   - Path: `opscontrol-[nome-da-funcao]`.
   - Response Mode: `On Last Node` ou `Response to Webhook`.

2. **Lógica de Negócio**:
   - Utilize nodes de `HTTP Request` para interagir com a API REST do Supabase (veja o [API_REST_N8N.md](file:///c:/Users/Guto/Downloads/github-launchpad-aae23213/github-launchpad-aae23213/docs/API_REST_N8N.md)).
   - Utilize nodes de `Code` se precisar de transformações complexas.

3. **Resposta de Sucesso/Erro**:
   - Sempre retorne um JSON no formato:
     ```json
     {
       "success": true,
       "data": { ... }
     }
     ```
   - Em caso de erro, retorne um status HTTP diferente de 2xx (ex: 400 ou 500) com:
     ```json
     {
       "success": false,
       "error": "Mensagem descritiva do erro"
     }
     ```

---

## 💻 Passo 2: Alteração no Frontend (React)

No componente React, substitua a chamada do Supabase pelo `fetch` padrão.

### Exemplo de Substituição

**Antes (Edge Function):**
```typescript
const { data, error } = await supabase.functions.invoke("minha-funcao", {
  body: { id: 123 },
});
```

**Depois (n8n Webhook):**
```typescript
const n8nWebhookUrl = "https://n8n.kaffspiel.cloud/webhook/opscontrol-minha-funcao";

const response = await fetch(n8nWebhookUrl, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ id: 123 }),
});

if (!response.ok) {
  const errorText = await response.text();
  throw new Error(errorText || "Erro no n8n");
}

const data = await response.json();
```

---

## 🧪 Passo 3: Verificação

1. **Teste de Payload**: Use o arquivo [TEST_PAYLOADS.md](file:///c:/Users/Guto/Downloads/github-launchpad-aae23213/github-launchpad-aae23213/docs/n8n-workflows/TEST_PAYLOADS.md) para testar os endpoints via Postman ou Insomnia.
2. **Logs**: Verifique os logs na aba "Executions" do n8n para debugar o recebimento dos dados.
3. **Feedback UI**: Certifique-se de que o `toast` do frontend está exibindo a mensagem de erro correta que vem do n8n.

---

## 📌 Checklists de Migração

- [ ] Criar workflow no n8n.
- [ ] Configurar credenciais do Supabase no n8n (Service Role).
- [ ] Testar webhook isoladamente.
- [ ] Atualizar chamada no frontend.
- [ ] Adicionar tratamento de erro (`try/catch`).
- [ ] Adicionar log de erro no console para debug.
