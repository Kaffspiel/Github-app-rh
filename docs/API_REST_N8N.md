# 📡 API REST - Documentação para n8n

Este documento contém todas as informações necessárias para integrar o banco de dados com n8n ou qualquer ferramenta de automação via HTTP.

---

## 🔐 Autenticação

### URLs e Credenciais

| Parâmetro | Valor |
|-----------|-------|
| **Base URL** | `https://nnmrlucwrzoqkwzytbbl.supabase.co/rest/v1` |
| **Anon Key** | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ubXJsdWN3cnpvcWt3enl0YmJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3MTA4MzIsImV4cCI6MjA4NTI4NjgzMn0.I4dLM5R-_qQe8xy1VYevXLd6BvkAcam5CYZ9jQvOxRA` |
| **Service Role Key** | Armazenado como segredo no backend (use para operações admin) |

### Headers Obrigatórios

```json
{
  "apikey": "SUA_ANON_KEY",
  "Authorization": "Bearer SUA_ANON_KEY_OU_SERVICE_ROLE_KEY",
  "Content-Type": "application/json"
}
```

> ⚠️ **IMPORTANTE**: Use a `Service Role Key` apenas para operações administrativas que precisam bypassar RLS (Row Level Security).

---

## 📊 Tabelas Disponíveis

### Visão Geral

| Tabela | Descrição | Endpoint |
|--------|-----------|----------|
| `companies` | Empresas cadastradas | `/companies` |
| `employees` | Funcionários | `/employees` |
| `tasks` | Tarefas | `/tasks` |
| `task_checklist_items` | Itens de checklist das tarefas | `/task_checklist_items` |
| `task_comments` | Comentários das tarefas | `/task_comments` |
| `task_progress_logs` | Logs de progresso | `/task_progress_logs` |
| `occurrences` | Ocorrências (pontuação) | `/occurrences` |
| `notifications` | Notificações | `/notifications` |
| `notification_queue` | Fila de notificações | `/notification_queue` |
| `time_tracking_records` | Registros de ponto | `/time_tracking_records` |
| `time_tracking_imports` | Importações de ponto | `/time_tracking_imports` |
| `user_roles` | Papéis dos usuários | `/user_roles` |
| `company_rules` | Regras da empresa | `/company_rules` |
| `routine_templates` | Templates de rotina | `/routine_templates` |
| `routine_template_assignments` | Atribuições de templates | `/routine_template_assignments` |
| `whatsapp_responses` | Respostas do WhatsApp | `/whatsapp_responses` |
| `api_integrations` | Integrações de API | `/api_integrations` |
| `column_mappings` | Mapeamentos de colunas | `/column_mappings` |

---

## 🏢 COMPANIES (Empresas)

### Estrutura

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `id` | uuid | Auto | ID único |
| `name` | text | ✅ | Nome da empresa |
| `trade_name` | text | ❌ | Nome fantasia |
| `cnpj` | text | ❌ | CNPJ |
| `email` | text | ❌ | Email |
| `phone` | text | ❌ | Telefone |
| `address` | text | ❌ | Endereço |
| `city` | text | ❌ | Cidade |
| `state` | text | ❌ | Estado |
| `zip_code` | text | ❌ | CEP |
| `logo_url` | text | ❌ | URL do logo |
| `is_active` | boolean | ❌ | Ativo (default: true) |
| `settings` | jsonb | ❌ | Configurações |
| `created_at` | timestamp | Auto | Data de criação |
| `updated_at` | timestamp | Auto | Data de atualização |

### Exemplos n8n

#### Listar todas empresas
```
GET https://nnmrlucwrzoqkwzytbbl.supabase.co/rest/v1/companies?select=*
```

#### Buscar empresa por ID
```
GET https://nnmrlucwrzoqkwzytbbl.supabase.co/rest/v1/companies?id=eq.UUID_DA_EMPRESA&select=*
```

#### Criar empresa
```
POST https://nnmrlucwrzoqkwzytbbl.supabase.co/rest/v1/companies

Body:
{
  "name": "Nova Empresa LTDA",
  "trade_name": "Nova Empresa",
  "cnpj": "12.345.678/0001-90",
  "email": "contato@novaempresa.com",
  "phone": "(11) 99999-9999"
}
```

#### Atualizar empresa
```
PATCH https://nnmrlucwrzoqkwzytbbl.supabase.co/rest/v1/companies?id=eq.UUID_DA_EMPRESA

Body:
{
  "phone": "(11) 88888-8888"
}
```

---

## 👥 EMPLOYEES (Funcionários)

### Estrutura

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `id` | uuid | Auto | ID único |
| `user_id` | uuid | ❌ | ID do usuário auth |
| `company_id` | uuid | ❌ | ID da empresa |
| `name` | text | ✅ | Nome completo |
| `email` | text | ✅ | Email |
| `department` | text | ❌ | Departamento (default: 'Geral') |
| `role` | enum | ❌ | Papel: 'colaborador', 'gestor', 'admin' |
| `is_active` | boolean | ❌ | Ativo (default: true) |
| `points` | integer | ❌ | Pontos de gamificação |
| `whatsapp_number` | text | ❌ | Número WhatsApp |
| `whatsapp_verified` | boolean | ❌ | WhatsApp verificado |
| `work_schedule_start` | text | ❌ | Horário de entrada (default: '09:00') |
| `external_id` | text | ❌ | ID externo (sistema de ponto) |
| `notify_whatsapp` | boolean | ❌ | Notificar por WhatsApp |
| `notify_in_app` | boolean | ❌ | Notificar no app |
| `notify_tasks` | boolean | ❌ | Notificar sobre tarefas |
| `notify_time_tracking` | boolean | ❌ | Notificar sobre ponto |
| `quiet_hours_start` | time | ❌ | Início do horário silencioso |
| `quiet_hours_end` | time | ❌ | Fim do horário silencioso |
| `created_at` | timestamp | Auto | Data de criação |
| `updated_at` | timestamp | Auto | Data de atualização |

### Exemplos n8n

#### Listar funcionários de uma empresa
```
GET https://nnmrlucwrzoqkwzytbbl.supabase.co/rest/v1/employees?company_id=eq.UUID_EMPRESA&select=*
```

#### Buscar funcionário por email
```
GET https://nnmrlucwrzoqkwzytbbl.supabase.co/rest/v1/employees?email=eq.email@exemplo.com&select=*
```

#### Buscar funcionário por WhatsApp
```
GET https://nnmrlucwrzoqkwzytbbl.supabase.co/rest/v1/employees?whatsapp_number=eq.5511999999999&select=*
```

#### Criar funcionário
```
POST https://nnmrlucwrzoqkwzytbbl.supabase.co/rest/v1/employees

Body:
{
  "name": "João Silva",
  "email": "joao@empresa.com",
  "company_id": "UUID_DA_EMPRESA",
  "department": "Operacional",
  "role": "colaborador",
  "whatsapp_number": "5511999999999",
  "work_schedule_start": "08:00"
}
```

#### Atualizar pontos do funcionário
```
PATCH https://nnmrlucwrzoqkwzytbbl.supabase.co/rest/v1/employees?id=eq.UUID_FUNCIONARIO

Body:
{
  "points": 150
}
```

#### Vincular funcionário a usuário auth
```
PATCH https://nnmrlucwrzoqkwzytbbl.supabase.co/rest/v1/employees?email=eq.email@exemplo.com

Body:
{
  "user_id": "UUID_DO_AUTH_USER"
}
```

---

## ✅ TASKS (Tarefas)

### Estrutura

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `id` | uuid | Auto | ID único |
| `company_id` | uuid | ✅ | ID da empresa |
| `title` | text | ✅ | Título da tarefa |
| `description` | text | ❌ | Descrição |
| `status` | text | ❌ | Status: 'pendente', 'andamento', 'concluido', 'atrasada' |
| `priority` | text | ❌ | Prioridade: 'baixa', 'média', 'alta' |
| `progress` | integer | ❌ | Progresso 0-100 |
| `due_date` | timestamp | ❌ | Data de vencimento |
| `assignee_id` | uuid | ❌ | ID do responsável (employee) |
| `created_by` | uuid | ❌ | ID de quem criou (employee) |
| `is_daily_routine` | boolean | ❌ | É rotina diária |
| `extension_status` | text | ❌ | Status de prorrogação: 'none', 'pending', 'approved', 'rejected' |
| `created_at` | timestamp | Auto | Data de criação |
| `updated_at` | timestamp | Auto | Data de atualização |

### Exemplos n8n

#### Listar tarefas de uma empresa
```
GET https://nnmrlucwrzoqkwzytbbl.supabase.co/rest/v1/tasks?company_id=eq.UUID_EMPRESA&select=*
```

#### Listar tarefas de um funcionário
```
GET https://nnmrlucwrzoqkwzytbbl.supabase.co/rest/v1/tasks?assignee_id=eq.UUID_FUNCIONARIO&select=*
```

#### Listar tarefas pendentes
```
GET https://nnmrlucwrzoqkwzytbbl.supabase.co/rest/v1/tasks?status=eq.pendente&select=*
```

#### Listar tarefas atrasadas
```
GET https://nnmrlucwrzoqkwzytbbl.supabase.co/rest/v1/tasks?status=eq.atrasada&select=*
```

#### Criar tarefa
```
POST https://nnmrlucwrzoqkwzytbbl.supabase.co/rest/v1/tasks

Body:
{
  "company_id": "UUID_EMPRESA",
  "title": "Revisar relatório mensal",
  "description": "Revisar e aprovar o relatório de vendas do mês",
  "priority": "alta",
  "status": "pendente",
  "due_date": "2025-02-10T18:00:00Z",
  "assignee_id": "UUID_FUNCIONARIO"
}
```

#### Atualizar status da tarefa
```
PATCH https://nnmrlucwrzoqkwzytbbl.supabase.co/rest/v1/tasks?id=eq.UUID_TAREFA

Body:
{
  "status": "concluido",
  "progress": 100
}
```

#### Buscar tarefas com dados do responsável (JOIN)
```
GET https://nnmrlucwrzoqkwzytbbl.supabase.co/rest/v1/tasks?select=*,assignee:employees(id,name,email)&company_id=eq.UUID_EMPRESA
```

---

## 📋 TASK_CHECKLIST_ITEMS (Itens de Checklist)

### Estrutura

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `id` | uuid | Auto | ID único |
| `task_id` | uuid | ✅ | ID da tarefa |
| `text` | text | ✅ | Texto do item |
| `completed` | boolean | ❌ | Completado (default: false) |
| `sort_order` | integer | ❌ | Ordem de exibição |
| `created_at` | timestamp | Auto | Data de criação |

### Exemplos n8n

#### Listar itens de uma tarefa
```
GET https://nnmrlucwrzoqkwzytbbl.supabase.co/rest/v1/task_checklist_items?task_id=eq.UUID_TAREFA&order=sort_order.asc&select=*
```

#### Criar item de checklist
```
POST https://nnmrlucwrzoqkwzytbbl.supabase.co/rest/v1/task_checklist_items

Body:
{
  "task_id": "UUID_TAREFA",
  "text": "Verificar dados financeiros",
  "sort_order": 1
}
```

#### Marcar item como concluído
```
PATCH https://nnmrlucwrzoqkwzytbbl.supabase.co/rest/v1/task_checklist_items?id=eq.UUID_ITEM

Body:
{
  "completed": true
}
```

---

## 💬 TASK_COMMENTS (Comentários)

### Estrutura

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `id` | uuid | Auto | ID único |
| `task_id` | uuid | ✅ | ID da tarefa |
| `employee_id` | uuid | ✅ | ID do funcionário autor |
| `content` | text | ✅ | Conteúdo do comentário |
| `created_at` | timestamp | Auto | Data de criação |

### Exemplos n8n

#### Listar comentários de uma tarefa
```
GET https://nnmrlucwrzoqkwzytbbl.supabase.co/rest/v1/task_comments?task_id=eq.UUID_TAREFA&order=created_at.desc&select=*,employee:employees(name)
```

#### Adicionar comentário
```
POST https://nnmrlucwrzoqkwzytbbl.supabase.co/rest/v1/task_comments

Body:
{
  "task_id": "UUID_TAREFA",
  "employee_id": "UUID_FUNCIONARIO",
  "content": "Tarefa revisada e aprovada."
}
```

---

## 🏆 OCCURRENCES (Ocorrências/Pontuação)

### Estrutura

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `id` | uuid | Auto | ID único |
| `company_id` | uuid | ✅ | ID da empresa |
| `employee_id` | uuid | ✅ | ID do funcionário |
| `type` | text | ✅ | Tipo da ocorrência |
| `points` | integer | ✅ | Pontos (positivo ou negativo) |
| `description` | text | ❌ | Descrição |
| `created_by` | uuid | ❌ | ID de quem criou |
| `created_at` | timestamp | Auto | Data de criação |

### Tipos de Ocorrência

| Tipo | Pontos Sugeridos | Descrição |
|------|------------------|-----------|
| `aprovacao_tarefa` | +10 | Tarefa concluída no prazo |
| `atraso_tarefa` | -5 | Tarefa concluída com atraso |
| `falta` | -10 | Falta no trabalho |
| `atestado` | 0 | Falta justificada com atestado |
| `pontualidade_positiva` | +10 | Chegou no horário |
| `pontualidade_negativa` | -5 | Chegou atrasado |
| `tarefa_atrasada` | -10 | Tarefa entrou em atraso |

### Exemplos n8n

#### Listar ocorrências de um funcionário
```
GET https://nnmrlucwrzoqkwzytbbl.supabase.co/rest/v1/occurrences?employee_id=eq.UUID_FUNCIONARIO&order=created_at.desc&select=*
```

#### Listar ocorrências de uma empresa
```
GET https://nnmrlucwrzoqkwzytbbl.supabase.co/rest/v1/occurrences?company_id=eq.UUID_EMPRESA&select=*
```

#### Criar ocorrência (dar pontos)
```
POST https://nnmrlucwrzoqkwzytbbl.supabase.co/rest/v1/occurrences

Body:
{
  "company_id": "UUID_EMPRESA",
  "employee_id": "UUID_FUNCIONARIO",
  "type": "pontualidade_positiva",
  "points": 10,
  "description": "Chegou no horário: 08:55 (Previsto: 09:00)"
}
```

#### Criar ocorrência negativa (tirar pontos)
```
POST https://nnmrlucwrzoqkwzytbbl.supabase.co/rest/v1/occurrences

Body:
{
  "company_id": "UUID_EMPRESA",
  "employee_id": "UUID_FUNCIONARIO",
  "type": "falta",
  "points": -10,
  "description": "Falta não justificada em 05/02/2025"
}
```

---

## 🔔 NOTIFICATIONS (Notificações)

### Estrutura

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `id` | uuid | Auto | ID único |
| `company_id` | uuid | ❌ | ID da empresa |
| `recipient_id` | uuid | ✅ | ID do destinatário (employee) |
| `sender_id` | uuid | ❌ | ID do remetente (employee) |
| `sender_name` | text | ❌ | Nome do remetente |
| `type` | enum | ✅ | Tipo da notificação |
| `title` | text | ✅ | Título |
| `message` | text | ✅ | Mensagem |
| `priority` | enum | ❌ | Prioridade: 'low', 'normal', 'high', 'urgent' |
| `status` | enum | ❌ | Status: 'pending', 'queued', 'sent', 'delivered', 'read', 'failed' |
| `channels` | text[] | ❌ | Canais: ['in_app', 'whatsapp'] |
| `recipient_phone` | text | ❌ | Telefone do destinatário |
| `related_entity_type` | text | ❌ | Tipo de entidade relacionada |
| `related_entity_id` | text | ❌ | ID da entidade relacionada |
| `scheduled_for` | timestamp | ❌ | Agendado para |
| `sent_at` | timestamp | ❌ | Enviado em |
| `read_at` | timestamp | ❌ | Lido em |
| `whatsapp_status` | text | ❌ | Status do WhatsApp |
| `whatsapp_message_id` | text | ❌ | ID da mensagem WhatsApp |
| `in_app_status` | text | ❌ | Status in-app |
| `created_at` | timestamp | Auto | Data de criação |

### Tipos de Notificação

- `task_assigned` - Tarefa atribuída
- `task_due_reminder` - Lembrete de vencimento
- `task_overdue` - Tarefa atrasada
- `task_completed` - Tarefa concluída
- `task_comment` - Comentário na tarefa
- `clock_reminder` - Lembrete de ponto
- `clock_anomaly` - Anomalia no ponto
- `justification_required` - Justificativa necessária
- `justification_response` - Resposta de justificativa
- `announcement` - Comunicado
- `gamification_badge` - Badge de gamificação

### Exemplos n8n

#### Listar notificações de um funcionário
```
GET https://nnmrlucwrzoqkwzytbbl.supabase.co/rest/v1/notifications?recipient_id=eq.UUID_FUNCIONARIO&order=created_at.desc&select=*
```

#### Criar notificação
```
POST https://nnmrlucwrzoqkwzytbbl.supabase.co/rest/v1/notifications

Body:
{
  "company_id": "UUID_EMPRESA",
  "recipient_id": "UUID_FUNCIONARIO",
  "type": "announcement",
  "title": "Reunião Importante",
  "message": "Reunião geral amanhã às 10h na sala de conferências.",
  "priority": "high",
  "channels": ["in_app", "whatsapp"],
  "recipient_phone": "5511999999999"
}
```

#### Marcar notificação como lida
```
PATCH https://nnmrlucwrzoqkwzytbbl.supabase.co/rest/v1/notifications?id=eq.UUID_NOTIFICACAO

Body:
{
  "status": "read",
  "read_at": "2025-02-05T10:30:00Z"
}
```

---

## ⏰ TIME_TRACKING_RECORDS (Registros de Ponto)

### Estrutura

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `id` | uuid | Auto | ID único |
| `company_id` | uuid | ✅ | ID da empresa |
| `employee_id` | uuid | ❌ | ID do funcionário |
| `external_employee_id` | text | ❌ | ID externo do funcionário |
| `record_date` | date | ✅ | Data do registro |
| `entry_1` | time | ❌ | Entrada 1 |
| `exit_1` | time | ❌ | Saída 1 |
| `entry_2` | time | ❌ | Entrada 2 |
| `exit_2` | time | ❌ | Saída 2 |
| `entry_3` | time | ❌ | Entrada 3 |
| `exit_3` | time | ❌ | Saída 3 |
| `entry_4` | time | ❌ | Entrada 4 |
| `exit_4` | time | ❌ | Saída 4 |
| `total_hours` | interval | ❌ | Total de horas |
| `overtime` | interval | ❌ | Horas extras |
| `status` | text | ❌ | Status: 'normal', 'delay', 'absence', etc |
| `anomalies` | text[] | ❌ | Lista de anomalias |
| `notes` | text | ❌ | Observações |
| `import_id` | uuid | ❌ | ID da importação |
| `raw_data` | jsonb | ❌ | Dados brutos |
| `created_at` | timestamp | Auto | Data de criação |
| `updated_at` | timestamp | Auto | Data de atualização |

### Exemplos n8n

#### Listar registros de ponto de um funcionário
```
GET https://nnmrlucwrzoqkwzytbbl.supabase.co/rest/v1/time_tracking_records?employee_id=eq.UUID_FUNCIONARIO&order=record_date.desc&select=*
```

#### Listar registros de uma data específica
```
GET https://nnmrlucwrzoqkwzytbbl.supabase.co/rest/v1/time_tracking_records?record_date=eq.2025-02-05&company_id=eq.UUID_EMPRESA&select=*
```

#### Criar registro de ponto
```
POST https://nnmrlucwrzoqkwzytbbl.supabase.co/rest/v1/time_tracking_records

Body:
{
  "company_id": "UUID_EMPRESA",
  "employee_id": "UUID_FUNCIONARIO",
  "record_date": "2025-02-05",
  "entry_1": "08:55:00",
  "exit_1": "12:00:00",
  "entry_2": "13:00:00",
  "exit_2": "18:05:00",
  "status": "normal"
}
```

#### Atualizar registro de ponto
```
PATCH https://nnmrlucwrzoqkwzytbbl.supabase.co/rest/v1/time_tracking_records?id=eq.UUID_REGISTRO

Body:
{
  "exit_2": "18:30:00",
  "notes": "Ficou até mais tarde para finalizar projeto"
}
```

---

## 📱 WHATSAPP_RESPONSES (Respostas WhatsApp)

### Estrutura

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `id` | uuid | Auto | ID único |
| `phone` | text | ✅ | Número do telefone |
| `response_type` | text | ✅ | Tipo da resposta |
| `response_value` | text | ❌ | Valor da resposta |
| `notification_id` | uuid | ❌ | ID da notificação relacionada |
| `employee_id` | uuid | ❌ | ID do funcionário |
| `message_id` | text | ❌ | ID da mensagem WhatsApp |
| `instance` | text | ❌ | Instância Evolution API |
| `push_name` | text | ❌ | Nome no WhatsApp |
| `raw_message` | jsonb | ❌ | Mensagem bruta |
| `processed` | boolean | ❌ | Processado |
| `processed_at` | timestamp | ❌ | Data de processamento |
| `created_at` | timestamp | Auto | Data de criação |

### Exemplos n8n

#### Listar respostas não processadas
```
GET https://nnmrlucwrzoqkwzytbbl.supabase.co/rest/v1/whatsapp_responses?processed=eq.false&select=*
```

#### Salvar resposta do WhatsApp
```
POST https://nnmrlucwrzoqkwzytbbl.supabase.co/rest/v1/whatsapp_responses

Body:
{
  "phone": "5511999999999",
  "response_type": "task_update",
  "response_value": "concluido",
  "notification_id": "UUID_NOTIFICACAO",
  "push_name": "João Silva",
  "raw_message": {"text": "Tarefa concluída!"}
}
```

#### Marcar resposta como processada
```
PATCH https://nnmrlucwrzoqkwzytbbl.supabase.co/rest/v1/whatsapp_responses?id=eq.UUID_RESPOSTA

Body:
{
  "processed": true,
  "processed_at": "2025-02-05T10:30:00Z"
}
```

---

## 👤 USER_ROLES (Papéis dos Usuários)

### Estrutura

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `id` | uuid | Auto | ID único |
| `user_id` | uuid | ✅ | ID do usuário auth |
| `role` | enum | ✅ | Papel: 'admin_master', 'admin', 'gestor', 'colaborador' |
| `company_id` | uuid | ❌ | ID da empresa |
| `created_at` | timestamp | Auto | Data de criação |

### Exemplos n8n

#### Buscar papel de um usuário
```
GET https://nnmrlucwrzoqkwzytbbl.supabase.co/rest/v1/user_roles?user_id=eq.UUID_USER&select=*
```

---

## 📁 ROUTINE_TEMPLATES (Templates de Rotina)

### Estrutura

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `id` | uuid | Auto | ID único |
| `company_id` | uuid | ✅ | ID da empresa |
| `name` | text | ✅ | Nome do template |
| `description` | text | ❌ | Descrição |
| `checklist_items` | jsonb | ❌ | Itens do checklist |
| `is_active` | boolean | ❌ | Ativo |
| `auto_assign` | boolean | ❌ | Auto-atribuir |
| `auto_assign_time` | time | ❌ | Horário de auto-atribuição |
| `created_by` | uuid | ❌ | ID do criador |
| `created_at` | timestamp | Auto | Data de criação |
| `updated_at` | timestamp | Auto | Data de atualização |

### Exemplos n8n

#### Listar templates de uma empresa
```
GET https://nnmrlucwrzoqkwzytbbl.supabase.co/rest/v1/routine_templates?company_id=eq.UUID_EMPRESA&is_active=eq.true&select=*
```

#### Criar template
```
POST https://nnmrlucwrzoqkwzytbbl.supabase.co/rest/v1/routine_templates

Body:
{
  "company_id": "UUID_EMPRESA",
  "name": "Checklist Abertura Loja",
  "description": "Rotina diária de abertura",
  "checklist_items": [
    {"text": "Ligar ar condicionado", "order": 1},
    {"text": "Verificar caixa", "order": 2},
    {"text": "Organizar vitrine", "order": 3}
  ],
  "auto_assign": true,
  "auto_assign_time": "08:00:00"
}
```

---

## 🔧 Operadores de Filtro

### Operadores Disponíveis

| Operador | Descrição | Exemplo |
|----------|-----------|---------|
| `eq` | Igual | `?status=eq.pendente` |
| `neq` | Diferente | `?status=neq.concluido` |
| `gt` | Maior que | `?points=gt.100` |
| `gte` | Maior ou igual | `?points=gte.100` |
| `lt` | Menor que | `?points=lt.0` |
| `lte` | Menor ou igual | `?points=lte.50` |
| `like` | Contém (case sensitive) | `?name=like.*Silva*` |
| `ilike` | Contém (case insensitive) | `?name=ilike.*silva*` |
| `is` | É (para null/boolean) | `?assignee_id=is.null` |
| `in` | Em lista | `?status=in.(pendente,andamento)` |
| `not` | Negação | `?status=not.eq.concluido` |

### Exemplos Avançados

#### Múltiplos filtros (AND)
```
GET /tasks?status=eq.pendente&priority=eq.alta&company_id=eq.UUID
```

#### Ordenação
```
GET /tasks?order=created_at.desc
GET /tasks?order=priority.asc,due_date.desc
```

#### Paginação
```
GET /tasks?limit=10&offset=0
GET /tasks?limit=10&offset=10  (página 2)
```

#### Selecionar campos específicos
```
GET /employees?select=id,name,email
```

#### Relacionamentos (JOIN)
```
GET /tasks?select=*,assignee:employees(id,name),comments:task_comments(*)
```

---

## 🔄 Funções RPC (Remote Procedure Calls)

### get_company_ranking
Retorna o ranking de pontos dos funcionários de uma empresa.

```
POST https://nnmrlucwrzoqkwzytbbl.supabase.co/rest/v1/rpc/get_company_ranking

Headers:
{
  "apikey": "SUA_KEY",
  "Authorization": "Bearer JWT_DO_USUARIO"
}

# Não precisa de body - usa o JWT para identificar a empresa
```

**Resposta:**
```json
[
  {"employee_id": "...", "name": "João Silva", "total_score": 150, "ranking": 1},
  {"employee_id": "...", "name": "Maria Santos", "total_score": 120, "ranking": 2}
]
```

---

## ⚡ Edge Functions (Webhooks)

Além da API REST, você pode chamar Edge Functions diretamente:

### Base URL
```
https://nnmrlucwrzoqkwzytbbl.supabase.co/functions/v1/
```

### Funções Disponíveis

| Função | Método | Descrição |
|--------|--------|-----------|
| `create-user` | POST | Criar usuário com auth |
| `reset-user-password` | POST | Resetar senha |
| `send-notification` | POST | Enviar notificação |
| `webhook-status` | POST | Atualizar status WhatsApp |
| `webhook-response` | POST | Processar resposta WhatsApp |
| `parse-time-document` | POST | Processar documento de ponto |
| `task-progress-summary` | GET | Resumo de progresso de tarefas |

### Exemplo: Criar Usuário
```
POST https://nnmrlucwrzoqkwzytbbl.supabase.co/functions/v1/create-user

Body:
{
  "email": "novo@usuario.com",
  "password": "senha123",
  "name": "Novo Usuário",
  "company_id": "UUID_EMPRESA",
  "role": "colaborador"
}
```

### Exemplo: Enviar Notificação
```
POST https://nnmrlucwrzoqkwzytbbl.supabase.co/functions/v1/send-notification

Body:
{
  "recipientId": "UUID_FUNCIONARIO",
  "type": "announcement",
  "title": "Aviso Importante",
  "message": "Conteúdo da mensagem",
  "channels": ["whatsapp", "in_app"]
}
```

---

## 📝 Configuração no n8n

### Nó HTTP Request - Configuração Base

1. **Method**: GET/POST/PATCH/DELETE
2. **URL**: `https://nnmrlucwrzoqkwzytbbl.supabase.co/rest/v1/{tabela}`
3. **Authentication**: None (usar Headers)
4. **Headers**:
   - `apikey`: Sua anon key ou service role key
   - `Authorization`: `Bearer {sua_key}`
   - `Content-Type`: `application/json`
   - `Prefer`: `return=representation` (para retornar dados após INSERT/UPDATE)

### Dica: Usar Service Role Key

Para operações que precisam bypassar RLS (como criar usuários ou manipular dados de outras empresas), use a **Service Role Key** no header Authorization.

⚠️ **CUIDADO**: A Service Role Key tem acesso total ao banco. Use com responsabilidade!

---

## 🎯 Workflows Comuns no n8n

### 1. Webhook → Criar Tarefa
```
Trigger: Webhook
↓
HTTP Request: POST /tasks
```

### 2. Mensagem WhatsApp → Atualizar Tarefa
```
Trigger: Webhook (Evolution API)
↓
HTTP Request: GET /employees?whatsapp_number=eq.{phone}
↓
HTTP Request: GET /tasks?assignee_id=eq.{employee_id}&status=neq.concluido
↓
HTTP Request: PATCH /tasks?id=eq.{task_id}
↓
HTTP Request: POST /whatsapp_responses
```

### 3. Ponto Registrado → Dar Pontos
```
Trigger: Webhook (sistema de ponto)
↓
HTTP Request: GET /employees?external_id=eq.{id_externo}
↓
Verificar horário
↓
HTTP Request: POST /occurrences
```

### 4. Tarefa Atrasada → Notificar Gestor
```
Trigger: Schedule (diário)
↓
HTTP Request: GET /tasks?status=eq.atrasada
↓
Loop
↓
HTTP Request: POST /notifications
```

---

## 📞 Suporte

Em caso de dúvidas sobre a API:
1. Consulte a documentação oficial do PostgREST: https://postgrest.org/en/stable/api.html
2. Verifique os logs no painel do Lovable Cloud
3. Teste as requisições no Postman/Insomnia antes de implementar no n8n

---

*Última atualização: 05/02/2025*
