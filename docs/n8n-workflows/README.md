# Workflows n8n para OpsControl + Evolution API

## 📋 Pré-requisitos

1. **n8n** instalado e rodando
2. **Evolution API** configurada com instância WhatsApp conectada
3. **OpsControl** com Cloud habilitado

---

## 🔧 Variáveis de Ambiente no n8n

Configure estas variáveis em **Settings > Variables**:

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `EVOLUTION_URL` | URL da sua Evolution API | `https://evolution.seudominio.com` |
| `EVOLUTION_KEY` | API Key da Evolution | `sua-api-key-aqui` |
| `OPSCONTROL_URL` | URL do projeto Lovable | `https://nnmrlucwrzoqkwzytbbl.supabase.co` |
| `OPSCONTROL_KEY` | Service Role Key do Supabase | `eyJhbG...` |

---

## 📦 Como Importar os Workflows

### Método 1: Importar JSON

1. No n8n, clique em **"..."** > **"Import from File"**
2. Selecione o arquivo JSON do workflow
3. Repita para cada workflow

### Método 2: Copiar e Colar

1. Abra o arquivo JSON
2. Copie todo o conteúdo
3. No n8n, use **Ctrl+V** para colar o workflow

---

## 🔄 Workflows Disponíveis

### 1. `01-send-whatsapp.json` - Enviar Mensagens

**Webhook URL:** `https://seu-n8n.com/webhook/opscontrol-send`

**Função:** Recebe payload do OpsControl e envia mensagem via Evolution API.

**Tipos de mensagem suportados:**
- `text` - Mensagem de texto simples
- `buttons` - Mensagem com botões interativos
- `image` - Imagem com legenda
- `document` - Documento com legenda

---

### 2. `02-status-webhook.json` - Status de Entrega

**Webhook URL:** `https://seu-n8n.com/webhook/opscontrol-status`

**Função:** Recebe atualizações de status do Evolution e atualiza OpsControl.

**Status rastreados:**
- `PENDING` → `pending`
- `SERVER_ACK` → `sent`
- `DELIVERY_ACK` → `delivered`
- `READ` → `read`

---

### 3. `03-receive-response.json` - Receber Respostas

**Webhook URL:** `https://seu-n8n.com/webhook/opscontrol-response`

**Função:** Processa respostas dos colaboradores e envia para OpsControl.

**Tipos de resposta:**
- Texto livre
- Clique em botão
- Seleção de lista

---

## ⚙️ Configurar Evolution API

No painel da Evolution API, configure os webhooks:

```json
{
  "url": "https://seu-n8n.com/webhook/opscontrol-status",
  "webhook_by_events": true,
  "events": [
    "MESSAGES_UPDATE"
  ]
}
```

```json
{
  "url": "https://seu-n8n.com/webhook/opscontrol-response", 
  "webhook_by_events": true,
  "events": [
    "MESSAGES_UPSERT"
  ]
}
```

---

## 🧪 Testando

### Testar envio de mensagem:

```bash
curl -X POST https://seu-n8n.com/webhook/opscontrol-send \
  -H "Content-Type: application/json" \
  -d '{
    "instanceName": "default",
    "number": "5511999999999",
    "messageType": "text",
    "text": {
      "message": "Teste de mensagem do OpsControl!"
    },
    "metadata": {
      "notificationId": "test-123",
      "notificationType": "announcement"
    }
  }'
```

---

## 🔐 Segurança

- Use HTTPS em todos os webhooks
- Configure autenticação no n8n (Basic Auth ou API Key)
- Mantenha as API keys seguras
- Limite IPs de acesso se possível

---

## 📞 Suporte

Em caso de dúvidas, verifique:
1. Logs do n8n (execuções dos workflows)
2. Logs da Evolution API
3. Edge Function logs no Lovable Cloud
