-- Adiciona o campo is_daily_routine na tabela de projetos
-- Isso permitirá transformar o modelo de "Rotinas" (tarefas com checklist) 
-- em "Projetos Diários" (Projetos contendo múltiplas tarefas individuais).

ALTER TABLE projects ADD COLUMN is_daily_routine BOOLEAN DEFAULT false;

-- Comentário opcional para documentação no banco
COMMENT ON COLUMN projects.is_daily_routine IS 'Indica se o projeto é uma rotina diária que deve ser resetada ou monitorada diariamente.';
