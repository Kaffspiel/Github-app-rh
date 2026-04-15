-- ================================================
-- Remove employees mockados inseridos na migration
-- inicial (20260129191738). Esses são dados de teste
-- que não devem existir em produção.
-- ================================================

DELETE FROM public.employees
WHERE email IN (
    'maria.santos@empresa.com',
    'joao.silva@empresa.com',
    'ana.lima@empresa.com',
    'carlos.rocha@empresa.com',
    'pedro.costa@empresa.com',
    'katiele.rocha@empresa.com'
);
