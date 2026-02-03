-- Script de Verificação do Banco de Dados

-- 1. Verificar se as tabelas foram criadas
SELECT 'Tabela criada: occurrences' as item, 
       CASE WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'occurrences') 
            THEN 'OK' ELSE 'FALHA' END as status
UNION ALL
SELECT 'Tabela criada: company_rules', 
       CASE WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'company_rules') 
            THEN 'OK' ELSE 'FALHA' END

UNION ALL

-- 2. Verificar se a coluna 'points' existe na tabela employees
SELECT 'Coluna criada: employees.points', 
       CASE WHEN EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'employees' AND column_name = 'points') 
            THEN 'OK' ELSE 'FALHA' END

UNION ALL

-- 3. Verificar o Trigger de pontuação
SELECT 'Trigger criado: update_points_trigger', 
       CASE WHEN EXISTS (SELECT FROM information_schema.triggers WHERE event_object_table = 'occurrences' AND trigger_name = 'update_points_trigger') 
            THEN 'OK' ELSE 'FALHA' END

UNION ALL

-- 4. Verificar Policies (RLS)
SELECT 'Policies: occurrences (Read)', 
       CASE WHEN EXISTS (SELECT FROM pg_policies WHERE tablename = 'occurrences' AND policyname = 'Enable read access for users in the same company') 
            THEN 'OK' ELSE 'FALHA' END
UNION ALL
SELECT 'Policies: company_rules (Read)', 
       CASE WHEN EXISTS (SELECT FROM pg_policies WHERE tablename = 'company_rules' AND policyname = 'Enable read access for users in the same company') 
            THEN 'OK' ELSE 'FALHA' END

UNION ALL

-- 5. Verificar Bucket (indiretamente via policies de storage)
SELECT 'Bucket: policies de storage', 
       CASE WHEN EXISTS (SELECT FROM pg_policies WHERE schemaname = 'storage' AND policyname = 'Public Access') 
            THEN 'OK' ELSE 'FALHA' END;
