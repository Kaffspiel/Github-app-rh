# 📱 Documentação da Integração WhatsApp (Evolution API + n8n)

## Visão Geral da Arquitetura

```
┌─────────────┐     ┌─────────┐     ┌──────────────────┐     ┌──────────────┐
│  OpsControl  │────→│   n8n   │────→│  Evolution API   │────→│   WhatsApp   │
│  (Frontend)  │     │         │     │                  │     │              │
└─────────────┘     │         │←────│  (Webhooks)      │←────│  (Respostas) │
                    │         │     └──────────────────┘     └──────────────┘
                    │         │
                    │         │────→ Edge Functions (webhook-response, webhook-status)
                    └─────────┘
```

---

## Componentes

### 1. Evolution API
- **Instância:** `teste`
- **Função:** Proxy para API do WhatsApp
- **Secrets:** `EVOLUTION_URL`, `EVOLUTION_KEY`

### 2. n8n (Automação)
Workflows configurados para intermediar comunicação:

| Workflow | ID | Função |
|----------|-----|--------|
| Envio Texto Simplificado | `96zLQOZ313uOhOk-eeyVX` | Envia mensagens de texto |
| 02-status-webhook | `2k9sx-oK7sBOPvyPFt7Zf` | Recebe status de entrega |
| Receber Respostas | `9NZcFQVaS-bDj020PisoP` | Processa respostas |
| Workflow Inteligente | `1PHXvvLJ56lNaNAixK-RO` | Criação de tarefas via IA |
| Resposta Audio | (documentado em JSON) | Transcrição de áudio |

### 3. Edge Functions
- `send-whatsapp` → Envia mensagens diretas
- `send-notification` → Envia com registro no banco
- `check-overdue-tasks` → Alertas de tarefas atrasadas
- `webhook-status` → Atualiza status de entrega
- `webhook-response` → Processa respostas + criação de tarefas via IA

---

## Fluxos de Comunicação

### Fluxo 1: Envio de Notificação (OpsControl → WhatsApp)

```
1. Frontend chama send-notification (ou send-whatsapp)
2. Edge Function verifica:
   - Employee tem WhatsApp verificado?
   - Notificações habilitadas?
   - Dentro do horário de trabalho?
   - Fora do quiet hours?
3. Registra notificação no banco (status: pending)
4. Envia via Evolution API
5. Atualiza status para "sent"
```

### Fluxo 2: Status de Entrega (WhatsApp → OpsControl)

```
1. WhatsApp envia status para Evolution API
2. Evolution API dispara webhook para n8n
3. n8n encaminha para Edge Function webhook-status
4. Edge Function atualiza notification:
   - delivered → whatsapp_delivered_at
   - read → whatsapp_read_at
```

### Fluxo 3: Resposta do Colaborador (WhatsApp → OpsControl)

```
1. Colaborador responde mensagem no WhatsApp
2. Evolution API recebe via MESSAGES_UPSERT
3. n8n processa e encaminha para webhook-response
4. Edge Function:
   a. Identifica employee pelo telefone
   b. Salva em whatsapp_responses
   c. Se botão: atualiza notification
   d. Se texto de gestor: cria tarefa via IA
```

### Fluxo 4: Criação de Tarefa via WhatsApp (Gestor)

```
1. Gestor envia mensagem de texto/áudio via WhatsApp
2. Evolution API → n8n (Workflow Inteligente)
3. Se áudio: n8n transcreve via Whisper (OpenAI)
4. n8n encaminha para webhook-response
5. Edge Function:
   a. Verifica se remetente é admin/gestor
   b. Usa GPT-4o-mini para extrair:
      - Título da tarefa
      - Nome do responsável
      - Prazo (data + horário, padrão 18:00)
      - Prioridade
   c. Busca employee pelo nome
   d. Cria tarefa no banco
   e. Envia confirmação ao gestor via WhatsApp
   f. Notifica colaborador responsável
```

---

## Controle de Horário

Todas as funções de envio respeitam o horário de trabalho:

```
Início: work_schedule_start (padrão: 09:00)
Duração: 9 horas
Fuso: UTC-3 (Brasil)
Exemplo: 09:00 → 18:00
```

Mensagens fora do horário são **bloqueadas** com `{ blocked: true }`.

---

## Configuração da Evolution API

### Webhooks a Configurar

```json
// Status de entrega
{
  "url": "https://seu-n8n.com/webhook/opscontrol-status",
  "webhook_by_events": true,
  "events": ["MESSAGES_UPDATE"]
}

// Respostas recebidas
{
  "url": "https://seu-n8n.com/webhook/opscontrol-response",
  "webhook_by_events": true,
  "events": ["MESSAGES_UPSERT"]
}
```

---

## Agendamentos (Supabase Cron)

O sistema utiliza `pg_cron` para automações periódicas:

| Job | Intervalo | Função |
|-----|-----------|--------|
| `check-overdue-tasks-job` | 10 minutos | Verifica e notifica tarefas atrasadas |
| `task-progress-summary-job` | 4 horas | Envia resumo de progresso aos gestores |

---

## Tabelas Envolvidas

| Tabela | Uso |
|--------|-----|
| `notifications` | Registro de todas as notificações enviadas |
| `notification_queue` | Fila de processamento com retry |
| `whatsapp_responses` | Respostas recebidas dos colaboradores |
| `employees` | Dados de telefone e preferências |
| `tasks` | Tarefas criadas via WhatsApp |

---

## Variáveis de Ambiente no n8n

| Variável | Descrição |
|----------|-----------|
| `EVOLUTION_URL` | URL da Evolution API |
| `EVOLUTION_KEY` | API Key da Evolution |
| `OPSCONTROL_URL` | URL do Supabase |
| `OPSCONTROL_KEY` | Service Role Key |
| `OPENAI_API_KEY` | Chave OpenAI (para transcrição e IA) |
