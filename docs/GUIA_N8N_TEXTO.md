# Guia de Configuração n8n: Modo Texto Compatível

Devido a restrições em algumas versões do WhatsApp que bloqueiam mensagens com botões, o OpsControl foi atualizado para enviar **Notificações em Texto**.

Este guia explica como seu fluxo no n8n deve estar configurado para funcionar perfeitamente com essa mudança.

## 1. O que mudou?

Antes, o sistema tentava enviar dois tipos de mensagem:
- `text` (Texto simples)
- `buttons` (Texto com botões clicáveis)

**Agora, o sistema envia SEMPRE o tipo `text`.** As opções que antes eram botões agora aparecem escritas no corpo da mensagem (ex: "- Opção 1...").

## 2. Preciso alterar algo no n8n?

**Se o seu nó de "Enviar WhatsApp (Texto)" já estava configurado, NÃO precisa mudar nada.** O fluxo vai funcionar automaticamente.

Se quiser **limpar** ou **simplificar** o fluxo, você pode remover a lógica de decisão (Switch) e deixar apenas o caminho de texto.

---

## 3. Configuração Ideal do Nó (HTTP Request)

Certifique-se que o nó que envia a mensagem de texto (geralmente chamado **Enviar WhatsApp (Texto)**) está configurado assim:

### Parâmetros Principais
- **Method:** `POST`
- **URL:** `https://evolution.kaffspiel.cloud/message/sendText/{{ $json.body.instanceName }}`

### Authentication (Headers)
- **Name:** `apikey`
- **Value:** `(Sua API Key do Evolution)`

### Body Parameters
- **Send Body:** `True`
- **Mode:** `JSON`
- **JSON Body:**
```json
{
  "number": "{{ $json.body.number }}",
  "text": "{{ $json.body.text.message }}",
  "delay": 1200
}
```

> **Atenção:** O campo importante é o `text`, que agora já vem formatado com a mensagem completa e as opções no final.

## 4. Exemplo de Payload Recebido (Webhook)

Quando o OpsControl envia uma notificação agora, o JSON chega assim no seu Webhook:

```json
{
  "instanceName": "teste",
  "number": "5521999999999",
  "messageType": "text",
  "text": {
    "message": "Olá! Nova tarefa atribuída...\n\nOpções disponíveis:\n- Ver Tarefa\n- Entendido\n(Responda com a opção desejada)"
  },
  "metadata": {...}
}
```

## Resumo
Não é obrigatório alterar o fluxo se ele já tinha o caminho "Text". O sistema apenas parou de usar o caminho "Buttons".

---

## 5. Solução de Problemas Comuns

### Erro: "JSON parameter needs to be valid JSON"
Este erro acontece quando você cola o código no campo **JSON Body** mas esquece de ativar o **Modo Expressão**. O n8n tenta ler o código como um texto simples, e falha.

**Como corrigir:**
1. No campo **JSON Body**, procure o botão/aba escrito **Expression** (ou um ícone de `f(x)`/engrenagem).
2. Clique nele para ativar. O campo deve mudar de cor ou mostrar um editor de código.
3. Cole o código novamente:
```javascript
{
  "number": $json.body.number,
  "text": $json.body.text.message,
  "delay": 1200
}
```
4. Se feito corretamente, o n8n mostrará uma pré-visualização do resultado (ex: `{ "number": "55...", ... }`) logo abaixo.

### Método Alternativo (Mais Fácil): Usando Campos
Se o JSON continuar dando erro, você pode configurar campo por campo:

1. No nó HTTP Request, procure a opção **Specify Body**.
2. Mude de "JSON" para **"Using Fields"** (ou "Campos").
3. Em **Body Parameters**, clique em *Add Parameter* para cada item:

| Name | Value |
|------|-------|
| `number` | `{{ $json.body.number }}` (Arraste a bolinha verde) |
| `text` | `{{ $json.body.text.message }}` |
| `delay` | `1200` |

Dessa forma o n8n monta o JSON para você e evita erros de sintaxe! 🛡️
