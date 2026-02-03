-- Create table for WhatsApp responses
CREATE TABLE IF NOT EXISTS public.whatsapp_responses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id text NOT NULL,
  phone text NOT NULL,
  push_name text,
  instance text,
  response_type text,
  response_value text,
  raw_message jsonb,
  notification_id uuid REFERENCES public.notifications(id),
  employee_id uuid REFERENCES public.employees(id),
  created_at timestamp with time zone DEFAULT now(),
  processed boolean DEFAULT false
);

-- Enable RLS
ALTER TABLE public.whatsapp_responses ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read access for authenticated users" ON public.whatsapp_responses
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for service role" ON public.whatsapp_responses
  FOR INSERT WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_whatsapp_responses_phone ON public.whatsapp_responses(phone);
CREATE INDEX IF NOT EXISTS idx_whatsapp_responses_notification_id ON public.whatsapp_responses(notification_id);
