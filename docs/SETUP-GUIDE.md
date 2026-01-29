# 🚀 Guia de Configuração: Sistema de Notificações WhatsApp

Este guia detalha como configurar o sistema de notificações do OpsControl com Evolution API e n8n.

---

## 📋 Pré-requisitos

Antes de começar, você precisa ter:

- [ ] **Evolution API** instalada e funcionando
- [ ] **n8n** instalado (self-hosted ou cloud)
- [ ] **Instância WhatsApp** conectada na Evolution API
- [ ] Acesso ao **Lovable Cloud** (este projeto)

---

## 🔧 Passo 1: Configurar Evolution API

### 1.1 Criar Instância WhatsApp

```bash
curl -X POST "https://sua-evolution-api.com/instance/create" \
  -H "apikey: SUA_EVOLUTION_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "instanceName": "opscontrol",
    "qrcode": true
  }'
```

### 1.2 Conectar WhatsApp

1. Acesse o painel da Evolution API
2. Escaneie o QR Code com seu WhatsApp Business
3. Aguarde a conexão ser estabelecida

### 1.3 Configurar Webhooks na Evolution

Configure os webhooks para enviar eventos para o n8n:

```bash
curl -X PUT "https://sua-evolution-api.com/webhook/set/opscontrol" \
  -H "apikey: SUA_EVOLUTION_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://seu-n8n.com/webhook/evolution-events",
    "webhook_by_events": true,
    "events": [
      "MESSAGES_UPDATE",
      "MESSAGES_UPSERT"
    ]
  }'
```

---

## 🔄 Passo 2: Configurar n8n

### 2.1 Criar Variáveis de Ambiente

No n8n, vá em **Settings > Variables** e adicione:

| Variável | Valor | Descrição |
|----------|-------|-----------|
| `EVOLUTION_URL` | `https://sua-evolution-api.com` | URL da Evolution API |
| `EVOLUTION_KEY` | `sua-api-key` | API Key da Evolution |
| `OPSCONTROL_URL` | `https://nnmrlucwrzoqkwzytbbl.supabase.co` | URL do Supabase |
| `OPSCONTROL_KEY` | `sua-service-role-key` | Service Role Key |

> ⚠️ **Importante**: Use a Service Role Key do Supabase, não a Anon Key!

### 2.2 Importar Workflows

1. No n8n, clique em **"..." → "Import from File"**
2. Importe os arquivos da pasta `docs/n8n-workflows/`:
   - `01-send-whatsapp.json` - Envio de mensagens
   - `02-status-webhook.json` - Rastreio de entrega
   - `03-receive-response.json` - Recebimento de respostas

### 2.3 Ativar Workflows

Para cada workflow importado:
1. Abra o workflow
2. Clique em **"Inactive"** para mudar para **"Active"**
3. Copie a URL do webhook (será algo como `https://seu-n8n.com/webhook/xxx`)

### 2.4 URLs dos Webhooks

Após ativar, anote as URLs:

| Workflow | URL | Finalidade |
|----------|-----|------------|
| 01-send-whatsapp | `https://n8n.../webhook/opscontrol-send` | OpsControl → n8n |
| 02-status-webhook | `https://n8n.../webhook/opscontrol-status` | Evolution → n8n |
| 03-receive-response | `https://n8n.../webhook/opscontrol-response` | Evolution → n8n |

---

## 📱 Passo 3: Configurar OpsControl

### 3.1 Testar Edge Function

Teste a edge function de envio diretamente:

```bash
curl -X POST "https://nnmrlucwrzoqkwzytbbl.supabase.co/functions/v1/send-notification" \
  -H "Authorization: Bearer SUA_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "recipientId": "ID_DO_COLABORADOR",
    "type": "announcement",
    "title": "Teste",
    "message": "Mensagem de teste do OpsControl!",
    "n8nWebhookUrl": "https://seu-n8n.com/webhook/opscontrol-send",
    "evolutionInstance": "opscontrol"
  }'
```

### 3.2 Cadastrar Colaborador com WhatsApp

No banco de dados, certifique-se que o colaborador tem:

```sql
UPDATE employees SET
  whatsapp_number = '5511999999999',  -- Número com DDI+DDD
  whatsapp_verified = true,
  notify_whatsapp = true
WHERE id = 'ID_DO_COLABORADOR';
```

---

## 🔌 Passo 4: Conectar Fluxos

### 4.1 Diagrama do Fluxo Completo

```
┌─────────────┐     ┌─────────┐     ┌──────────────┐     ┌──────────────┐
│  OpsControl │────▶│   n8n   │────▶│ Evolution API│────▶│   WhatsApp   │
│  (Lovable)  │     │         │     │              │     │              │
└─────────────┘     └─────────┘     └──────────────┘     └──────────────┘
       ▲                 │                  │                    │
       │                 │                  │                    │
       └─────────────────┴──────────────────┴────────────────────┘
                    Status + Respostas (webhooks)
```

### 4.2 Configurar Webhooks da Evolution → n8n

Na Evolution API, configure para enviar eventos para os webhooks do n8n:

**Para Status de Entrega:**
```json
{
  "url": "https://seu-n8n.com/webhook/opscontrol-status",
  "events": ["MESSAGES_UPDATE"]
}
```

**Para Respostas:**
```json
{
  "url": "https://seu-n8n.com/webhook/opscontrol-response",
  "events": ["MESSAGES_UPSERT"]
}
```

---

## ✅ Passo 5: Validar Integração

### 5.1 Teste de Envio

1. Acesse o OpsControl
2. Vá em **Notificações** ou **Comunicados**
3. Envie uma mensagem para um colaborador com WhatsApp verificado
4. Verifique se a mensagem chegou no WhatsApp

### 5.2 Verificar Logs

**n8n**: Veja as execuções em **Executions**

**Edge Functions**: No Lovable Cloud, acesse os logs das funções:
- `send-notification`
- `webhook-status`
- `webhook-response`

### 5.3 Verificar Banco de Dados

Consulte as tabelas para verificar o fluxo:

```sql
-- Ver notificações enviadas
SELECT id, type, title, status, whatsapp_status, created_at 
FROM notifications 
ORDER BY created_at DESC 
LIMIT 10;

-- Ver fila de processamento
SELECT * FROM notification_queue 
WHERE status != 'completed' 
ORDER BY created_at DESC;

-- Ver respostas recebidas
SELECT * FROM whatsapp_responses 
ORDER BY created_at DESC 
LIMIT 10;
```

---

## 🔐 Passo 6: Segurança

### 6.1 Checklist de Segurança

- [ ] Evolution API usando HTTPS
- [ ] n8n usando HTTPS
- [ ] API Keys armazenadas de forma segura
- [ ] Webhooks autenticados (se possível)
- [ ] Rate limiting configurado

### 6.2 Variáveis Sensíveis

Nunca exponha no código:
- `EVOLUTION_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- Tokens de autenticação

---

## 🆘 Troubleshooting

### Mensagem não enviada

1. Verifique se o colaborador tem `whatsapp_verified = true`
2. Confira se `notify_whatsapp = true`
3. Verifique horário silencioso (`quiet_hours_start/end`)
4. Cheque os logs do n8n

### Status não atualiza

1. Confirme webhook da Evolution está correto
2. Verifique se o n8n está ativo
3. Confira logs da edge function `webhook-status`

### Resposta não processada

1. Verifique webhook de `MESSAGES_UPSERT`
2. Confira se o número está cadastrado em `employees`
3. Cheque a tabela `whatsapp_responses`

---

## 📚 Recursos Adicionais

- [Documentação Evolution API](https://doc.evolution-api.com/)
- [Documentação n8n](https://docs.n8n.io/)
- [Workflows prontos](./n8n-workflows/)

---

## 📞 Suporte

Em caso de problemas:
1. Verifique os logs de cada componente
2. Consulte a documentação específica
3. Teste cada etapa isoladamente
