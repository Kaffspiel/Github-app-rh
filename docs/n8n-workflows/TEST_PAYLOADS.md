# Payloads de Teste para n8n (Evolution API)

Use estes exemplos de JSON para configurar e testar os nós do seu workflow no n8n.

## 1. Mensagem de Texto (Comando de Tarefa)
Copie e cole este JSON no "Test Step" ou como "Mock Data" no seu primeiro nó de Webhook.

```json
{
  "event": "messages.upsert",
  "instance": "teste",
  "data": {
    "key": {
      "remoteJid": "5521999999999@s.whatsapp.net",
      "fromMe": false,
      "id": "ABCD1234EFGH5678"
    },
    "pushName": "Guto",
    "message": {
      "conversation": "Criar tarefa de revisão para Alexandre amanhã"
    },
    "messageTimestamp": 1707165000
  }
}
```

## 2. Mensagem de Áudio (Gatilho para IA)
Use este para testar o caminho de áudio e download de mídia.

```json
{
  "event": "messages.upsert",
  "instance": "teste",
  "data": {
    "key": {
      "remoteJid": "5521999999999@s.whatsapp.net",
      "fromMe": false,
      "id": "AUDIO_MSG_ID_001"
    },
    "pushName": "Guto",
    "message": {
      "audioMessage": {
        "url": "https://mmg.whatsapp.net/v/t62.7114-24/...",
        "mimetype": "audio/ogg; codecs=opus",
        "fileSha256": "base64...",
        "fileLength": "123456",
        "seconds": 5,
        "mediaKey": "base64..."
      }
    },
    "messageTimestamp": 1707165100
  }
}
```

## 3. Status de Entrega (Update)
Útil se você estiver usando o Master Hub.

```json
{
  "event": "messages.update",
  "instance": "teste",
  "data": {
    "key": {
      "remoteJid": "5521988887777@s.whatsapp.net",
      "fromMe": true,
      "id": "SENT_MSG_ID_99"
    },
    "status": "DELIVERY_ACK"
  }
}
```

---
### Como usar no n8n:
1. Abra o nó **Webhook**.
2. Clique em **Test Step**.
3. Vá na aba **JSON** da resposta de teste.
4. Cole um dos payloads acima.
5. Agora todos os nós seguintes (Code, HTTP Request) terão dados para você mapear usando o mouse!
