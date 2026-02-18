# 📱 Documentação das Funcionalidades do OpsControl

## Índice

1. [Visão Geral](#visão-geral)
2. [Autenticação e Roles](#autenticação-e-roles)
3. [Painel Admin Master](#painel-admin-master)
4. [Painel Admin/Gestor](#painel-admingestor)
5. [App do Colaborador](#app-do-colaborador)

---

## Visão Geral

O OpsControl é um sistema de gestão operacional multi-tenant (multi-empresa) com três interfaces distintas baseadas no papel (role) do usuário:

| Interface | Roles | Rota | Descrição |
|-----------|-------|------|-----------|
| Admin Master | `admin_master` | `/admin-master` | Gestão de todas as empresas da plataforma |
| Painel Admin/Gestor | `admin`, `gestor` | `/` (Index) | Gestão operacional da empresa |
| App Colaborador | `colaborador` | `/app` | Interface mobile-first para colaboradores |

**URL de Produção:** https://opscontrol.lovable.app

---

## Autenticação e Roles

### Página: `/auth`

**Componentes:** `Auth.tsx`, `LoginForm.tsx`, `AuthContext.tsx`, `ProtectedRoute.tsx`

### Fluxo de Login

1. Usuário acessa `/auth` e insere email + senha
2. Sistema autentica via Supabase Auth (`signInWithPassword`)
3. Após autenticação, busca roles na tabela `user_roles`
4. Redireciona automaticamente:
   - `admin_master` → `/admin-master`
   - `admin` ou `gestor` → `/`
   - `colaborador` → `/app`
5. Se não possui roles → exibe mensagem de erro

### Roles do Sistema

| Role | Enum (`app_role`) | Permissões |
|------|-------------------|------------|
| `admin_master` | Super admin | Gerencia todas as empresas, cria admins/gestores |
| `admin` | Administrador | Gerencia empresa, colaboradores, tarefas, ponto |
| `gestor` | Gestor | Visualiza e gerencia tarefas, colaboradores |
| `colaborador` | Colaborador | Visualiza e atualiza suas próprias tarefas e perfil |

### Tabelas Envolvidas

- `user_roles`: Mapeia `user_id` (auth) → `role` + `company_id`
- `employees`: Dados do colaborador vinculado ao `user_id`

### Funções de Banco Auxiliares

- `is_admin_master(user_id)` → Verifica se é super admin
- `is_admin(user_uuid)` → Verifica se é admin
- `is_admin_or_gestor(user_uuid)` → Verifica se é admin ou gestor
- `get_user_role(user_uuid)` → Retorna a role do employee
- `get_user_company(user_id)` → Retorna o company_id
- `user_belongs_to_company(user_id, company_id)` → Verifica pertencimento
- `has_role(user_id, role)` → Verifica se possui determinada role

---

## Painel Admin Master

### Página: `/admin-master` → `AdminMaster.tsx`

**Acesso:** Apenas `admin_master`

### Funcionalidades

#### 1. Dashboard de Estatísticas
- Total de empresas ativas
- Total de colaboradores (todas as empresas)
- Alertas pendentes

#### 2. Gestão de Empresas (`CompanyList.tsx`, `CompanyForm.tsx`)
- **Listar** todas as empresas cadastradas
- **Criar** nova empresa (nome, CNPJ, nome fantasia, endereço, contato, logo)
- **Editar** dados de empresa existente
- **Ativar/Desativar** empresas

#### 3. Gestão de Usuários por Empresa (`AddAdminForm.tsx`)
- **Adicionar Admin** a uma empresa (chama edge function `create-user`)
- **Adicionar Gestor** a uma empresa (chama edge function `create-user`)

### Hooks Utilizados
- `useCompanies()` → Lista empresas
- `useCompanyStats()` → Estatísticas agregadas

---

## Painel Admin/Gestor

### Página: `/` → `Index.tsx`

**Acesso:** `admin` e `gestor`

### Módulos Disponíveis

#### 1. Dashboard (`Dashboard.tsx`)
- Visão geral com métricas da empresa
- Tarefas pendentes, atrasadas, concluídas
- Resumo de ponto
- Notificações recentes

#### 2. Tarefas (`TaskManagement.tsx`)
- **Criar tarefa**: título, descrição, responsável, prioridade (baixa/média/alta/urgente), prazo
- **Atribuir tarefa** a colaborador
- **Checklist** por tarefa (itens marcáveis)
- **Comentários** em tarefas
- **Status**: pendente → andamento → concluído / atrasada
- **Filtros**: por status, prioridade, responsável, data
- **Ordenação**: por prazo, prioridade, criação
- **Abas**: Minhas Tarefas, Equipe, Concluídas, Colaboradores, Templates, Solicitações
- **Extensão de prazo**: colaborador solicita, gestor aprova/rejeita
- **Rotinas diárias** via Templates (`RoutineTemplatesTab.tsx`)
  - Criar template com checklist
  - Atribuir a colaboradores
  - Auto-assign por horário
- **Gamificação automática**:
  - +10 pontos ao concluir no prazo (trigger `auto_generate_points_on_task_completion`)
  - -5 pontos ao concluir atrasado
  - -10 pontos ao entrar em status "atrasada" (trigger `auto_penalize_on_task_overdue`)

#### 3. Gestão de Colaboradores (`EmployeeManagement.tsx`)
- Listar colaboradores da empresa
- Adicionar colaborador (chama edge function `create-user`)
- Editar dados (nome, email, departamento, role, horário, WhatsApp)
- Redefinir senha (chama edge function `reset-user-password`)
- Atualizar email (chama edge function `update-user-email`)
- Ativar/desativar colaborador
- Configurações de notificação por colaborador

#### 4. App Colaborador - Visão Admin (`CollaboratorAppAdmin.tsx`)
- Simulação da interface que o colaborador vê
- Permite ao admin visualizar a experiência do colaborador

#### 5. Controle de Ponto (`TimeTracking.tsx`)
- **Importar registros** de ponto via arquivos (Excel, CSV, PDF, REP)
  - Wizard de importação (`ImportWizard.tsx`)
  - Parsers: `csvParser.ts`, `excelParser.ts`, `pdfParser.ts`, `repParser.ts`
  - Parse via IA (edge function `parse-time-document`)
- **Visualizar** registros de ponto por período
- **Mapeamento de colunas** personalizável por empresa
- **Detecção de anomalias** (faltas, atrasos)
- **Gamificação de pontualidade**:
  - +10 pontos por chegar no horário (trigger `auto_generate_points_on_time_record`)

#### 6. Absenteísmo (`Absenteeism.tsx`)
- Importar relatórios de absenteísmo
- Visualizar taxas por colaborador
- Horas previstas vs trabalhadas vs bônus

#### 7. Gamificação (`Gamification.tsx`)
- Ranking dos colaboradores por pontos
- Visualizar histórico de pontuações
- Pontos por tipo de ocorrência
- Função `get_company_ranking()` para ranking

#### 8. Ocorrências (`Occurrences.tsx`)
- Registrar ocorrências (positivas e negativas)
- Tipos: pontualidade, atraso, tarefa concluída, falta, etc.
- Cada ocorrência tem pontuação que afeta gamificação
- Trigger `calculate_employee_points` recalcula automaticamente

#### 9. Regras e Diretrizes (`RulesAndGuidelines.tsx`)
- Upload de documentos/regras da empresa
- Armazenamento via Supabase Storage (bucket `documents`)
- Visualização por colaboradores

#### 10. Relatórios (`Reports.tsx`)
- Relatórios consolidados de ponto, tarefas, ocorrências
- Exportação em PDF (jsPDF + jspdf-autotable)
- Filtros por período e colaborador

---

## App do Colaborador

### Página: `/app` → `CollaboratorMobileApp.tsx`

**Acesso:** `colaborador`
**Design:** Mobile-first

### Telas

#### 1. Home
- Boas-vindas com nome e data
- Ponto de hoje (4 batidas)
- Estatísticas rápidas:
  - Presença mensal (%)
  - Dias consecutivos (streak)
- Resumo de tarefas (rotinas vs extras)
- Notificações recentes

#### 2. Tarefas (`CollaboratorTasks.tsx`)
- Ver tarefas atribuídas (rotinas diárias + extras)
- Iniciar/concluir tarefas
- Marcar itens de checklist
- Solicitar extensão de prazo
- Hook: `useCollaboratorTasks.ts`

#### 3. Ponto (`CollaboratorTime.tsx`)
- Visualizar registros de ponto do mês
- Status por dia (normal, atraso, falta)

#### 4. Pontos/Ocorrências (`CollaboratorOccurrences.tsx`)
- Ver histórico de pontos ganhos/perdidos
- Tipos de ocorrência

#### 5. Perfil (`CollaboratorProfile.tsx`)
- Dados pessoais
- Configurações de notificação
- WhatsApp vinculado

---

## Navegação e Rotas

```
/auth           → Página de login
/               → Painel Admin/Gestor (protegido)
/admin-master   → Painel Admin Master (protegido)
/app            → App do Colaborador (protegido)
*               → Página 404
```

**ProtectedRoute.tsx**: HOC que verifica autenticação e redireciona para `/auth` se não autenticado.
