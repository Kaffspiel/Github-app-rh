-- Create occurrences table
create table if not exists public.occurrences (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) not null,
  employee_id uuid references public.employees(id) not null,
  type text not null check (type in ('aprovacao_tarefa', 'atraso_tarefa', 'falta', 'atestado', 'pontualidade_positiva', 'pontualidade_negativa')),
  points integer not null,
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_by uuid references auth.users(id)
);

-- Create company_rules table
create table if not exists public.company_rules (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) not null,
  title text not null,
  description text,
  file_url text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.occurrences enable row level security;
alter table public.company_rules enable row level security;

-- Policies for occurrences
create policy "Enable read access for users in the same company"
  on public.occurrences for select
  using (company_id in (
    select company_id from public.user_roles where user_id = auth.uid()
  ));

create policy "Enable insert for admins and managers"
  on public.occurrences for insert
  with check (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid()
      and company_id = public.occurrences.company_id
      and role in ('admin', 'gestor')
    )
  );

-- Policies for company_rules
create policy "Enable read access for users in the same company"
  on public.company_rules for select
  using (company_id in (
    select company_id from public.user_roles where user_id = auth.uid()
  ));

create policy "Enable insert for admins"
  on public.company_rules for insert
  with check (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid()
      and company_id = public.company_rules.company_id
      and role in ('admin', 'gestor')
    )
  );
