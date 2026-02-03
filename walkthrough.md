# Walkthrough: Meliorias no Controle de Ponto e Gestão de Colaboradores

## Resumo das Mudanças
Implementamos melhorias críticas no sistema de Controle de Ponto e adicionamos funcionalidade para transformar colaboradores existentes em usuários do sistema.

## 1. Correção no Controle de Ponto (Silent Error)
O problema de cálculo incorreto de atrasos foi resolvido.
- **Antes**: O sistema usava um horário fixo ou indefinido, causando cálculos de atraso "massivos" (ex: 540 minutos).
- **Agora**: O sistema busca o `work_schedule_start` específico de cada colaborador.
- **Código Refatorado**:
  ```typescript
  // src/components/TimeTracking.tsx
  const scheduleStart = r.employees?.work_schedule_start || "09:00";
  const calculated = calculateStatus(entry1, scheduleStart); // Passando os 2 argumentos
  ```

## 2. Configuração de Horário por Colaborador
Agora é possível definir o horário de entrada esperado individualmente.
- Campo adicionado no formulário de colaboradores: "Horário Entrada Previsto".
- Se não definido, o padrão é "09:00".

## 3. Criação de Usuário para Funcionário Existente
Facilitamos a promoção de um "Colaborador" (apenas registro) para um "Usuário" (com login).
- **Nova Ação**: No menu de ações (três pontos) na lista de colaboradores, agora existe a opção **"Criar Acesso"**.
- **Benefício**: Mantém o histórico do colaborador e apenas adiciona as credenciais de acesso, sem duplicar registros.
- **Edge Function**: A função `create-user` foi atualizada para aceitar um `employeeId` opcional e atualizar o registro existente.

## Instruções de Verificação

### Passo 1: Implantação (Automática)
No ambiente **Lovable Cloud**, as Edge Functions são implantadas automaticamente ao salvar o código.
- As alterações no arquivo `supabase/functions/create-user/index.ts` já foram aplicadas.
- Não é necessário rodar comandos manuais de deploy.

### Passo 2: Testar Controle de Ponto
1. Acesse o menu **Controle de Ponto**.
2. Verifique a coluna **"Previsto"**. Ela deve mostrar o horário configurado para cada funcionário.
3. Verifique se os status de "Atraso" estão coerentes com a tolerância de 10 minutos.

### Passo 3: Testar Criação de Acesso
1. Acesse **Gestão de Colaboradores**.
2. Encontre um colaborador sem ícone de chave (sem acesso).
3. Clique no menu de ações e selecione **"Criar Acesso"**.
4. Defina uma senha e confirme.
5. Verifique se ele agora possui o ícone de chave.

### Passo 4: Testar Mensagens com Botões (Correção)
1. Tente enviar uma notificação que usaria botões (ex: solicitação de justificativa de ponto).
### Passo 5: Configurar Respostas (WhatsApp)
1. **Banco de Dados**:
    - Copie o conteúdo do arquivo `sql/whatsapp_response_schema.sql` (ou `supabase/migrations/20260203111500_whatsapp_responses.sql`).
    - Execute no **SQL Editor** do Supabase para criar a tabela `whatsapp_responses`.

2. **Evolution API**:
    - Configure o Webhook Global ou da Instância.
    - **URL**: `https://nnmrlucwrzoqkwzytbbl.supabase.co/functions/v1/webhook-response`
    - **Eventos**: Marque `MESSAGES_UPSERT`.
    - **Habilitado**: Sim.

### Passo 6: Corrigir Acesso ao Perfil (Erro "Não Cadastrado")
1. **Problema**: O App mostra "Olá, Colaborador!" e dados em branco.
2. **Solução**: Execute o arquivo `sql/fix_permissions_and_links.sql` no SQL Editor.
3. Isso corrige as permissões de leitura E refaz o vínculo do usuário com o funcionário pelo email.

## 4. Gamificação e Ranking no App
Adicionamos a visualização de pontos e ranking para os colaboradores.
- **Aba "Pontos"**: Mostra o saldo total e histórico de ocorrências.
- **Aba "Ranking"**: Exibe pódio e lista geral.
- **Requisito**: Rodar `sql/create_ranking_function.sql` no SQL Editor para criar a função segura de ranking.
- **Nota**: A função suporta visualização tanto para Colaboradores quanto para Gestores/Admins, buscando o vínculo com a empresa automaticamente.

## 5. Automação de Pontualidade
Implementamos uma regra de negócio automática no banco de dados:
- **Pontualidade**: Ao bater o ponto de entrada (`entry_1`) dentro do horário previsto (com 10min de tolerância), o colaborador ganha **+10 pontos** automaticamente.
- **Atraso**: Se chegar atrasado, não ganha pontos (mas não perde, conforme solicitado).
- **Duplicidade**: O sistema previne ganhar pontos duplicados pelo mesmo dia.

## 6. Backfill de Pontos Retroativos
Para não penalizar quem já tem histórico, criamos um script para aplicar a regra de pontos retroativamente:
- **Arquivo**: `sql/backfill_gamification.sql`
- **Lógica**: Percorre todos os registros passados. Se chegou no horário, ganha +10 pontos. Respeita a regra de duplicidade (só 1x por dia).

## 7. Aprovação de Prorrogação de Tarefas
Agora os gestores podem visualizar e aprovar pedidos de prorrogação diretamente na tela de **Gestão de Tarefas**.

### Fluxo:
1.  **Colaborador**: Clica em "Pedir Mais Prazo" na tarefa atrasada/pendente.
    -   Preenche nova data e motivo.
    -   **Visualização (App Mobile)**: A tarefa ganha uma etiqueta amarela "Solicitação de Prazo Pendente" com ícone de relógio.
2.  **Gestor**: Recebe notificação instantânea.
    -   Acessa a aba **"Solicitações"** em Gestão de Tarefas.
    -   Visualiza cards com: Solicitante, Nova Data, Motivo.
    -   **Aprovar**: Atualiza o prazo da tarefa automaticamente e avisa o colaborador.
    -   **Rejeitar**: Mantém o prazo e avisa o colaborador.

### Onde Encontrar:
-   Acesse **Gestão de Tarefas**.
-   Se for Gestor/Admin, verá a aba **"Solicitações"** ao lado de "Templates" (com badge contador de pendências).
