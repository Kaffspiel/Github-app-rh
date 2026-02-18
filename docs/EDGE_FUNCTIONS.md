# ⚡ Documentação das Edge Functions

## Visão Geral

Todas as Edge Functions estão em `supabase/functions/` e são deployadas automaticamente pelo Lovable Cloud. Todas possuem `verify_jwt = false` no `supabase/config.toml` e tratam CORS internamente.

**Base URL:** `https://nnmrlucwrzoqkwzytbbl.supabase.co/functions/v1/`

---

## 1. create-user

**Endpoint:** `POST /functions/v1/create-user`

**Descrição:** Cria um novo usuário (auth + employee + user_role). Usado pelo Admin Master para adicionar admins/gestores e por admins para adicionar colaboradores.

**Headers Requeridos:**
- `Authorization: Bearer <token>` (token do admin autenticado)

**Payload:**
```json
{
  "email": "novo@email.com",
  "password": "senha123",
  "name": "Nome do Usuário",
  "role": "admin" | "gestor" | "colaborador",
  "companyId": "uuid-da-empresa",
  "department": "Departamento"
}
```

**Lógica:**
1. Valida autenticação do solicitante
2. Verifica se solicitante é admin/admin_master
3. Verifica se pertence à mesma empresa (exceto admin_master)
4. Cria usuário no Supabase Auth (com email confirmado)
5. Insere registro em `user_roles`
6. Cria/atualiza registro em `employees`

**Resposta (sucesso):**
```json
{
  "success": true,
  "userId": "uuid",
  "message": "Usuário criado com sucesso"
}
```

**Erros comuns:**
- `403`: Sem permissão
- `400`: Email já existe ou dados inválidos

---

## 2. reset-user-password

**Endpoint:** `POST /functions/v1/reset-user-password`

**Descrição:** Redefine a senha de um usuário. Apenas admins podem executar.

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
1. Valida autenticação
2. Verifica se é admin ou admin_master
3. Se admin, verifica se o alvo pertence à mesma empresa
4. Reseta a senha via `auth.admin.updateUserById`

**Validações:**
- Senha mínima: 6 caracteres
- Admin só pode resetar senhas de usuários da mesma empresa

---

## 3. update-user-email

**Endpoint:** `POST /functions/v1/update-user-email`

**Descrição:** Atualiza o email de um usuário. Requer permissão de admin.

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
1. Valida autenticação e permissão
2. Atualiza email no Supabase Auth
3. Atualiza email na tabela `employees`

---

## 4. send-whatsapp

**Endpoint:** `POST /functions/v1/send-whatsapp`

**Descrição:** Envia mensagem de texto via WhatsApp usando a Evolution API.

**Secrets Necessários:** `EVOLUTION_URL`, `EVOLUTION_KEY`

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
   - Busca número WhatsApp do colaborador
   - Verifica se WhatsApp está verificado e notificações habilitadas
   - Verifica horário de trabalho (bloqueia fora do expediente)
2. Limpa telefone (remove não-dígitos)
3. Envia via Evolution API (`/message/sendText/teste`)
4. Retorna `messageId` da Evolution

**Controle de Horário:**
- Usa `work_schedule_start` do colaborador (padrão: 09:00)
- Jornada padrão: 9 horas
- Fuso: UTC-3 (Brasil)

**Resposta (sucesso):**
```json
{
  "success": true,
  "messageId": "evolution-msg-id"
}
```

**Resposta (bloqueado):**
```json
{
  "success": false,
  "error": "Outside work hours",
  "blocked": true
}
```

---

## 5. send-notification

**Endpoint:** `POST /functions/v1/send-notification`

**Descrição:** Envia notificação via WhatsApp e registra no banco de dados.

**Secrets Necessários:** `EVOLUTION_URL`, `EVOLUTION_KEY`

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
1. Se `recipientId` fornecido, busca dados do employee
2. Verifica preferências de notificação e quiet hours
3. Insere registro na tabela `notifications` (status: pending)
4. Envia via Evolution API (texto ou botões)
5. Atualiza status para "sent" ou "failed"

**Tipos de Notificação (enum `notification_type`):**
- `task_assigned`, `task_due_reminder`, `task_overdue`, `task_completed`
- `task_comment`, `clock_reminder`, `clock_anomaly`
- `justification_required`, `justification_response`
- `announcement`, `gamification_badge`

---

## 6. check-overdue-tasks

**Endpoint:** `POST /functions/v1/check-overdue-tasks`

**Descrição:** Verifica tarefas vencidas e envia alertas via WhatsApp. Projetada para ser chamada via cron job ou webhook externo.

**Secrets Necessários:** `EVOLUTION_URL`, `EVOLUTION_KEY`

**Payload:** Nenhum (body vazio ou `{}`)

**Lógica:**
1. Busca tarefas com `due_date < now()`, status `pendente` ou `andamento`, e `overdue_notified_at IS NULL`
2. Atualiza status para `atrasada` e marca `overdue_notified_at`
3. Para cada tarefa (se Evolution API configurada):
   - Verifica horário de trabalho do responsável
   - Envia alerta WhatsApp ao responsável
   - Envia alerta aos gestores/admins da mesma empresa
4. Proteção contra duplicatas: só notifica tarefas efetivamente atualizadas

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

**Descrição:** Gera resumo de progresso de tarefas e notifica gestores. Projetada para execução periódica (cron a cada 4h).

**Query Parameters:**
- `hours` (opcional, padrão: 4): Período de busca
- `company_id` (opcional): Filtrar por empresa

**Lógica:**
1. Busca `task_progress_logs` das últimas X horas
2. Agrupa por colaborador:
   - Tarefas concluídas
   - Tarefas iniciadas
   - Itens de checklist marcados
3. Para cada empresa com atividade:
   - Encontra gestores/admins com `notify_tasks = true`
   - Cria notificação in-app com resumo formatado
4. Insere notificações na tabela `notifications`

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

**Descrição:** Recebe atualizações de status de mensagens WhatsApp da Evolution API.

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
1. Busca notificação pelo `whatsapp_message_id`
2. Se não encontrar, busca pela última notificação enviada ao telefone
3. Atualiza campos:
   - `delivered` → `whatsapp_delivered_at`
   - `read` → `whatsapp_read_at`, `read_at`
4. Atualiza `whatsapp_status` e `status` geral

---

## 9. webhook-response

**Endpoint:** `POST /functions/v1/webhook-response`

**Descrição:** Recebe respostas de mensagens WhatsApp dos colaboradores. Inclui funcionalidade de criação de tarefas via IA para gestores.

**Secrets Necessários:** `OPENAI_API_KEY`

**Payload (da Evolution API via n8n):**
```json
{
  "messageId": "msg-id",
  "phone": "5511999999999",
  "pushName": "Nome WhatsApp",
  "message": "Texto da mensagem",
  "responseType": "text | button | audio",
  "responseValue": "valor",
  "instance": "teste",
  "audioTranscription": "transcrição (se áudio)"
}
```

**Lógica:**
1. Identifica employee pelo telefone
2. Vincula à última notificação (se aplicável)
3. Salva em `whatsapp_responses`
4. **Se remetente é gestor/admin e mensagem é texto/áudio:**
   - Usa GPT-4o-mini para extrair: título, responsável, prazo, prioridade
   - Cria tarefa automaticamente
   - Envia confirmação ao gestor via WhatsApp
   - Notifica colaborador responsável
5. **Se resposta a botão:** atualiza status da notificação

---

## 10. parse-time-document

**Endpoint:** `POST /functions/v1/parse-time-document`

**Descrição:** Processa documentos de ponto (CSV, Excel, PDF) usando IA para extrair registros estruturados.

**Secrets Necessários:** `GOOGLE_AI_API_KEY` ou `OPENAI_API_KEY`

**Payload:**
```json
{
  "fileContent": "conteúdo do arquivo (texto/base64)",
  "fileType": "csv | xlsx | pdf",
  "fileName": "arquivo.csv"
}
```

**Lógica:**
1. Tenta processar com Google Gemini (prioridade)
2. Fallback para OpenAI se Gemini falhar
3. Prompt especializado para documentos de ponto brasileiro
4. Extrai registros diários ou acumulados
5. Retorna dados estruturados para importação

**Resposta:**
```json
{
  "success": true,
  "records": [
    {
      "employeeName": "João Silva",
      "date": "2024-01-15",
      "entry1": "08:00",
      "exit1": "12:00",
      "entry2": "13:00",
      "exit2": "17:00"
    }
  ],
  "accumulatedRecords": [],
  "errors": []
}
```

---

## 11. setup-test-users

**Endpoint:** `POST /functions/v1/setup-test-users`

**Descrição:** Cria usuários de teste para uma empresa. Uso exclusivo para desenvolvimento.

**Payload:**
```json
{
  "companyId": "uuid-da-empresa"
}
```

**Usuários Criados:**
| Email | Senha | Role |
|-------|-------|------|
| admin@teste.com | 123456 | admin |
| gestor@teste.com | 123456 | gestor |
| colaborador@teste.com | 123456 | colaborador |

---

## Configuração (supabase/config.toml)

```toml
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

---

## Secrets Necessários

| Secret | Usado por | Descrição |
|--------|-----------|-----------|
| `SUPABASE_URL` | Todas | URL do projeto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Todas | Chave de serviço (acesso total) |
| `SUPABASE_ANON_KEY` | reset-user-password | Chave pública |
| `EVOLUTION_URL` | send-whatsapp, send-notification, check-overdue-tasks, webhook-response | URL da Evolution API |
| `EVOLUTION_KEY` | send-whatsapp, send-notification, check-overdue-tasks, webhook-response | API Key da Evolution |
| `OPENAI_API_KEY` | webhook-response, parse-time-document | Chave OpenAI |
| `GOOGLE_AI_API_KEY` | parse-time-document | Chave Google Gemini |
