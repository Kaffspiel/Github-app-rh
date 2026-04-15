-- Migração de Rotinas do Gabriel Teste (colaborador@teste.com)
-- Transforma Tarefas com Checklist em Projetos Diários com Sub-tarefas

DO $$
DECLARE
    gabriel_id UUID;
    routine_record RECORD;
    new_project_id UUID;
    checklist_record RECORD;
BEGIN
    -- 1. Localizar o ID do Gabriel pelo email
    -- Nota: O email fornecido no request é colaborador@teste.com
    SELECT id INTO gabriel_id FROM public.employees WHERE email = 'colaborador@teste.com' LIMIT 1;
    
    IF gabriel_id IS NULL THEN
        RAISE NOTICE 'Gabriel Teste (colaborador@teste.com) não encontrado.';
        RETURN;
    END IF;

    RAISE NOTICE 'Iniciando migração para Gabriel ID: %', gabriel_id;

    -- 2. Localizar todas as rotinas (tarefas marcadas como is_daily_routine = true) vinculadas a ele
    FOR routine_record IN 
        SELECT id, title, description, company_id, priority 
        FROM public.tasks 
        WHERE assignee_id = gabriel_id AND is_daily_routine = true
    LOOP
        RAISE NOTICE 'Transformando rotina: %', routine_record.title;

        -- 3. Criar um Projeto para cada rotina
        INSERT INTO public.projects (name, description, company_id, is_daily_routine, color)
        VALUES (routine_record.title, COALESCE(routine_record.description, 'Rotina diária migrada'), routine_record.company_id, true, '#3b82f6')
        RETURNING id INTO new_project_id;
        
        -- 4. Vincular o Gabriel como Gestor deste projeto
        INSERT INTO public.project_members (project_id, employee_id, role)
        VALUES (new_project_id, gabriel_id, 'manager');
        
        -- 5. Converter cada item do checklist em uma tarefa vinculada ao projeto
        FOR checklist_record IN 
            SELECT text, sort_order 
            FROM public.task_checklist_items 
            WHERE task_id = routine_record.id
        LOOP
            INSERT INTO public.tasks (title, project_id, company_id, assignee_id, is_daily_routine, priority, status)
            VALUES (checklist_record.text, new_project_id, routine_record.company_id, gabriel_id, true, routine_record.priority, 'pendente');
        END LOOP;
        
        -- 6. Deletar a tarefa de rotina antiga (os itens do checklist são deletados em cascata ou mantidos dependendo da FK)
        -- Aqui optamos por deletar para limpar o dashboard conforme solicitado ("transforme")
        DELETE FROM public.tasks WHERE id = routine_record.id;
        
    END LOOP;

    RAISE NOTICE 'Migração de rotinas concluída com sucesso.';
END $$;
