-- ================================================
-- FASE 1: ESTRUTURA MULTI-TENANT OPSCONTROL
-- ================================================

-- 1. Enum de roles expandido
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE public.app_role AS ENUM ('admin_master', 'admin', 'gestor', 'colaborador');
    END IF;
END $$;

-- 2. Tabela de Empresas
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    cnpj TEXT UNIQUE,
    trade_name TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    phone TEXT,
    email TEXT,
    logo_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Tabela de Roles de Usuário (separada de employees)
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role app_role NOT NULL,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, role, company_id)
);

-- 4. Adicionar company_id na tabela employees
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

-- 5. Adicionar external_id para integração com APIs de ponto
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS external_id TEXT;

-- 6. Tabela de Registros de Ponto (importados)
CREATE TABLE IF NOT EXISTS public.time_tracking_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    external_employee_id TEXT,
    record_date DATE NOT NULL,
    entry_1 TIME,
    exit_1 TIME,
    entry_2 TIME,
    exit_2 TIME,
    entry_3 TIME,
    exit_3 TIME,
    entry_4 TIME,
    exit_4 TIME,
    total_hours INTERVAL,
    overtime INTERVAL,
    status TEXT DEFAULT 'normal',
    anomalies TEXT[],
    notes TEXT,
    import_id UUID,
    raw_data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Tabela de Importações de Ponto
CREATE TABLE IF NOT EXISTS public.time_tracking_imports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    imported_by UUID REFERENCES auth.users(id),
    source_type TEXT NOT NULL, -- 'excel', 'csv', 'rep', 'api'
    source_name TEXT, -- nome do arquivo ou API
    file_url TEXT,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed
    total_records INTEGER DEFAULT 0,
    imported_records INTEGER DEFAULT 0,
    failed_records INTEGER DEFAULT 0,
    error_log JSONB DEFAULT '[]',
    column_mapping JSONB, -- mapeamento de colunas usado
    period_start DATE,
    period_end DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ
);

-- 8. Tabela de Integrações de API
CREATE TABLE IF NOT EXISTS public.api_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    provider_name TEXT NOT NULL, -- 'tangerino', 'pontomais', 'custom'
    display_name TEXT,
    api_base_url TEXT,
    auth_type TEXT NOT NULL DEFAULT 'api_key', -- 'api_key', 'oauth2', 'basic'
    -- Credenciais serão armazenadas via secrets/vault, apenas referência aqui
    credentials_ref TEXT,
    sync_frequency TEXT DEFAULT 'manual', -- 'manual', 'hourly', 'daily'
    last_sync_at TIMESTAMPTZ,
    last_sync_status TEXT,
    is_active BOOLEAN NOT NULL DEFAULT false,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(company_id, provider_name)
);

-- 9. Tabela de Mapeamento de Colunas (para importação flexível)
CREATE TABLE IF NOT EXISTS public.column_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    integration_id UUID REFERENCES public.api_integrations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    source_type TEXT NOT NULL, -- 'excel', 'csv', 'rep', 'api'
    mapping JSONB NOT NULL, -- {"employee_id": "COL_A", "entry_1": "COL_B", ...}
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. Adicionar company_id nas notificações
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

-- ================================================
-- FUNÇÕES DE SEGURANÇA (SECURITY DEFINER)
-- ================================================

-- Função para verificar se usuário tem role específico
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = _user_id AND role = _role
    );
$$;

-- Função para verificar se é admin master
CREATE OR REPLACE FUNCTION public.is_admin_master(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = _user_id AND role = 'admin_master'
    );
$$;

-- Função para obter company_id do usuário
CREATE OR REPLACE FUNCTION public.get_user_company(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT company_id FROM public.user_roles
    WHERE user_id = _user_id AND company_id IS NOT NULL
    LIMIT 1;
$$;

-- Função para verificar se usuário pertence a uma empresa
CREATE OR REPLACE FUNCTION public.user_belongs_to_company(_user_id UUID, _company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = _user_id AND company_id = _company_id
    ) OR public.is_admin_master(_user_id);
$$;

-- ================================================
-- ROW LEVEL SECURITY
-- ================================================

-- Habilitar RLS nas novas tabelas
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_tracking_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_tracking_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.column_mappings ENABLE ROW LEVEL SECURITY;

-- Políticas para COMPANIES
CREATE POLICY "Admin master can manage all companies"
ON public.companies FOR ALL
USING (public.is_admin_master(auth.uid()));

CREATE POLICY "Users can view their company"
ON public.companies FOR SELECT
USING (id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()));

-- Políticas para USER_ROLES
CREATE POLICY "Admin master can manage all roles"
ON public.user_roles FOR ALL
USING (public.is_admin_master(auth.uid()));

CREATE POLICY "Company admins can manage company roles"
ON public.user_roles FOR ALL
USING (
    company_id IN (
        SELECT ur.company_id FROM public.user_roles ur
        WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
);

CREATE POLICY "Users can view own roles"
ON public.user_roles FOR SELECT
USING (user_id = auth.uid());

-- Políticas para TIME_TRACKING_RECORDS
CREATE POLICY "Company users can view company records"
ON public.time_tracking_records FOR SELECT
USING (public.user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Admins and gestores can manage company records"
ON public.time_tracking_records FOR ALL
USING (
    company_id IN (
        SELECT ur.company_id FROM public.user_roles ur
        WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'gestor')
    )
);

-- Políticas para TIME_TRACKING_IMPORTS
CREATE POLICY "Company admins can manage imports"
ON public.time_tracking_imports FOR ALL
USING (
    company_id IN (
        SELECT ur.company_id FROM public.user_roles ur
        WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'gestor')
    )
);

-- Políticas para API_INTEGRATIONS
CREATE POLICY "Company admins can manage integrations"
ON public.api_integrations FOR ALL
USING (
    company_id IN (
        SELECT ur.company_id FROM public.user_roles ur
        WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
);

-- Políticas para COLUMN_MAPPINGS
CREATE POLICY "Company users can view mappings"
ON public.column_mappings FOR SELECT
USING (public.user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Company admins can manage mappings"
ON public.column_mappings FOR ALL
USING (
    company_id IN (
        SELECT ur.company_id FROM public.user_roles ur
        WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
);

-- ================================================
-- TRIGGERS
-- ================================================

-- Trigger para updated_at em companies
CREATE TRIGGER update_companies_updated_at
BEFORE UPDATE ON public.companies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para updated_at em time_tracking_records
CREATE TRIGGER update_time_tracking_records_updated_at
BEFORE UPDATE ON public.time_tracking_records
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para updated_at em api_integrations
CREATE TRIGGER update_api_integrations_updated_at
BEFORE UPDATE ON public.api_integrations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para updated_at em column_mappings
CREATE TRIGGER update_column_mappings_updated_at
BEFORE UPDATE ON public.column_mappings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ================================================
-- POLÍTICAS TEMPORÁRIAS PARA DESENVOLVIMENTO
-- (Remover em produção)
-- ================================================

CREATE POLICY "Dev: Allow anonymous access to companies"
ON public.companies FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Dev: Allow anonymous access to user_roles"
ON public.user_roles FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Dev: Allow anonymous access to time_tracking_records"
ON public.time_tracking_records FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Dev: Allow anonymous access to time_tracking_imports"
ON public.time_tracking_imports FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Dev: Allow anonymous access to api_integrations"
ON public.api_integrations FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Dev: Allow anonymous access to column_mappings"
ON public.column_mappings FOR ALL USING (true) WITH CHECK (true);

-- ================================================
-- ÍNDICES PARA PERFORMANCE
-- ================================================

CREATE INDEX IF NOT EXISTS idx_employees_company_id ON public.employees(company_id);
CREATE INDEX IF NOT EXISTS idx_employees_external_id ON public.employees(external_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_company_id ON public.user_roles(company_id);
CREATE INDEX IF NOT EXISTS idx_time_tracking_records_company_id ON public.time_tracking_records(company_id);
CREATE INDEX IF NOT EXISTS idx_time_tracking_records_employee_id ON public.time_tracking_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_time_tracking_records_date ON public.time_tracking_records(record_date);
CREATE INDEX IF NOT EXISTS idx_time_tracking_imports_company_id ON public.time_tracking_imports(company_id);
CREATE INDEX IF NOT EXISTS idx_api_integrations_company_id ON public.api_integrations(company_id);
CREATE INDEX IF NOT EXISTS idx_notifications_company_id ON public.notifications(company_id);