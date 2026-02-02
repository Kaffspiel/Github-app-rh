# Documentação de Gatilhos Webhook (n8n)

Esta documentação descreve os eventos que disparam notificações para o webhook do n8n e o formato dos dados enviados.

## Configuração
**URL de Envio:** `https://n8n.kaffspiel.cloud/webhook/opscontrol-send`
**Método:** `POST`
**Headers:** `Content-Type: application/json`

---

## Estrutura Padrão do Payload
Todo evento enviado terá a seguinte estrutura base JSON:

```json
{
  "instanceName": "default",
  "number": "5511999999999",
  "messageType": "text" | "buttons" | "image" | "document",
  "metadata": {
    "notificationId": "notif-123456789...",
    "notificationType": "TIPO_DO_EVENTO"
  },
  // Campos específicos baseados no messageType (text, buttons, etc)
}
```

---

## Gatilhos Disponíveis

### 1. Tarefa Atribuída (`task_assigned`)
**Quando ocorre:** Um gestor cria uma nova tarefa para um colaborador ou altera o responsável de uma tarefa existente.
**Prioridade:** Normal
**Mensagem:** "Olá {nome}! Você recebeu uma nova tarefa: *{titulo}*..."
**Botões:**
1. Ver Tarefa
2. Entendido

### 2. Tarefa Atualizada (`task_comment`)
**Quando ocorre:** Um gestor altera detalhes importantes (prazo, prioridade, título) de uma tarefa.
**Prioridade:** Normal
**Mensagem:** "A tarefa *{titulo}* foi atualizada. Alterações em: {campos}..."

### 3. Tarefa Concluída (`task_completed`)
**Quando ocorre:** O colaborador marca uma tarefa como "Concluída" no app.
**Destinatário:** Gestores
**Prioridade:** Baixa
**Mensagem:** "✅ {nome}, a tarefa *{titulo}* foi concluída por {responsavel}."

### 4. Item de Checklist (`task_comment`)
**Quando ocorre:** O colaborador marca um item de checklist como feito.
**Destinatário:** Gestores
**Prioridade:** Baixa
**Nota:** Utiliza o tipo `task_comment` internamente.
**Mensagem:** "A tarefa *{titulo}* foi atualizada. {nome} marcou '{item}' como feito..."

### 5. Tarefa Atrasada (`task_overdue`)
**Quando ocorre:** O sistema detecta que uma tarefa passou do prazo (verificação ao carregar o app).
**Prioridade:** Alta
**Mensagem:** "⚠️ Atenção {nome}! A tarefa abaixo está atrasada: *{titulo}*..."
**Botões:**
1. Ver Tarefa

### 6. Lembrete de Ponto (`clock_reminder`)
**Quando ocorre:** Horário programado para entrada/saída (configuração automática).
**Prioridade:** Normal
**Mensagem:** "⏰ Olá {nome}! Não esqueça de bater o ponto. Horário previsto: {horario}"

### 7. Anomalia de Ponto (`clock_anomaly`)
**Quando ocorre:** Sistema detecta ponto fora do horário ou falta não justificada.
**Prioridade:** Alta
**Mensagem:** "⚠️ {nome}, identificamos uma anomalia no seu ponto..."
**Botões:**
1. Justificar

---

## Como Testar
Para testar a integração:
1. Garanta que seu usuário tenha um número de WhatsApp cadastrado e verificado (`whatsapp_verified: true`).
2. No painel, crie uma tarefa e atribua a si mesmo.
3. O webhook deverá receber o evento `task_assigned` quase instantaneamente.
