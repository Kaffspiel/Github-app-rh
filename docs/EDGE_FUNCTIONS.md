# ⚡ Documentação das Edge Functions

## Visão Geral

Todas as Edge Functions estão em `supabase/functions/` e são deployadas automaticamente pelo Lovable Cloud. Todas possuem `verify_jwt = false` no `supabase/config.toml` e tratam CORS internamente.

**Base URL:** `https://nnmrlucwrzoqkwzytbbl.supabase.co/functions/v1/`

**Arquivo CORS compartilhado:** `supabase/functions/_shared/cors.ts`

**Total de Functions:** 11

---

## 1. create-user

**Endpoint:** `POST /functions/v1/create-user`

**Descrição:** Cria um novo usuário (auth + employee + user_role). Usado pelo Admin Master para adicionar admins/gestores e por admins/gestores para adicionar colaboradores.

**Runtime:** `serve()` de `deno.land/std@0.190.0` + `@supabase/supabase-js@2.49.4`

**Headers Requeridos:**
- `Authorization: Bearer <token>` (token do admin/gestor autenticado)

**Payload:**
```json
{
  "email": "novo@email.com",
  "password": "senha123",
  "name": "Nome do Usuário",
  "role": "admin" | "gestor" | "colaborador",
  "companyId": "uuid-da-empresa",
  "department": "Departamento",
  "employeeId": "uuid-opcional (para vincular a employee existente)"
}
```

**Lógica:**
1. Valida autenticação do solicitante via header `Authorization` (extrai token explicitamente para `getUser(token)`)
2. Verifica se solicitante é admin/admin_master/gestor na tabela `user_roles` (usa `maybeSingle()`)
3. **Permissões por role:**
   - `admin_master`: pode criar qualquer role para qualquer empresa
   - `admin`: pode criar admin, gestor, colaborador para sua empresa
   - `gestor`: pode criar **apenas colaboradores** para sua empresa
4. Cria usuário no Supabase Auth (com `email_confirm: true`)
5. Insere registro em `user_roles` com role e company_id
6. Se `employeeId` fornecido: **atualiza** employee existente com `user_id` e `role`
7. Se não: **cria** novo registro em `employees` com dados do formulário

**Resposta (sucesso):**
```json
{
  "success": true,
  "message": "Usuário criado com sucesso",
  "user": { "id": "uuid", "email": "...", "name": "...", "role": "admin" }
}
```

**Erros comuns:**
- `401`: Token ausente ou inválido / Usuário sem permissões
- `400`: Email já existe, dados inválidos, senha < 6 chars, gestor tentando criar não-colaborador

**Rollback:** Se falhar ao inserir `user_roles`, o Auth user é deletado via `admin.deleteUser()`

---

## 2. reset-user-password

**Endpoint:** `POST /functions/v1/reset-user-password`

**Descrição:** Redefine a senha de um usuário. Apenas admins podem executar.

**Runtime:** `serve()` de `deno.land/std@0.190.0` + `@supabase/supabase-js@2.49.4`

**Headers Requeridos:**
- `Authorization: Bearer <token>`

**Payload:**
```json
{
  "userId": "uuid-do-usuario",
  "newPassword": "novaSenha123"
}
```

**Lógica:**
1. Valida autenticação via header (usa `getUser()` sem token explícito)
2. Verifica se é admin ou admin_master via `user_roles` (usa `maybeSingle()`)
3. Se admin, verifica se o alvo pertence à mesma empresa (busca `user_roles` do alvo)
4. Reseta a senha via `auth.admin.updateUserById`

**Validações:**
- Senha mínima: 6 caracteres
- Admin só pode resetar senhas de usuários da mesma empresa
- Admin Master pode resetar qualquer senha

---

## 3. update-user-email

**Endpoint:** `POST /functions/v1/update-user-email`

**Descrição:** Atualiza o email de um usuário no Supabase Auth. Requer permissão de admin.

**Runtime:** `serve()` de `deno.land/std@0.190.0` + `@supabase/supabase-js@2.49.4`

**Headers Requeridos:**
- `Authorization: Bearer <token>`

**Payload:**
```json
{
  "userId": "uuid-do-usuario",
  "newEmail": "novo@email.com"
}
```

**Lógica:**
1. Valida autenticação e permissão (admin/admin_master) — extrai token explicitamente para `getUser(token)`
2. Atualiza email no Supabase Auth via `auth.admin.updateUserById` (com `email_confirm: true`)
3. **Nota:** NÃO atualiza automaticamente a tabela `employees` (apenas Auth)

---

## 4. send-whatsapp

**Endpoint:** `POST /functions/v1/send-whatsapp`

**Descrição:** Envia mensagem de texto via WhatsApp usando a Evolution API. Inclui controle de horário de trabalho.

**Runtime:** `Deno.serve()` (nativo) + `_shared/cors.ts`

**Secrets Necessários:** `EVOLUTION_URL`, `EVOLUTION_KEY`

**Instância Evolution:** `teste`

**Payload:**
```json
{
  "employeeId": "uuid (opcional se phone fornecido)",
  "phone": "5511999999999 (opcional se employeeId fornecido)",
  "message": "Texto da mensagem",
  "type": "generic | task | reminder"
}
```

**Lógica:**
1. Se `employeeId` fornecido e sem `phone`:
   - Busca número WhatsApp do colaborador na tabela `employees`
   - Seleciona: `whatsapp_number, whatsapp_verified, notify_whatsapp, work_schedule_start`
   - Verifica se `whatsapp_verified = true` e `notify_whatsapp = true`
   - Verifica horário de trabalho via `isWithinWorkHours()`
2. Se `phone` fornecido com `employeeId`: verifica horário de trabalho
3. Se `phone` fornecido sem `employeeId`: envia direto sem verificações
4. Limpa telefone (remove não-dígitos)
5. Envia via Evolution API (`POST /message/sendText/teste`)
6. Retorna `messageId` da Evolution (`result.key.id`)

**Controle de Horário (`isWithinWorkHours`):**
- Usa `work_schedule_start` do colaborador (padrão: `09:00`)
- Jornada padrão: 9 horas
- Fuso: UTC-3 (Brasil) — `new Date(now.getTime() - 3 * 60 * 60 * 1000)`
- Fórmula: `currentMinutes >= startMinutes && currentMinutes <= endMinutes`

**Resposta (sucesso):**
```json
{
  "success": true,
  "messageId": "evolution-msg-id"
}
```

**Resposta (bloqueado por horário):**
```json
{
  "success": false,
  "error": "Outside work hours",
  "blocked": true
}
```

**Resposta (sem número/notificações desabilitadas):**
```json
{
  "success": false,
  "skipped": true,
  "error": "Employee has no WhatsApp number"
}
```

---

## 5. send-notification

**Endpoint:** `POST /functions/v1/send-notification`

**Descrição:** Envia notificação via WhatsApp e registra no banco de dados. Suporta mensagens com botões (convertidos para texto automaticamente).

**Runtime:** `serve()` de `deno.land/std@0.168.0` + `@supabase/supabase-js@2`

**Secrets Necessários:** `EVOLUTION_URL`, `EVOLUTION_KEY`

**Instância Evolution:** `teste` (ou customizada via `evolutionInstance`)

**Payload:**
```json
{
  "recipientId": "uuid-do-employee (opcional)",
  "recipientPhone": "5511999999999 (opcional)",
  "type": "task_assigned | task_due_reminder | announcement | ...",
  "title": "Título da Notificação",
  "message": "Corpo da mensagem",
  "priority": "low | normal | high | urgent",
  "relatedEntityType": "task | employee",
  "relatedEntityId": "uuid",
  "senderId": "uuid",
  "senderName": "Nome",
  "evolutionInstance": "teste",
  "buttons": [
    { "type": "reply", "reply": { "id": "btn1", "title": "Aceitar" } }
  ]
}
```

**Lógica:**
1. Verifica credenciais Evolution (retorna 500 se não configuradas)
2. Se `recipientId` fornecido, busca dados do employee (`select("*")`)
3. Verifica preferências: `notify_whatsapp`, `whatsapp_verified`, `whatsapp_number`
4. Verifica quiet hours (`quiet_hours_start`, `quiet_hours_end`) — suporta horários que cruzam meia-noite
5. Insere registro na tabela `notifications` (status: `pending`, channel: `["whatsapp"]`)
6. **Conversão de botões para texto:** Se `buttons` fornecidos, converte para formato textual:
   ```
   Opções disponíveis:
   1 - Aceitar
   2 - Recusar
   (Responda com o número opção desejada)
   ```
7. Envia via Evolution API (`POST /message/sendText/{instance}`) com `delay: 1200`
8. Atualiza status para `sent` (com `whatsapp_message_id`, `whatsapp_sent_at`, `sent_at`) ou `failed` (com `whatsapp_error`)

**Tipos de Notificação (enum `notification_type`):**
- `task_assigned` — Tarefa atribuída
- `task_due_reminder` — Lembrete de prazo
- `task_overdue` — Tarefa atrasada
- `task_completed` — Tarefa concluída
- `task_comment` — Comentário em tarefa
- `clock_reminder` — Lembrete de ponto
- `clock_anomaly` — Anomalia de ponto
- `justification_required` — Justificativa necessária
- `justification_response` — Resposta de justificativa
- `announcement` — Comunicado geral
- `gamification_badge` — Badge de gamificação

---

## 6. check-overdue-tasks

**Endpoint:** `POST /functions/v1/check-overdue-tasks`

**Descrição:** Verifica tarefas vencidas, atualiza status para `atrasada` e envia alertas via WhatsApp. Projetada para ser chamada via cron job ou webhook externo periodicamente.

**Runtime:** `Deno.serve()` (nativo) + `_shared/cors.ts`

**Secrets Necessários:** `EVOLUTION_URL`, `EVOLUTION_KEY`

**Instância Evolution:** `teste`

**Payload:** Nenhum (body vazio ou `{}`)

**Lógica:**
1. Busca tarefas com:
   - `due_date < now()`
   - `status IN ('pendente', 'andamento')`
   - `overdue_notified_at IS NULL`
   - `assignee_id IS NOT NULL`
   - Join com `employees` via FK `tasks_assignee_id_fkey` (seleciona: `id, name, whatsapp_number, whatsapp_verified, notify_whatsapp`)
2. Atualiza status para `atrasada` e marca `overdue_notified_at` (UPDATE **antes** de notificar — proteção contra duplicatas)
3. Filtra apenas tarefas efetivamente atualizadas usando `Set` de `updatedIds`
4. Para cada tarefa (se Evolution API configurada):
   - Faz query adicional para buscar `work_schedule_start` do assignee
   - Verifica horário de trabalho via `isWithinWorkHours()`
   - Envia alerta WhatsApp ao responsável: `⚠️ Tarefa Atrasada!` com título e prazo
   - Busca gestores/admins da mesma empresa com `whatsapp_verified = true` e `notify_whatsapp = true`
   - Envia alerta aos gestores (também verificando horário de trabalho individualmente)

**Proteção contra duplicatas:**
- Marca `overdue_notified_at` ANTES de enviar notificações
- Só notifica tarefas que foram realmente atualizadas no UPDATE
- Usa `updatedIds` Set para filtrar

**Resposta:**
```json
{
  "success": true,
  "overdueTasks": 5,
  "notificationsSent": 12
}
```

---

## 7. task-progress-summary

**Endpoint:** `GET /functions/v1/task-progress-summary?hours=4&company_id=uuid`

**Descrição:** Gera resumo de progresso de tarefas e cria notificações in-app para gestores. Projetada para execução periódica (cron a cada 4h).

**Runtime:** `serve()` de `deno.land/std@0.168.0` + `@supabase/supabase-js@2`

**Query Parameters:**
| Param | Tipo | Padrão | Descrição |
|-------|------|--------|-----------|
| `hours` | number | 4 | Período de busca em horas |
| `company_id` | uuid | null | Filtrar por empresa específica |

**Lógica:**
1. Busca `task_progress_logs` das últimas X horas (join com `employees` e `tasks` via FKs explícitas)
2. Agrupa por colaborador (`Map<employeeId, TaskProgressSummary>`):
   - `task_completed` → incrementa `completed`, adiciona ação "concluiu"
   - `task_started` → incrementa `started`, adiciona ação "iniciou"
   - `checklist_completed` → incrementa `checklistItems`, adiciona ação "marcou como feito" (com texto do item)
3. Para cada empresa com atividade:
   - Busca gestores/admins com `notify_tasks = true` **E** `notify_in_app = true`
   - Filtra resumos de funcionários da mesma empresa
   - Gera mensagem formatada com totais individuais e da empresa
4. Insere notificações com:
   - `type: "announcement"` (não `task_completed`)
   - `channels: ["in_app"]`
   - `status: "pending"`
   - `in_app_status: "delivered"`
   - `in_app_delivered_at: now()`

**Resposta:**
```json
{
  "success": true,
  "notifications": 3,
  "employeesWithProgress": 5,
  "managersNotified": 3
}
```

---

## 8. webhook-status

**Endpoint:** `POST /functions/v1/webhook-status`

**Descrição:** Recebe atualizações de status de mensagens WhatsApp da Evolution API. Chamada automaticamente pela Evolution via webhook configurado no n8n.

**Runtime:** `serve()` de `deno.land/std@0.168.0` + `@supabase/supabase-js@2`

**Payload (da Evolution API):**
```json
{
  "messageId": "evolution-message-id",
  "phone": "5511999999999",
  "status": "pending | sent | delivered | read",
  "timestamp": "2024-01-01T12:00:00Z",
  "fromMe": true,
  "instance": "teste"
}
```

**Lógica:**
1. Busca notificação pelo `whatsapp_message_id` na tabela `notifications` (usa `single()`)
2. Se não encontrar, busca pela última notificação enviada ao telefone com `whatsapp_status = 'sent'` (fallback)
3. Atualiza campos conforme o status:
   - `delivered` → `whatsapp_delivered_at`, `status = 'delivered'`
   - `read` → `whatsapp_read_at`, `read_at`, `whatsapp_status = 'read'`, `status = 'read'`
4. Sempre atualiza `whatsapp_status` com o status recebido
5. Também atualiza `whatsapp_message_id` no fallback (para rastreio futuro)

---

## 9. webhook-response

**Endpoint:** `POST /functions/v1/webhook-response`

**Descrição:** Recebe respostas de mensagens WhatsApp dos colaboradores. Inclui funcionalidade de criação de tarefas via IA (GPT-4o-mini) para gestores e lógica interativa para tarefas vencidas.

**Runtime:** `serve()` de `deno.land/std@0.168.0` + `@supabase/supabase-js@2`

**Secrets Necessários:** `OPENAI_API_KEY`, `EVOLUTION_URL`, `EVOLUTION_KEY`

**Payload (da Evolution API via n8n):**
```json
{
  "messageId": "msg-id",
  "phone": "5511999999999",
  "pushName": "Nome WhatsApp",
  "responseType": "text | button | list | audio_transcription",
  "responseValue": "Texto da mensagem ou transcrição",
  "timestamp": "ISO-8601",
  "instance": "teste",
  "rawMessage": {}
}
```

**Lógica Detalhada:**

### Etapa 1: Identificar Colaborador
- Busca employee pelo `whatsapp_number` (limpo, apenas dígitos)
- Filtra por `is_active = true` e `company_id IS NOT NULL`
- Usa `limit(1)` com `order(updated_at desc)` para evitar erro com números duplicados

### Etapa 2: Vincular Notificação
- Busca última notificação enviada ao telefone com status `sent` ou `delivered`
- Usa `maybeSingle()` para evitar erro se não encontrar

### Etapa 3: Salvar Resposta
- Insere registro em `whatsapp_responses` com todos os dados do payload
- Vincula `notification_id` e `employee_id` se encontrados

### Etapa 4: Criação de Tarefas por IA (Gestores)
**Condições:** `responseType IN ('text', 'audio_transcription')` + `employee.role IN ('admin', 'gestor')` + `OPENAI_API_KEY` configurada

1. Busca lista de funcionários da empresa (`coworkers`) — `id, name` com `is_active = true`
2. Busca nome da empresa
3. Envia prompt para **GPT-4o-mini** (temperature: 0, `response_format: json_object`) com:
   - Mensagem do gestor
   - Data e dia da semana atuais (em português)
   - Lista de funcionários disponíveis (nome + ID)
   - Regras para extrair horário específico (formato HH:MM)
4. IA retorna JSON: `{ is_task, title, assignee_id, due_date, due_time }`
5. Se `is_task = true` e `assignee_id` identificado:
   - Converte horário BRT para UTC (+3h) — padrão: `18:00` BRT se não especificado
   - Insere tarefa em `tasks` (status: `pendente`, prioridade: `média`)
   - Envia confirmação ao gestor via WhatsApp (usando `payload.instance` como instância)
   - Notifica colaborador responsável via WhatsApp (se diferente do gestor)

### Etapa 5: Lógica Interativa (Tarefa Vencida)
**Condição:** `contextNotification.type === 'task_overdue'`

- Resposta `"sim"`: Marca tarefa como `concluido` (progress: 100) + envia confirmação ✅
- Resposta `"não"/"nao"`: Informa sobre prazo de 10min + sugere prorrogação pelo App
- Outra resposta: Pede para responder com "Sim" ou "Não"

### Etapa 6: Lógica Legada (Botões)
- Se `responseType === 'button'` e há `notificationId` e `actionTaken === 'none'`: marca notificação como `read`

### Etapa Final
- Atualiza `whatsapp_last_seen` do employee

**Resposta:**
```json
{
  "success": true,
  "action": "task_created | task_completed_via_whatsapp | task_overdue_not_completed | invalid_response_to_overdue | button_processed | none",
  "confirmationMessage": "mensagem ou null",
  "employeeFound": true
}
```

---

## 10. parse-time-document

**Endpoint:** `POST /functions/v1/parse-time-document`

**Descrição:** Processa documentos de ponto (CSV, Excel, PDF) usando IA para extrair registros de horário estruturados. Usa Google Gemini como prioridade e OpenAI como fallback.

**Runtime:** `serve()` de `deno.land/std@0.168.0` + XHR polyfill

**Secrets Necessários:** `GOOGLE_AI_API_KEY` (prioridade) ou `OPENAI_API_KEY` (fallback)

**Payload:**
```json
{
  "fileContent": "conteúdo do arquivo (texto/base64)",
  "fileType": "csv | xlsx | pdf",
  "fileName": "arquivo.csv"
}
```

**Lógica:**
1. Verifica disponibilidade das chaves de API (Gemini e/ou OpenAI)
2. Tenta processar com **Google Gemini** (`gemini-2.0-flash`, maxOutputTokens: **32000**, responseMimeType: `application/json`)
   - Envia até **30.000 chars** do conteúdo
3. Se Gemini falhar, tenta com **OpenAI** (`gpt-4o-mini`, max_tokens: **16000**)
   - Envia até **25.000 chars** do conteúdo
4. Prompt especializado para documentos de ponto brasileiro:
   - **Tipo 1 (daily):** Registros diários com CPF, nome, data, batidas (array de HH:MM)
   - **Tipo 2 (accumulated):** Resumo acumulado por colaborador (previstas, trabalhadas, abonos, saldo)
   - Regras: separador CSV (`;` ou `,`), remoção de sufixos `(C)/(I)/(A)`, conversão de datas BR
5. Extração robusta de JSON da resposta da IA:
   - Remove marcadores de Markdown
   - Limpa caracteres de controle
   - `repairTruncatedJson()` para fechar estruturas incompletas (preserva apenas records completos)

**Interfaces de Saída:**
```typescript
interface TimeRecord {
  externalEmployeeId: string;  // CPF (apenas números)
  employeeName?: string;
  date: string;                // YYYY-MM-DD
  punches: string[];           // Array de HH:MM
}

interface AccumulatedRecord {
  employeeName: string;
  predictedHours: string;      // "203:00"
  workedHours: string;         // "184:31"
  bonusHours: string;          // "13:29"
  balance: string;             // "-04:56"
}

interface ParseResult {
  success: boolean;
  documentType: 'daily' | 'accumulated';
  periodStart?: string;
  periodEnd?: string;
  companyName?: string;
  records: TimeRecord[];
  accumulatedRecords?: AccumulatedRecord[];
  errors: { row: number; message: string }[];
  totalRows: number;
  suggestedMapping?: { ... };
  provider?: string;           // "Google Gemini" | "OpenAI" | "OpenAI (fallback)"
}
```

**Resposta (sucesso):**
```json
{
  "success": true,
  "documentType": "daily",
  "records": [...],
  "accumulatedRecords": [],
  "errors": [],
  "totalRows": 42,
  "provider": "Google Gemini"
}
```

---

## 11. setup-test-users

**Endpoint:** `POST /functions/v1/setup-test-users`

**Descrição:** Cria usuários de teste para uma empresa. Uso exclusivo para desenvolvimento/testes.

**Runtime:** `serve()` de `deno.land/std@0.190.0` + `@supabase/supabase-js@2.49.4`

**Payload:**
```json
{
  "companyId": "uuid-da-empresa"
}
```

**Usuários Criados:**
| Email | Senha | Role | Department |
|-------|-------|------|------------|
| admin@teste.com | 123456 | admin | Administração |
| gestor@teste.com | 123456 | gestor | Gestão |
| colaborador@teste.com | 123456 | colaborador | Operacional |

**Lógica:**
1. Para cada usuário de teste:
   - Cria no Supabase Auth (`admin.createUser` com `email_confirm: true`)
   - Se email já existe: pula com status `"already exists"`
   - Insere role em `user_roles` (com `company_id` para roles não-admin_master)
   - Cria registro em `employees`

---

## Configuração (supabase/config.toml)

```toml
project_id = "nnmrlucwrzoqkwzytbbl"

[functions.create-user]
verify_jwt = false

[functions.parse-time-document]
verify_jwt = false

[functions.reset-user-password]
verify_jwt = false

[functions.send-notification]
verify_jwt = false

[functions.setup-test-users]
verify_jwt = false

[functions.task-progress-summary]
verify_jwt = false

[functions.update-user-email]
verify_jwt = false

[functions.webhook-response]
verify_jwt = false

[functions.webhook-status]
verify_jwt = false

[functions.send-whatsapp]
verify_jwt = false

[functions.check-overdue-tasks]
verify_jwt = false
```

> **Nota:** Todas as funções usam `verify_jwt = false` e validam autenticação internamente quando necessário (via header `Authorization` + `supabase.auth.getUser()`).

---

## Secrets Necessários

| Secret | Usado por | Descrição |
|--------|-----------|-----------|
| `SUPABASE_URL` | Todas | URL do projeto (auto-injetada) |
| `SUPABASE_SERVICE_ROLE_KEY` | Todas | Chave de serviço (auto-injetada) |
| `SUPABASE_ANON_KEY` | create-user, reset-user-password, update-user-email | Chave pública para client autenticado |
| `EVOLUTION_URL` | send-whatsapp, send-notification, check-overdue-tasks, webhook-response | URL da Evolution API |
| `EVOLUTION_KEY` | send-whatsapp, send-notification, check-overdue-tasks, webhook-response | API Key da Evolution |
| `OPENAI_API_KEY` | webhook-response, parse-time-document (fallback) | Chave OpenAI (GPT-4o-mini) |
| `GOOGLE_AI_API_KEY` | parse-time-document | Chave Google Gemini (prioridade) |

---

## Diferenças de Runtime

| Function | Import Style | Serve |
|----------|-------------|-------|
| send-whatsapp | `_shared/cors.ts` | `Deno.serve()` |
| check-overdue-tasks | `_shared/cors.ts` | `Deno.serve()` |
| create-user | inline CORS, `jsr:@supabase/functions-js/edge-runtime.d.ts` | `serve()` std@0.190.0 |
| update-user-email | inline CORS, `jsr:@supabase/functions-js/edge-runtime.d.ts` | `serve()` std@0.190.0 |
| reset-user-password | inline CORS | `serve()` std@0.190.0 |
| setup-test-users | inline CORS | `serve()` std@0.190.0 |
| send-notification | inline CORS | `serve()` std@0.168.0 |
| webhook-status | inline CORS | `serve()` std@0.168.0 |
| webhook-response | inline CORS | `serve()` std@0.168.0 |
| task-progress-summary | inline CORS | `serve()` std@0.168.0 |
| parse-time-document | inline CORS + XHR polyfill | `serve()` std@0.168.0 |

---

## Fluxo de Dados: WhatsApp

```
┌──────────────────────────────────────────────────────────────────┐
│                     ENVIO (Frontend → WhatsApp)                   │
│                                                                   │
│  Frontend → send-whatsapp/send-notification → Evolution API       │
│         (verifica horário + preferências)     (instância: teste)  │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                     STATUS (Evolution → Backend)                  │
│                                                                   │
│  Evolution API → n8n → webhook-status → Atualiza notifications   │
│  (sent/delivered/read)                                            │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                     RESPOSTA (WhatsApp → Backend)                 │
│                                                                   │
│  Colaborador responde → n8n → webhook-response                   │
│     ├─ Se gestor + texto → GPT-4o-mini → Cria tarefa            │
│     ├─ Se tarefa vencida → Marca como concluída ou informa       │
│     └─ Se botão → Atualiza status da notificação                 │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                     CRON (Automático)                              │
│                                                                   │
│  check-overdue-tasks → Busca tarefas vencidas                   │
│     → Atualiza status para 'atrasada'                            │
│     → Notifica responsável + gestores via WhatsApp               │
│                                                                   │
│  task-progress-summary → Resumo de progresso                     │
│     → Notificação in-app para gestores (tipo: announcement)      │
└──────────────────────────────────────────────────────────────────┘
```
