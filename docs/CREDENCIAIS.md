# Credenciais do Projeto OpsControl

> **Nota:** Este arquivo contém informações sensíveis. Não compartilhe publicamente.

---

## 🔗 URLs do Projeto

| Recurso | URL |
|---------|-----|
| **Preview** | https://id-preview--a3977b17-769f-4f86-9cc4-9ff67e1ebf5b.lovable.app |
| **Publicado** | https://friendly-deploy-hub.lovable.app |
| **API Supabase** | https://nnmrlucwrzoqkwzytbbl.supabase.co |

---

## 🔑 Chaves Públicas (podem ser usadas no frontend)

| Variável | Valor |
|----------|-------|
| `VITE_SUPABASE_PROJECT_ID` | `nnmrlucwrzoqkwzytbbl` |
| `VITE_SUPABASE_URL` | `https://nnmrlucwrzoqkwzytbbl.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ubXJsdWN3cnpvcWt3enl0YmJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3MTA4MzIsImV4cCI6MjA4NTI4NjgzMn0.I4dLM5R-_qQe8xy1VYevXLd6BvkAcam5CYZ9jQvOxRA` |

---

## 🔒 Secrets (Edge Functions - NÃO expor no frontend)

As seguintes secrets estão configuradas e disponíveis nas Edge Functions:

| Nome do Secret | Descrição |
|----------------|-----------|
| `SUPABASE_URL` | URL da API do Supabase |
| `SUPABASE_ANON_KEY` | Chave anônima (mesma que PUBLISHABLE_KEY) |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave de serviço (acesso total - **NUNCA expor**) |
| `SUPABASE_DB_URL` | String de conexão direta ao PostgreSQL |
| `SUPABASE_PUBLISHABLE_KEY` | Chave pública do Supabase |
| `LOVABLE_API_KEY` | Chave da API do Lovable |

> ⚠️ **Importante:** A `SERVICE_ROLE_KEY` e `DB_URL` NUNCA devem ser expostas no frontend ou em código cliente.

---

## 👤 Conta Admin Master

| Campo | Valor |
|-------|-------|
| **Email** | `escoladeautopecas@gmail.com` |
| **Role** | `admin_master` |

---

## 🔧 Integrações Externas (Configurar se necessário)

Para a integração com n8n/WhatsApp, você precisará configurar:

| Variável | Descrição | Status |
|----------|-----------|--------|
| `EVOLUTION_URL` | URL da API Evolution | ⚠️ Configurar |
| `EVOLUTION_KEY` | Chave da API Evolution | ⚠️ Configurar |
| `OPSCONTROL_URL` | URL do OpsControl | ✅ Usar URL publicada |
| `OPSCONTROL_ANON_KEY` | Anon Key do OpsControl | ✅ Usar PUBLISHABLE_KEY |

---

## 📡 Endpoints das Edge Functions

Base URL: `https://nnmrlucwrzoqkwzytbbl.supabase.co/functions/v1/`

| Função | Endpoint |
|--------|----------|
| Criar usuário | `/create-user` |
| Resetar senha | `/reset-user-password` |
| Enviar notificação | `/send-notification` |
| Resumo de progresso | `/task-progress-summary` |
| Webhook status | `/webhook-status` |
| Webhook resposta | `/webhook-response` |
| Parse documento | `/parse-time-document` |
| Setup usuários teste | `/setup-test-users` |

---

## 🗄️ Conexão Direta ao Banco (Apenas para ferramentas externas)

Para conectar via cliente SQL externo, use a `SUPABASE_DB_URL` disponível nos secrets.

**Formato típico:**
```
postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
```

> Para obter a connection string completa, acesse o painel do Lovable Cloud.

---

## 📋 Roles do Sistema

| Role | Acesso |
|------|--------|
| `admin_master` | Acesso total, gerencia todas as empresas |
| `admin` | Administrador de uma empresa específica |
| `gestor` | Gerente com acesso a relatórios e tarefas |
| `colaborador` | Acesso limitado ao app mobile |

---

*Documento gerado em: Janeiro 2026*
