-- Enum para roles dos colaboradores
CREATE TYPE public.employee_role AS ENUM ('colaborador', 'gestor', 'admin');

-- Enum para tipos de notificação
CREATE TYPE public.notification_type AS ENUM (
  'task_assigned',
  'task_due_reminder', 
  'task_overdue',
  'task_completed',
  'task_comment',
  'clock_reminder',
  'clock_anomaly',
  'justification_required',
  'justification_response',
  'announcement',
  'gamification_badge'
);

-- Enum para status de notificação
CREATE TYPE public.notification_status AS ENUM (
  'pending', 'queued', 'sent', 'delivered', 'read', 'failed'
);

-- Enum para prioridade
CREATE TYPE public.notification_priority AS ENUM (
  'low', 'normal', 'high', 'urgent'
);

-- Enum para status da fila
CREATE TYPE public.queue_status AS ENUM (
  'queued', 'processing', 'completed', 'failed'
);

-- Tabela de colaboradores
CREATE TABLE public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role employee_role NOT NULL DEFAULT 'colaborador',
  department TEXT NOT NULL DEFAULT 'Geral',
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- WhatsApp (Evolution API)
  whatsapp_number TEXT,
  whatsapp_verified BOOLEAN DEFAULT false,
  whatsapp_last_seen TIMESTAMPTZ,
  whatsapp_profile_pic TEXT,
  
  -- Preferências de notificação
  notify_whatsapp BOOLEAN DEFAULT true,
  notify_in_app BOOLEAN DEFAULT true,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  notify_tasks BOOLEAN DEFAULT true,
  notify_time_tracking BOOLEAN DEFAULT true,
  notify_reminders BOOLEAN DEFAULT true,
  notify_announcements BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de notificações
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  
  -- Destinatário
  recipient_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  recipient_phone TEXT,
  
  -- Remetente
  sender_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  sender_name TEXT,
  
  -- Configuração
  channels TEXT[] DEFAULT ARRAY['in_app'],
  priority notification_priority DEFAULT 'normal',
  
  -- Entidade relacionada
  related_entity_type TEXT,
  related_entity_id TEXT,
  
  -- Status
  status notification_status DEFAULT 'pending',
  
  -- Status WhatsApp
  whatsapp_status TEXT,
  whatsapp_message_id TEXT,
  whatsapp_instance TEXT,
  whatsapp_sent_at TIMESTAMPTZ,
  whatsapp_delivered_at TIMESTAMPTZ,
  whatsapp_read_at TIMESTAMPTZ,
  whatsapp_error TEXT,
  
  -- Status In-App
  in_app_status TEXT DEFAULT 'pending',
  in_app_delivered_at TIMESTAMPTZ,
  in_app_read_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  scheduled_for TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ
);

-- Tabela de fila de notificações
CREATE TABLE public.notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID REFERENCES public.notifications(id) ON DELETE CASCADE NOT NULL,
  
  -- Webhook n8n
  webhook_url TEXT NOT NULL,
  
  -- Payload (JSON)
  payload JSONB NOT NULL,
  
  -- Controle
  status queue_status DEFAULT 'queued',
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  
  -- Resposta
  response_success BOOLEAN,
  response_message_id TEXT,
  response_error TEXT,
  response_timestamp TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  next_retry_at TIMESTAMPTZ
);

-- Tabela de respostas WhatsApp
CREATE TABLE public.whatsapp_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identificação
  message_id TEXT,
  phone TEXT NOT NULL,
  push_name TEXT,
  instance TEXT,
  
  -- Resposta
  response_type TEXT NOT NULL, -- 'text', 'button', 'list'
  response_value TEXT,
  raw_message JSONB,
  
  -- Vinculação (tentativa de vincular à notificação original)
  notification_id UUID REFERENCES public.notifications(id) ON DELETE SET NULL,
  employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  
  -- Processamento
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX idx_employees_user_id ON public.employees(user_id);
CREATE INDEX idx_employees_whatsapp ON public.employees(whatsapp_number);
CREATE INDEX idx_notifications_recipient ON public.notifications(recipient_id);
CREATE INDEX idx_notifications_status ON public.notifications(status);
CREATE INDEX idx_notifications_created ON public.notifications(created_at DESC);
CREATE INDEX idx_queue_status ON public.notification_queue(status);
CREATE INDEX idx_responses_phone ON public.whatsapp_responses(phone);

-- Habilitar RLS
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_responses ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para employees (gestores podem ver todos, colaboradores só o próprio)
CREATE POLICY "Employees can view own profile"
  ON public.employees FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Gestores can view all employees"
  ON public.employees FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.employees e 
      WHERE e.user_id = auth.uid() 
      AND e.role IN ('gestor', 'admin')
    )
  );

CREATE POLICY "Employees can update own profile"
  ON public.employees FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage employees"
  ON public.employees FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.employees e 
      WHERE e.user_id = auth.uid() 
      AND e.role = 'admin'
    )
  );

-- Políticas RLS para notifications
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (
    recipient_id IN (
      SELECT id FROM public.employees WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Gestores can view all notifications"
  ON public.notifications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.employees e 
      WHERE e.user_id = auth.uid() 
      AND e.role IN ('gestor', 'admin')
    )
  );

CREATE POLICY "Users can update own notification status"
  ON public.notifications FOR UPDATE
  USING (
    recipient_id IN (
      SELECT id FROM public.employees WHERE user_id = auth.uid()
    )
  );

-- Service role pode tudo (para edge functions)
CREATE POLICY "Service role full access employees"
  ON public.employees FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access notifications"
  ON public.notifications FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access queue"
  ON public.notification_queue FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access responses"
  ON public.whatsapp_responses FOR ALL
  USING (auth.role() = 'service_role');

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_employees_updated_at
  BEFORE UPDATE ON public.employees
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir colaboradores iniciais (dados mockados)
INSERT INTO public.employees (name, email, role, department, whatsapp_number, whatsapp_verified) VALUES
  ('Maria Santos', 'maria.santos@empresa.com', 'gestor', 'Operações', '5511999990001', true),
  ('João Silva', 'joao.silva@empresa.com', 'colaborador', 'Logística', '5511999990002', true),
  ('Ana Lima', 'ana.lima@empresa.com', 'colaborador', 'Vendas', '5511999990003', true),
  ('Carlos Rocha', 'carlos.rocha@empresa.com', 'colaborador', 'Estoque', '5511999990004', false),
  ('Pedro Costa', 'pedro.costa@empresa.com', 'colaborador', 'Logística', '5511999990005', true),
  ('Katiele Rocha', 'katiele.rocha@empresa.com', 'gestor', 'Administrativo', '5511999990006', true);