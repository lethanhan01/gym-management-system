# Line Messaging API

Nguồn: `server/src/line-messaging/line-messaging.controller.ts`, `server/src/main.ts`.

Base path: `/api/v1/line`

## Endpoint Summary

| Method | URL | Auth | Permission | Mô tả |
|---|---|---|---|---|
| POST | `/api/v1/line/webhook` | Public | Không có | Nhận sự kiện webhook từ LINE |

## API Details

### Nhận sự kiện webhook từ LINE - POST `/api/v1/line/webhook`

Headers:

| Header | Required | Mô tả |
|---|---:|---|
| `x-line-signature` | No | Chữ ký LINE webhook, truyền vào service để xác thực/xử lý |
| `Content-Type: application/json` | Yes | Route này dùng `express.raw({ type: 'application/json' })` |

Request body: raw JSON buffer từ LINE. Payload thực tế theo LINE Webhook event; ví dụ đầy đủ dạng JSON:

```json
{
  "destination": "line-destination-id",
  "events": [
    {
      "type": "message",
      "mode": "active",
      "timestamp": 1721280000000,
      "source": {
        "type": "user",
        "userId": "Uxxxxxxxx"
      },
      "webhookEventId": "01J00000000000000000000000",
      "deliveryContext": {
        "isRedelivery": false
      },
      "replyToken": "reply-token",
      "message": {
        "id": "message-id",
        "type": "text",
        "quoteToken": "quote-token",
        "text": "Xin chao"
      }
    }
  ]
}
```

Response body:

```json
{
  "success": true,
  "data": {
    "handled": true
  }
}
```

Errors: `400 LINE_WEBHOOK_RAW_BODY_REQUIRED`, các lỗi xác thực webhook từ service.
