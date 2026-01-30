-- Política temporária para permitir operações durante desenvolvimento
-- ATENÇÃO: Remover em produção e substituir por autenticação adequada
CREATE POLICY "Allow anonymous insert for dev" 
ON public.employees 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow anonymous update for dev" 
ON public.employees 
FOR UPDATE 
USING (true);

CREATE POLICY "Allow anonymous delete for dev" 
ON public.employees 
FOR DELETE 
USING (true);

CREATE POLICY "Allow anonymous select for dev" 
ON public.employees 
FOR SELECT 
USING (true);