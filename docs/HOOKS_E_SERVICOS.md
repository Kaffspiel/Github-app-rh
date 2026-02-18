# 🔧 Documentação de Hooks e Serviços

## Custom Hooks

### `useAuth()` — `src/context/AuthContext.tsx`
Gerencia autenticação e roles do usuário.

**Retorna:**
| Propriedade | Tipo | Descrição |
|-------------|------|-----------|
| `user` | User \| null | Usuário autenticado |
| `session` | Session \| null | Sessão atual |
| `userRoles` | UserRole[] | Roles do usuário |
| `currentRole` | AppRole \| null | Role principal |
| `currentCompanyId` | string \| null | Empresa atual |
| `isLoading` | boolean | Carregando |
| `signIn(email, pwd)` | function | Login |
| `signUp(email, pwd)` | function | Cadastro |
| `signOut()` | function | Logout |
| `isAdminMaster()` | function | É super admin? |
| `isAdmin()` | function | É admin? |
| `isGestor()` | function | É gestor? |
| `isColaborador()` | function | É colaborador? |

---

### `useApp()` — `src/context/AppContext.tsx`
Estado global da aplicação (views, filtros).

**Retorna:**
| Propriedade | Tipo | Descrição |
|-------------|------|-----------|
| `currentView` | View | Tela atual no painel admin |
| `setCurrentView` | function | Mudar tela |
| `taskFilter` | string | Filtro de tarefas |
| `setTaskFilter` | function | Alterar filtro |
| `tasks` / `timeRecords` | arrays | Dados locais |

---

### `useCompany()` — `src/context/CompanyContext.tsx`
Dados da empresa do usuário logado.

**Retorna:**
| Propriedade | Tipo | Descrição |
|-------------|------|-----------|
| `company` | Company \| null | Dados da empresa |
| `isLoading` | boolean | Carregando |

---

### `useTasks()` — `src/hooks/useTasks.ts`
CRUD completo de tarefas com React Query.

**Retorna:**
| Propriedade | Tipo | Descrição |
|-------------|------|-----------|
| `tasks` | Task[] | Tarefas da empresa |
| `isLoading` | boolean | Carregando |
| `createTask` | function | Criar tarefa |
| `updateTask` | function | Atualizar tarefa |
| `deleteTask` | function | Excluir tarefa |

---

### `useCollaboratorTasks()` — `src/hooks/useCollaboratorTasks.ts`
Tarefas específicas do colaborador logado.

---

### `useEmployeesList()` — `src/hooks/useEmployeesList.ts`
Lista de colaboradores da empresa.

---

### `useCompanies()` / `useCompanyStats()` — `src/hooks/useCompanies.ts`
Listagem de empresas e estatísticas (Admin Master).

---

### `useReports()` — `src/hooks/useReports.ts`
Dados para relatórios.

---

### `useCompanyReports()` — `src/hooks/useCompanyReports.ts`
Relatórios específicos por empresa.

---

### `useNotifications()` — `src/hooks/useNotifications.ts`
Notificações do usuário.

---

### `useTaskNotifications()` — `src/hooks/useTaskNotifications.ts`
Notificações relacionadas a tarefas.

---

### `useRoutineTemplates()` — `src/hooks/useRoutineTemplates.ts`
Templates de rotinas diárias.

---

## Serviços

### `notificationService.ts` — `src/services/notificationService.ts`
Serviço para envio de notificações via edge functions.

### Time Import Services — `src/services/timeImport/`
Parsers para importação de registros de ponto:

| Arquivo | Formato | Descrição |
|---------|---------|-----------|
| `csvParser.ts` | CSV | Parse de arquivos CSV |
| `excelParser.ts` | XLSX | Parse de planilhas Excel |
| `pdfParser.ts` | PDF | Parse de PDFs (via pdfjs-dist) |
| `repParser.ts` | REP | Parse de arquivos REP (registro eletrônico de ponto) |
| `types.ts` | - | Tipos compartilhados |
| `index.ts` | - | Barrel export |

---

## Contextos

| Contexto | Arquivo | Escopo |
|----------|---------|--------|
| `AuthContext` | `src/context/AuthContext.tsx` | Autenticação global |
| `AppContext` | `src/context/AppContext.tsx` | Estado da aplicação |
| `CompanyContext` | `src/context/CompanyContext.tsx` | Dados da empresa |
| `NotificationContext` | `src/context/NotificationContext.tsx` | Notificações |
