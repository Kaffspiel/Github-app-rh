# Plano de Reestruturação - OpsControl Multi-Empresa

## Visão Geral
Sistema multi-tenant com admin master, gestores por empresa, e app mobile separado para colaboradores.

## Fase 1: Estrutura de Dados Multi-Tenant

### 1.1 Tabelas Principais
- [ ] `companies` - Cadastro de empresas
- [ ] `user_roles` - Roles separados (admin_master, admin, gestor, colaborador)
- [ ] Atualizar `employees` com referência a `company_id`
- [ ] `time_tracking_imports` - Histórico de importações
- [ ] `time_tracking_records` - Registros de ponto importados
- [ ] `api_integrations` - Configuração de APIs por empresa
- [ ] `column_mappings` - Mapeamento dinâmico de colunas

### 1.2 Hierarquia de Roles
```
admin_master (Plataforma)
  └── admin (por empresa)
       └── gestor (por departamento)
            └── colaborador (acesso app)
```

## Fase 2: Importação de Ponto

### 2.1 Formatos Suportados
- [ ] Excel (.xlsx) - Parser com xlsx library
- [ ] CSV - Parser nativo
- [ ] REP (AFD) - Parser específico para registradores eletrônicos

### 2.2 APIs Externas
- [ ] Tangerino API
- [ ] Pontomais API
- [ ] Sistema dinâmico de webhooks para outras APIs

### 2.3 Fluxo de Importação
1. Upload de arquivo OU configuração de API
2. Mapeamento de colunas (configurável)
3. Validação de dados
4. Preview antes de importar
5. Importação com log de erros

## Fase 3: Interfaces Separadas

### 3.1 Admin Master Dashboard
- Gestão de empresas
- Visão geral de todas as empresas
- Configurações globais

### 3.2 Admin/Gestor Dashboard (Web)
- Dashboard atual (adaptada para empresa)
- Gestão de colaboradores da empresa
- Configuração de integrações
- Importação de ponto
- Relatórios

### 3.3 App Colaborador (Mobile/PWA)
- Visualização de tarefas
- Registro de ponto (se permitido)
- Histórico de ponto pessoal
- Notificações
- Gamificação pessoal

## Fase 4: Autenticação e Onboarding

### 4.1 Fluxos de Cadastro
- [ ] Admin Master cadastra nova empresa + primeiro admin
- [ ] Admin da empresa cadastra gestores
- [ ] Gestores cadastram colaboradores
- [ ] Colaborador recebe convite por email/WhatsApp

### 4.2 Login Diferenciado
- Detecção automática de role após login
- Redirecionamento para interface correta
- Bloqueio de acesso a áreas não autorizadas

## Estrutura de Arquivos

```
src/
├── apps/
│   ├── admin-master/   # Admin Master (plataforma)
│   ├── company/        # Admin/Gestor empresa (web)
│   └── collaborator/   # App colaborador (mobile)
├── components/
│   ├── shared/         # Componentes compartilhados
│   └── ...
├── hooks/
│   ├── useAuth.ts
│   ├── useCompany.ts
│   └── useTimeImport.ts
└── services/
    ├── timeImport/
    │   ├── excelParser.ts
    │   ├── csvParser.ts
    │   ├── repParser.ts
    │   └── apiIntegrations.ts
    └── ...
```

## APIs de Ponto - Configuração Dinâmica

### Estrutura da tabela `api_integrations`
```sql
- company_id (referência)
- provider_name (tangerino, pontomais, custom)
- api_base_url
- api_key (encrypted via vault ou secrets)
- auth_type (api_key, oauth2, basic)
- sync_frequency (manual, hourly, daily)
- last_sync_at
- is_active
```

### Mapeamento Dinâmico
Permite configurar qual campo da API corresponde a cada campo interno:
- employee_external_id → employee_id
- clock_in → entry_time
- clock_out → exit_time
- etc.

## Próximos Passos

1. ✅ Criar migration com estrutura multi-tenant
2. [ ] Implementar autenticação com roles
3. [ ] Criar interfaces separadas (admin-master, company, collaborator)
4. [ ] Implementar sistema de importação de ponto
5. [ ] Integrar APIs externas (Tangerino, Pontomais)
6. [ ] Configurar PWA/Capacitor para app mobile

---

# Integração WhatsApp (Evolution API + n8n)

## Estrutura existente mantida
- Tabelas de notifications e notification_queue
- Webhooks para Evolution API
- Templates de mensagem

## Próximos ajustes
- Associar notifications a company_id
- Permitir configuração de instância Evolution por empresa
