# 🗄️ Documentação do Banco de Dados

## Índice

1. [Diagrama ER](#diagrama-er)
2. [Tabelas](#tabelas)
3. [Enums](#enums)
4. [Funções (Functions)](#funções)
5. [Triggers](#triggers)
6. [Políticas RLS](#políticas-rls)
7. [Storage](#storage)

---

## Diagrama ER (Simplificado)

```
companies (1) ─────── (N) employees
    │                      │
    │                      ├──── (N) tasks (assignee_id, created_by)
    │                      ├──── (N) occurrences
    │                      ├──── (N) notifications (recipient_id, sender_id)
    │                      ├──── (N) task_comments
    │                      ├──── (N) task_progress_logs
    │                      └──── (N) whatsapp_responses
    │
    ├──── (N) user_roles
    ├──── (N) time_tracking_records
    ├──── (N) time_tracking_imports
    ├──── (N) api_integrations
    ├──── (N) column_mappings
    ├──── (N) company_rules
    ├──── (N) routine_templates
    ├──── (N) absenteeism_reports ──── (N) absenteeism_records
    └──── (N) notification_queue ──── notifications

tasks (1) ──── (N) task_checklist_items
tasks (1) ──── (N) task_comments
tasks (1) ──── (N) task_progress_logs

routine_templates (1) ──── (N) routine_template_assignments ──── employees
```

---

## Tabelas

### 1. `companies`
Empresas cadastradas na plataforma.

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | uuid | Não | `gen_random_uuid()` | PK |
| `name` | text | Não | - | Razão social |
| `trade_name` | text | Sim | - | Nome fantasia |
| `cnpj` | text | Sim | - | CNPJ |
| `address` | text | Sim | - | Endereço |
| `city` | text | Sim | - | Cidade |
| `state` | text | Sim | - | Estado |
| `zip_code` | text | Sim | - | CEP |
| `phone` | text | Sim | - | Telefone |
| `email` | text | Sim | - | Email |
| `logo_url` | text | Sim | - | URL do logo |
| `is_active` | bool | Não | `true` | Empresa ativa |
| `settings` | jsonb | Sim | `{}` | Configurações customizadas |
| `created_at` | timestamptz | Não | `now()` | Criação |
| `updated_at` | timestamptz | Não | `now()` | Atualização |

---

### 2. `employees`
Colaboradores de cada empresa.

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | uuid | Não | `gen_random_uuid()` | PK |
| `user_id` | uuid | Sim | - | FK para auth.users |
| `company_id` | uuid | Sim | - | FK → companies |
| `name` | text | Não | - | Nome completo |
| `email` | text | Não | - | Email |
| `department` | text | Não | `'Geral'` | Departamento |
| `role` | employee_role | Não | `'colaborador'` | Papel (colaborador/gestor/admin) |
| `is_active` | bool | Não | `true` | Ativo |
| `points` | int | Sim | `0` | Pontuação gamificação |
| `daily_work_hours` | numeric | Sim | `8` | Horas diárias |
| `work_schedule_start` | text | Sim | `'09:00'` | Início do expediente |
| `whatsapp_number` | text | Sim | - | Número WhatsApp |
| `whatsapp_verified` | bool | Sim | `false` | WhatsApp verificado |
| `notify_whatsapp` | bool | Sim | `true` | Notificar via WhatsApp |
| `notify_in_app` | bool | Sim | `true` | Notificar in-app |
| `notify_tasks` | bool | Sim | `true` | Notificações de tarefas |
| `notify_time_tracking` | bool | Sim | `true` | Notificações de ponto |
| `notify_reminders` | bool | Sim | `true` | Lembretes |
| `notify_announcements` | bool | Sim | `true` | Comunicados |
| `quiet_hours_start` | time | Sim | - | Início do silêncio |
| `quiet_hours_end` | time | Sim | - | Fim do silêncio |
| `external_id` | text | Sim | - | ID externo (sistemas de ponto) |
| `whatsapp_profile_pic` | text | Sim | - | Foto do perfil WhatsApp |
| `whatsapp_last_seen` | timestamptz | Sim | - | Último acesso WhatsApp |

---

### 3. `user_roles`
Mapeamento de roles do sistema por usuário.

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | uuid | Não | `gen_random_uuid()` | PK |
| `user_id` | uuid | Não | - | ID do auth.users |
| `role` | app_role | Não | - | admin_master/admin/gestor/colaborador |
| `company_id` | uuid | Sim | - | FK → companies (null para admin_master) |
| `created_at` | timestamptz | Não | `now()` | Criação |

---

### 4. `tasks`
Tarefas atribuídas a colaboradores.

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | uuid | Não | `gen_random_uuid()` | PK |
| `company_id` | uuid | Não | - | FK → companies |
| `title` | text | Não | - | Título |
| `description` | text | Sim | - | Descrição |
| `assignee_id` | uuid | Sim | - | FK → employees (responsável) |
| `created_by` | uuid | Sim | - | FK → employees (criador) |
| `priority` | text | Não | `'média'` | baixa/média/alta/urgente |
| `status` | text | Não | `'pendente'` | pendente/andamento/concluido/atrasada |
| `due_date` | timestamptz | Sim | - | Prazo |
| `progress` | int | Não | `0` | Progresso (0-100) |
| `is_daily_routine` | bool | Não | `false` | É rotina diária |
| `extension_status` | text | Sim | `'none'` | none/pending/approved/rejected |
| `overdue_notified_at` | timestamptz | Sim | - | Quando notificou atraso |

---

### 5. `task_checklist_items`
Itens de checklist por tarefa.

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | uuid | Não | `gen_random_uuid()` | PK |
| `task_id` | uuid | Não | - | FK → tasks |
| `text` | text | Não | - | Texto do item |
| `completed` | bool | Não | `false` | Marcado |
| `sort_order` | int | Não | `0` | Ordem |

---

### 6. `task_comments`
Comentários em tarefas.

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | uuid | Não | `gen_random_uuid()` | PK |
| `task_id` | uuid | Não | - | FK → tasks |
| `employee_id` | uuid | Não | - | FK → employees |
| `content` | text | Não | - | Conteúdo |
| `created_at` | timestamptz | Não | `now()` | Criação |

---

### 7. `task_progress_logs`
Log de ações de progresso em tarefas (para resumos aos gestores).

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | uuid | Não | `gen_random_uuid()` | PK |
| `task_id` | uuid | Não | - | FK → tasks |
| `employee_id` | uuid | Não | - | FK → employees |
| `action_type` | text | Não | - | task_started/task_completed/checklist_completed |
| `checklist_item_id` | uuid | Sim | - | Item do checklist |
| `checklist_item_text` | text | Sim | - | Texto do item |

---

### 8. `notifications`
Notificações enviadas (in-app e WhatsApp).

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | uuid | Não | `gen_random_uuid()` | PK |
| `type` | notification_type | Não | - | Tipo (enum) |
| `title` | text | Não | - | Título |
| `message` | text | Não | - | Mensagem |
| `recipient_id` | uuid | Não | - | FK → employees |
| `sender_id` | uuid | Sim | - | FK → employees |
| `sender_name` | text | Sim | - | Nome do remetente |
| `company_id` | uuid | Sim | - | FK → companies |
| `priority` | notification_priority | Sim | `'normal'` | Prioridade |
| `status` | notification_status | Sim | `'pending'` | Status geral |
| `channels` | text[] | Sim | `{'in_app'}` | Canais |
| `recipient_phone` | text | Sim | - | Telefone |
| `whatsapp_status` | text | Sim | - | Status WhatsApp |
| `whatsapp_message_id` | text | Sim | - | ID mensagem Evolution |
| `whatsapp_instance` | text | Sim | - | Instância Evolution |
| `whatsapp_sent_at` | timestamptz | Sim | - | Enviado WhatsApp |
| `whatsapp_delivered_at` | timestamptz | Sim | - | Entregue WhatsApp |
| `whatsapp_read_at` | timestamptz | Sim | - | Lido WhatsApp |
| `whatsapp_error` | text | Sim | - | Erro WhatsApp |
| `in_app_status` | text | Sim | `'pending'` | Status in-app |
| `in_app_delivered_at` | timestamptz | Sim | - | Entregue in-app |
| `in_app_read_at` | timestamptz | Sim | - | Lido in-app |
| `related_entity_type` | text | Sim | - | Tipo da entidade |
| `related_entity_id` | text | Sim | - | ID da entidade |
| `scheduled_for` | timestamptz | Sim | - | Agendado para |
| `sent_at` | timestamptz | Sim | - | Enviado em |
| `read_at` | timestamptz | Sim | - | Lido em |

---

### 9. `notification_queue`
Fila de processamento de notificações WhatsApp.

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | uuid | Não | `gen_random_uuid()` | PK |
| `notification_id` | uuid | Não | - | FK → notifications |
| `webhook_url` | text | Não | - | URL do webhook |
| `payload` | jsonb | Não | - | Dados da notificação |
| `status` | queue_status | Sim | `'queued'` | queued/processing/completed/failed |
| `attempts` | int | Sim | `0` | Tentativas |
| `max_attempts` | int | Sim | `3` | Máximo tentativas |
| `next_retry_at` | timestamptz | Sim | - | Próxima tentativa |
| `response_success` | bool | Sim | - | Sucesso da resposta |
| `response_message_id` | text | Sim | - | ID da mensagem |
| `response_error` | text | Sim | - | Erro |

---

### 10. `whatsapp_responses`
Respostas recebidas via WhatsApp.

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | uuid | Não | `gen_random_uuid()` | PK |
| `phone` | text | Não | - | Telefone remetente |
| `push_name` | text | Sim | - | Nome WhatsApp |
| `message_id` | text | Sim | - | ID mensagem WhatsApp |
| `instance` | text | Sim | - | Instância Evolution |
| `response_type` | text | Não | - | text/button/audio |
| `response_value` | text | Sim | - | Valor da resposta |
| `raw_message` | jsonb | Sim | - | Mensagem bruta |
| `employee_id` | uuid | Sim | - | FK → employees |
| `notification_id` | uuid | Sim | - | FK → notifications |
| `processed` | bool | Sim | `false` | Processado |
| `processed_at` | timestamptz | Sim | - | Processado em |

---

### 11. `occurrences`
Ocorrências (positivas e negativas) que geram pontos.

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | uuid | Não | `gen_random_uuid()` | PK |
| `company_id` | uuid | Não | - | FK → companies |
| `employee_id` | uuid | Não | - | FK → employees |
| `type` | text | Não | - | Tipo da ocorrência |
| `points` | int | Não | - | Pontos (+/-) |
| `description` | text | Sim | - | Descrição |
| `created_by` | uuid | Sim | - | Quem registrou |

**Tipos Comuns:**
| Tipo | Pontos | Descrição |
|------|--------|-----------|
| `pontualidade_positiva` | +10 | Chegou no horário |
| `aprovacao_tarefa` | +10 | Tarefa concluída no prazo |
| `atraso_tarefa` | -5 | Tarefa concluída com atraso |
| `tarefa_atrasada` | -10 | Tarefa entrou em atraso |

---

### 12. `time_tracking_records`
Registros de ponto diários.

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | uuid | Não | `gen_random_uuid()` | PK |
| `company_id` | uuid | Não | - | FK → companies |
| `employee_id` | uuid | Sim | - | FK → employees |
| `external_employee_id` | text | Sim | - | ID externo |
| `record_date` | date | Não | - | Data |
| `entry_1` - `entry_4` | time | Sim | - | Entradas |
| `exit_1` - `exit_4` | time | Sim | - | Saídas |
| `total_hours` | interval | Sim | - | Total horas |
| `overtime` | interval | Sim | - | Horas extras |
| `status` | text | Sim | `'normal'` | Status |
| `anomalies` | text[] | Sim | - | Anomalias detectadas |
| `notes` | text | Sim | - | Observações |
| `import_id` | uuid | Sim | - | FK → time_tracking_imports |
| `raw_data` | jsonb | Sim | - | Dados brutos |

---

### 13. `time_tracking_imports`
Importações de registros de ponto.

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | uuid | Não | `gen_random_uuid()` | PK |
| `company_id` | uuid | Não | - | FK → companies |
| `source_type` | text | Não | - | csv/xlsx/pdf/rep |
| `source_name` | text | Sim | - | Nome do arquivo |
| `file_url` | text | Sim | - | URL do arquivo |
| `status` | text | Não | `'pending'` | Status |
| `total_records` | int | Sim | `0` | Total registros |
| `imported_records` | int | Sim | `0` | Importados |
| `failed_records` | int | Sim | `0` | Falhas |
| `error_log` | jsonb | Sim | `[]` | Log de erros |
| `column_mapping` | jsonb | Sim | - | Mapeamento de colunas |
| `period_start` | date | Sim | - | Início período |
| `period_end` | date | Sim | - | Fim período |
| `imported_by` | uuid | Sim | - | Quem importou |

---

### 14. `routine_templates`
Templates de rotinas diárias.

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | uuid | Não | `gen_random_uuid()` | PK |
| `company_id` | uuid | Não | - | FK → companies |
| `name` | text | Não | - | Nome do template |
| `description` | text | Sim | - | Descrição |
| `checklist_items` | jsonb | Não | `[]` | Itens do checklist |
| `is_active` | bool | Não | `true` | Ativo |
| `auto_assign` | bool | Não | `false` | Auto-atribuir |
| `auto_assign_time` | time | Sim | - | Horário auto-assign |
| `created_by` | uuid | Sim | - | FK → employees |

### 15. `routine_template_assignments`
Atribuição de templates a colaboradores.

### 16. `api_integrations`
Integrações com APIs externas (Tangerino, Pontomais, etc.).

### 17. `column_mappings`
Mapeamento de colunas para importação de dados.

### 18. `company_rules`
Documentos/regras da empresa.

### 19. `absenteeism_reports` / `absenteeism_records`
Relatórios de absenteísmo importados.

---

## Enums

```sql
-- Roles do sistema
CREATE TYPE app_role AS ENUM ('admin_master', 'admin', 'gestor', 'colaborador');

-- Role do employee
CREATE TYPE employee_role AS ENUM ('colaborador', 'gestor', 'admin');

-- Prioridade de notificação
CREATE TYPE notification_priority AS ENUM ('low', 'normal', 'high', 'urgent');

-- Status de notificação
CREATE TYPE notification_status AS ENUM ('pending', 'queued', 'sent', 'delivered', 'read', 'failed');

-- Tipo de notificação
CREATE TYPE notification_type AS ENUM (
  'task_assigned', 'task_due_reminder', 'task_overdue', 'task_completed',
  'task_comment', 'clock_reminder', 'clock_anomaly',
  'justification_required', 'justification_response',
  'announcement', 'gamification_badge'
);

-- Status da fila
CREATE TYPE queue_status AS ENUM ('queued', 'processing', 'completed', 'failed');
```

---

## Funções

### Funções de Verificação de Permissão

| Função | Retorno | Descrição |
|--------|---------|-----------|
| `is_admin_master(user_id)` | bool | É super admin? |
| `is_admin(user_uuid)` | bool | É admin? |
| `is_admin_or_gestor(user_uuid)` | bool | É admin ou gestor? |
| `get_user_role(user_uuid)` | employee_role | Role do employee |
| `get_user_company(user_id)` | uuid | Company ID do usuário |
| `user_belongs_to_company(user_id, company_id)` | bool | Pertence à empresa? (admin_master = true sempre) |
| `has_role(user_id, role)` | bool | Possui a role especificada? |

### Funções de Dados

| Função | Retorno | Descrição |
|--------|---------|-----------|
| `get_company_ranking()` | TABLE | Ranking de gamificação da empresa |
| `calculate_employee_points()` | trigger | Recalcula pontos do employee |
| `update_updated_at_column()` | trigger | Atualiza `updated_at` automaticamente |

### Funções de Gamificação (Triggers)

| Função | Evento | Descrição |
|--------|--------|-----------|
| `auto_generate_points_on_task_completion()` | UPDATE em tasks | +10 no prazo, -5 atrasado |
| `auto_penalize_on_task_overdue()` | UPDATE em tasks | -10 quando status → atrasada |
| `auto_generate_points_on_time_record()` | UPDATE em time_tracking_records | +10 por pontualidade |

---

## Triggers

| Trigger | Tabela | Evento | Função |
|---------|--------|--------|--------|
| `calculate_employee_points` | occurrences | INSERT/UPDATE/DELETE | `calculate_employee_points()` |
| `auto_generate_points_on_task_completion` | tasks | UPDATE | `auto_generate_points_on_task_completion()` |
| `auto_penalize_on_task_overdue` | tasks | UPDATE | `auto_penalize_on_task_overdue()` |
| `auto_generate_points_on_time_record` | time_tracking_records | UPDATE | `auto_generate_points_on_time_record()` |
| `update_*_updated_at` | Várias | UPDATE | `update_updated_at_column()` |

---

## Políticas RLS (Resumo)

Todas as tabelas possuem RLS habilitado. Padrão geral:

| Tabela | SELECT | INSERT | UPDATE | DELETE |
|--------|--------|--------|--------|--------|
| companies | Membros veem sua empresa; admin_master vê todas | admin_master | admin_master | admin_master |
| employees | Próprio perfil + gestores da empresa | Admins da empresa + anon (dev) | Próprio + admins | Admins + anon (dev) |
| user_roles | Próprio | - | - | - |
| tasks | Membros da empresa | Admins/gestores + colaboradores (próprias) | Admins/gestores + responsável | Admins/gestores |
| task_checklist_items | Membros da empresa | Admins/gestores + responsável | Admins/gestores + responsável | Admins/gestores + responsável |
| task_comments | Membros da empresa | Membros da empresa | - | - |
| task_progress_logs | Gestores da empresa | Próprio employee | - | - |
| notifications | Próprio + gestores da empresa | Membros da empresa | Próprio (status) | - |
| notification_queue | service_role | service_role | service_role | service_role |
| whatsapp_responses | Autenticados | service_role | - | - |
| occurrences | Membros da empresa | Admins/gestores | - | - |
| time_tracking_records | Membros da empresa | Admins/gestores | Admins/gestores | Admins/gestores |
| time_tracking_imports | Admins/gestores | Admins/gestores | Admins/gestores | Admins/gestores |
| company_rules | Membros da empresa | Admins/gestores | - | - |
| routine_templates | Membros da empresa | Admins/gestores | Admins/gestores | Admins/gestores |

---

## Storage

### Bucket: `documents`
- **Público:** Sim
- **Uso:** Upload de regras e diretrizes da empresa
- **Acessado por:** `RulesAndGuidelines.tsx`
