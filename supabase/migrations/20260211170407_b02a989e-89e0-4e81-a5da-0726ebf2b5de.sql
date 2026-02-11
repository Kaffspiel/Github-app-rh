-- Fix: add 'tarefa_atrasada' to allowed occurrence types so the auto_penalize trigger works
ALTER TABLE public.occurrences DROP CONSTRAINT occurrences_type_check;

ALTER TABLE public.occurrences ADD CONSTRAINT occurrences_type_check CHECK (
  type = ANY (ARRAY[
    'aprovacao_tarefa'::text,
    'atraso_tarefa'::text,
    'falta'::text,
    'atestado'::text,
    'pontualidade_positiva'::text,
    'pontualidade_negativa'::text,
    'tarefa_atrasada'::text
  ])
);