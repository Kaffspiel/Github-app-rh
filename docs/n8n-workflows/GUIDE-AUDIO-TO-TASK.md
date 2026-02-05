# Guia de Configuração: n8n Workflow para Criação de Tarefas

Este documento detalha como configurar o workflow no n8n para suportar a criação de tarefas via áudio e texto, integrando-se ao Hub Central do OpsControl no Supabase.

## Fluxo Lógico do n8n

1.  **Webhook Node**: Recebe notificações da Evolution API (`messages.upsert`).
2.  **Code Node**: Extrai metadados (Telefone, ID, Tipo de Mensagem).
3.  **Switch Node**:
    - Se **Texto/Botão**: Envia direto para a Edge Function `webhook-response`.
    - Se **Áudio**:
        1.  **HTTP Request**: Faz o download do arquivo `.ogg` da Evolution API.
        2.  **OpenAI Node (Whisper)**: Converte áudio em texto.
        3.  **HTTP Request**: Envia a transcrição para a `webhook-response` com `responseType: "audio_transcription"`.

## Template do Nó de Processamento (Code Node)

Substitua o código do seu nó de processamento por este:

```javascript
const data = $json.data || {};
const key = data.key || {};
const message = data.message || {};

let responseType = 'text';
let responseValue = '';

// Detecta o tipo de interação
if (message.buttonsResponseMessage) {
  responseType = 'button';
  responseValue = message.buttonsResponseMessage.selectedButtonId;
} else if (message.audioMessage) {
  responseType = 'audio_pending';
} else if (message.conversation) {
  responseValue = message.conversation;
} else if (message.extendedTextMessage) {
  responseValue = message.extendedTextMessage.text;
}

return {
  messageId: key.id,
  phone: key.remoteJid?.replace('@s.whatsapp.net', '').replace('@c.us', ''),
  pushName: data.pushName,
  responseType,
  responseValue,
  instance: $json.instance,
  rawMessage: message
};
```

## Configuração do Download de Áudio (Evolution API)

Se o `responseType` for `audio_pending`, use um nó HTTP Request:
- **URL**: `{{ $env.EVOLUTION_URL }}/chat/getBase64FromMediaMessage/{{ $json.instance }}`
- **Method**: `POST`
- **Body**: 
  ```json
  { "message": {{ JSON.stringify($json.rawMessage) }} }
  ```

## Configuração da OpenAI (Whisper)

- **Resource**: `Audio`
- **Operation**: `Transcribe`
- **File Content**: *(Binary do nó anterior)*
- **Language**: `pt`

## Configuração Final (Envio para Supabase)

Envie o payload final para a URL da sua Edge Function:
`{{ $env.SUPABASE_URL }}/functions/v1/webhook-response`

> [!IMPORTANT]
> Certifique-se de que a variável de ambiente `OPENAI_API_KEY` esteja configurada no seu painel do Supabase para que a criação automática da tarefa funcione.
