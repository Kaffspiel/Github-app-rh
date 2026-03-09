
# Plano de Implementacao - OpsControl Multi-Empresa

## Resumo Executivo

Este plano detalha a implementacao completa do sistema OpsControl com suporte multi-empresa, importacao de ponto e app mobile separado para colaboradores.

---

## Fase 1: Autenticacao e Controle de Acesso (Prioridade Alta)

### 1.1 Pagina de Login/Cadastro
- Criar `/auth` com formularios de login e signup
- Validacao de email/senha com Zod
- Redirecionamento automatico baseado em role apos login
- Tratamento de erros amigavel

### 1.2 Hook de Autenticacao
- `useAuth.ts` - gerencia sessao, usuario logado e role atual
- Verificacao de role via `user_roles` table
- Funcoes: `signIn`, `signUp`, `signOut`, `getCurrentRole`

### 1.3 Roteamento Protegido
- Componente `ProtectedRoute` que valida autenticacao
- Redirecionamento automatico:
  - `admin_master` → `/admin-master`
  - `admin/gestor` → `/` (dashboard empresa)
  - `colaborador` → `/app` (mobile app)

### 1.4 Setup Inicial Admin Master
- Primeira execucao: criar usuario admin_master inicial
- Tela de onboarding se nao existir admin_master

---

## Fase 2: Dashboard Admin Master

### 2.1 Nova Pagina `/admin-master`
- Layout exclusivo para gestao da plataforma
- Sidebar diferenciada (roxo/escuro)

### 2.2 Gestao de Empresas
- Listagem de todas as empresas cadastradas
- Formulario de nova empresa (nome, CNPJ, endereco)
- Editar/desativar empresas
- Cadastro do primeiro admin junto com a empresa

### 2.3 Visao Geral
- Cards com metricas globais:
  - Total de empresas ativas
  - Total de colaboradores
  - Alertas de sistema

---

## Fase 3: Adaptacao Dashboard Empresa

### 3.1 Context Multi-Tenant
- `CompanyContext.tsx` - armazena empresa atual do usuario logado
- Todas as queries filtradas por `company_id`

### 3.2 Atualizar EmployeeManagement
- Filtrar colaboradores por `company_id`
- Insert/update incluindo `company_id`
- Opcao de vincular `user_id` ao colaborador (para acesso ao app)

### 3.3 Navegacao Atualizada
- Mostrar nome da empresa no sidebar
- Remover opcoes de admin_master para admins de empresa

---

## Fase 4: Sistema de Importacao de Ponto

### 4.1 Parsers de Arquivo
Criar servicos em `src/services/timeImport/`:

```text
src/services/timeImport/
├── excelParser.ts    // Parse .xlsx com biblioteca xlsx
├── csvParser.ts      // Parse CSV nativo
├── repParser.ts      // Parse AFD (Registrador Eletronico)
└── index.ts          // Export unificado
```

Cada parser retorna formato padronizado:
```typescript
interface ParsedRecord {
  externalEmployeeId: string;
  employeeName?: string;
  date: string;
  punches: string[];
}
```

### 4.2 Interface de Importacao
Nova aba em TimeTracking:
1. **Upload de arquivo** - drag & drop ou selecao
2. **Selecao de formato** - Excel, CSV, REP
3. **Mapeamento de colunas** - interface visual para mapear campos
4. **Preview** - tabela mostrando dados antes de importar
5. **Validacao** - erros destacados (funcionario nao encontrado, etc)
6. **Confirmacao** - botao para importar definitivamente

### 4.3 Mapeamento Dinamico
- Usar tabela `column_mappings` para salvar configuracoes
- Opcao de "Salvar como padrao" para reutilizar
- Campos obrigatorios: ID funcionario, data, batidas

### 4.4 Historico de Importacoes
- Listagem de importacoes anteriores (`time_tracking_imports`)
- Status: sucesso, parcial, erro
- Detalhes: quantos registros, erros encontrados

---

## Fase 5: Integracao com APIs de Ponto

### 5.1 Configuracao de Integracao
Nova pagina/modal de configuracao:
- Selecao de provedor (Tangerino, Pontomais, Custom)
- Campos dinamicos por provedor:
  - URL base
  - Tipo de autenticacao (API Key, OAuth)
  - Credenciais (armazenadas via Supabase Vault ref)
  - Frequencia de sync

### 5.2 Servico de Sync
Edge function `sync-time-tracking`:
- Recebe `integration_id` e `company_id`
- Busca configuracao da integracao
- Chama API externa
- Transforma dados usando `column_mappings`
- Insere em `time_tracking_records`

### 5.3 Provedores Pre-configurados

**Tangerino:**
- Endpoint: `/api/v1/clockings`
- Auth: API Key header
- Mapeamento padrao incluso

**Pontomais:**
- Endpoint: `/api/time_cards`
- Auth: Bearer token
- Mapeamento padrao incluso

**Custom/Webhook:**
- URL configuravel
- Headers customizados
- Mapeamento manual obrigatorio

---

## Fase 6: App Mobile Colaborador

### 6.1 Roteamento Separado
```text
/app              → Home colaborador
/app/tasks        → Minhas tarefas
/app/time         → Meu ponto (historico)
/app/profile      → Perfil e preferencias
```

### 6.2 Layout Mobile-First
- Bottom navigation bar
- Header com nome do usuario e empresa
- Pull-to-refresh nas listagens

### 6.3 Funcionalidades
- **Home**: resumo do dia (tarefas pendentes, ponto de hoje)
- **Tarefas**: ver e atualizar status das tarefas atribuidas
- **Ponto**: historico pessoal, alertas de batida ausente
- **Perfil**: configuracoes de notificacao, alterar senha

### 6.4 PWA Setup
- Manifest.json para instalacao
- Service worker para offline
- Push notifications (futuro)

---

## Fase 7: Vinculacao Colaborador-Usuario

### 7.1 Fluxo de Onboarding
1. Gestor cadastra colaborador com email
2. Sistema envia convite (email ou WhatsApp)
3. Colaborador acessa link, cria senha
4. Sistema vincula `user_id` ao `employee.user_id`
5. Role `colaborador` inserido em `user_roles`

### 7.2 Auto-vinculacao
- No signup, verificar se email existe em `employees`
- Se existir sem `user_id`, vincular automaticamente

---

## Estrutura de Arquivos Final

```text
src/
├── apps/
│   ├── admin-master/
│   │   ├── AdminMasterLayout.tsx
│   │   ├── CompanyList.tsx
│   │   ├── CompanyForm.tsx
│   │   └── GlobalOverview.tsx
│   ├── company/
│   │   ├── CompanyLayout.tsx      // Layout atual adaptado
│   │   └── ... (componentes existentes)
│   └── collaborator/
│       ├── CollaboratorLayout.tsx
│       ├── CollaboratorHome.tsx
│       ├── CollaboratorTasks.tsx
│       ├── CollaboratorTime.tsx
│       └── CollaboratorProfile.tsx
├── components/
│   ├── auth/
│   │   ├── AuthPage.tsx
│   │   ├── LoginForm.tsx
│   │   ├── SignupForm.tsx
│   │   └── ProtectedRoute.tsx
│   ├── time-tracking/
│   │   ├── ImportWizard.tsx
│   │   ├── ColumnMapper.tsx
│   │   ├── ImportPreview.tsx
│   │   ├── IntegrationConfig.tsx
│   │   └── ImportHistory.tsx
│   └── shared/
│       └── ... (componentes reutilizaveis)
├── context/
│   ├── AuthContext.tsx
│   ├── CompanyContext.tsx
│   └── AppContext.tsx (existente)
├── hooks/
│   ├── useAuth.ts
│   ├── useCompany.ts
│   └── useTimeImport.ts
├── services/
│   ├── timeImport/
│   │   ├── excelParser.ts
│   │   ├── csvParser.ts
│   │   ├── repParser.ts
│   │   └── index.ts
│   └── notificationService.ts (existente)
└── pages/
    ├── Index.tsx          // Roteador principal
    ├── Auth.tsx           // Login/Signup
    ├── AdminMaster.tsx    // Dashboard admin master
    └── CollaboratorApp.tsx // App mobile
```

---

## Dependencias a Instalar

| Pacote | Versao | Uso |
|--------|--------|-----|
| xlsx | ^0.18 | Parser Excel |
| papaparse | ^5.4 | Parser CSV robusto |

---

## Ordem de Implementacao Sugerida

```text
Semana 1: Autenticacao
├── 1. AuthContext + useAuth
├── 2. Pagina /auth (login/signup)
├── 3. ProtectedRoute
└── 4. Roteamento por role

Semana 2: Admin Master
├── 5. Layout AdminMaster
├── 6. CRUD Empresas
└── 7. Criar admin por empresa

Semana 3: Multi-tenant
├── 8. CompanyContext
├── 9. Adaptar EmployeeManagement
└── 10. Filtros por company_id

Semana 4: Importacao de Ponto
├── 11. Parsers (Excel, CSV, REP)
├── 12. Interface de importacao
├── 13. Mapeamento dinamico
└── 14. Historico de importacoes

Semana 5: APIs de Ponto
├── 15. Config de integracao
├── 16. Edge function sync
├── 17. Tangerino/Pontomais
└── 18. Sync manual/automatico

Semana 6: App Colaborador
├── 19. Layout mobile
├── 20. Rotas /app/*
├── 21. Funcionalidades basicas
└── 22. PWA setup
```

---

## Secao Tecnica

### Migracao Necessaria
Adicionar `company_id` e `external_id` na tabela `employees` (se ainda nao existir) - verificar se a migration anterior ja incluiu.

### RLS Policies
Apos autenticacao implementada, substituir politicas temporarias por:
```sql
CREATE POLICY "Users can view own company employees"
ON employees FOR SELECT
USING (
  company_id = get_user_company(auth.uid())
  OR is_admin_master(auth.uid())
);
```

### Edge Functions Necessarias
1. `sync-time-tracking` - sincroniza dados de APIs externas
2. `invite-employee` - envia convite por email/WhatsApp

### Tipos TypeScript
Atualizar types apos migrations para incluir novas tabelas:
- `Companies`
- `UserRoles`
- `TimeTrackingRecords`
- `TimeTrackingImports`
- `ApiIntegrations`
- `ColumnMappings`

---

## Proximos Passos

Apos aprovacao deste plano:
1. Implementar sistema de autenticacao (Fase 1)
2. Testar fluxo de login/logout
3. Prosseguir para Dashboard Admin Master
