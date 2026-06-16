# API Documentation

> **Catatan**: SIPAS menggunakan **Supabase JS SDK** (PostgREST) untuk database operations dan **Vercel Serverless Functions** untuk custom endpoints. API dipanggil melalui abstraksi JavaScript `supabase.from()` atau fetch ke custom endpoints.

---

## Table of Contents
1. [Supabase Database API](#supabase-database-api)
2. [Custom API Endpoints](#custom-api-endpoints)
3. [AI Assistant API](#ai-assistant-api)
4. [Telegram Bot API](#telegram-bot-api)
5. [Authentication](#authentication)

---

## Supabase Database API

### Base URL
```
https://ldqyvxcrtqxcahjevcad.supabase.co/rest/v1
```

### Headers Required
```http
apikey: <SUPABASE_ANON_KEY>
Authorization: Bearer <USER_JWT_TOKEN>
Content-Type: application/json
```

---

### 1. Surat Masuk Endpoints

#### GET /surat_masuk
Mengambil daftar surat masuk.

**Query Parameters:**
- `limit` (optional): Jumlah data (default: 10)
- `order` (optional): Urutan data (default: created_at.desc)
- Filter: Gunakan PostgREST query syntax

**Response (200 OK):**
```json
[
  {
    "id": "uuid-surat-masuk",
    "nomor_surat": "001/SM/2026",
    "tanggal_surat": "2026-06-16",
    "pengirim": "Dinas Pendidikan",
    "perihal": "Undangan Rapat Koordinasi",
    "status": "diproses",
    "created_by": "uuid-user",
    "created_at": "2026-06-16T10:00:00Z"
  }
]
```

#### POST /surat_masuk
Membuat surat masuk baru.

**Request Body:**
```json
{
  "nomor_surat": "001/SM/2026",
  "tanggal_surat": "2026-06-16",
  "pengirim": "Dinas Pendidikan",
  "perihal": "Undangan Rapat",
  "status": "belum_dibaca",
  "created_by": "uuid-user-staf"
}
```

**Response (201 Created):**
```json
{
  "id": "uuid-surat-masuk",
  "nomor_surat": "001/SM/2026",
  "created_at": "2026-06-16T10:00:00Z"
}
```

---

### 2. Surat Keluar Endpoints

#### GET /surat_keluar
Mengambil daftar surat keluar.

**RLS Rules:**
- **Staf**: Hanya melihat surat yang dibuat sendiri
- **Pimpinan**: Melihat semua surat dengan status `diajukan`
- **Admin**: Melihat semua surat

**Response (200 OK):**
```json
[
  {
    "id": "uuid-surat-keluar",
    "nomor_surat": "001/SK/2026",
    "tanggal_surat": "2026-06-16",
    "tujuan": "BPKAD",
    "perihal": "Laporan Keuangan Q2",
    "status": "menunggu_approval",
    "created_by": "uuid-user-staf",
    "approved_by": null,
    "created_at": "2026-06-16T10:00:00Z"
  }
]
```

#### POST /surat_keluar
Membuat draf surat keluar baru.

**Request Body:**
```json
{
  "nomor_surat": "001/SK/2026",
  "tanggal_surat": "2026-06-16",
  "tujuan": "Dinas Kesehatan",
  "perihal": "Permohonan Data",
  "status": "draft",
  "created_by": "uuid-user-staf"
}
```

**Response (201 Created):**
```json
{
  "id": "uuid-surat-keluar",
  "nomor_surat": "001/SK/2026",
  "status": "draft",
  "created_at": "2026-06-16T10:00:00Z"
}
```

#### PATCH /surat_keluar/{id}
Memperbarui status surat keluar (Approval).

**Request Body:**
```json
{
  "status": "disetujui",
  "approved_by": "uuid-user-pimpinan"
}
```

**Response (200 OK):**
```json
{
  "id": "uuid-surat-keluar",
  "status": "disetujui",
  "approved_by": "uuid-user-pimpinan",
  "updated_at": "2026-06-16T11:00:00Z"
}
```

---

### 3. Users Endpoints

#### GET /users
Mengambil daftar users (Admin only).

**Response (200 OK):**
```json
[
  {
    "id": "uuid-user",
    "email": "admin@sipas.go.id",
    "full_name": "Admin SIPAS",
    "username": "admin",
    "role": "admin",
    "status": "aktif",
    "telegram_id": "123456789",
    "created_at": "2026-01-01T00:00:00Z"
  }
]
```

#### PATCH /users/{id}
Update user data (Admin only).

**Request Body:**
```json
{
  "full_name": "Updated Name",
  "role": "pimpinan",
  "status": "aktif",
  "telegram_id": "987654321"
}
```

---

### 4. Notifications Endpoints

#### GET /notifications
Mengambil notifikasi user (filtered by user_id via RLS).

**Response (200 OK):**
```json
[
  {
    "id": "uuid-notif",
    "user_id": "uuid-user",
    "judul": "Surat Baru Perlu Approval",
    "pesan": "Surat 001/SK/2026 menunggu persetujuan Anda",
    "is_read": false,
    "created_at": "2026-06-16T10:00:00Z"
  }
]
```

---

## Custom API Endpoints

### Base URL
```
https://sipas-sistem-persuratan-kabkarawang.vercel.app/api
```

---

### 1. User Management

#### POST /api/users
Membuat user baru (Admin only).

**Headers:**
```http
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "newuser@sipas.go.id",
  "password": "password123",
  "full_name": "New User",
  "username": "newuser",
  "role": "staf"
}
```

**Response (200 OK):**
```json
{
  "user": {
    "id": "uuid-new-user",
    "email": "newuser@sipas.go.id",
    "created_at": "2026-06-16T10:00:00Z"
  }
}
```

**Response (400 Bad Request):**
```json
{
  "error": "Email already registered"
}
```

---

## AI Assistant API

### POST /api/ai/chat
Chat dengan AI Assistant.

**Authentication:** Required (JWT token)

**Request Body:**
```json
{
  "messages": [
    {
      "role": "user",
      "content": "Berapa surat masuk hari ini?"
    }
  ],
  "uploadedFiles": []
}
```

**Response (200 OK) - Streaming:**
```
data: {"type":"text-delta","textDelta":"Berdasarkan"}
data: {"type":"text-delta","textDelta":" data"}
...
data: {"type":"finish","finishReason":"stop"}
```

**AI Tools Available:**
- `cari_surat_masuk` - Search incoming letters
- `cari_surat_keluar` - Search outgoing letters
- `statistik_surat` - Get statistics
- `detail_surat_masuk` - Get letter details
- `detail_surat_keluar` - Get letter details
- `daftar_pending_approval` - List pending approvals
- `approve_surat` - Approve letter (Pimpinan only)
- `reject_surat` - Reject letter (Pimpinan only)

---

### POST /api/ai/upload
Upload dokumen untuk dianalisis AI.

**Authentication:** Required

**Request:** `multipart/form-data`
- `file`: PDF/DOCX/TXT file (max 10MB)

**Response (200 OK):**
```json
{
  "text": "Extracted text from document...",
  "fileUrl": "https://supabase.storage.url/..."
}
```

---

## Telegram Bot API

### POST /api/telegram
Webhook endpoint untuk Telegram Bot.

**Authentication:** None (validated by Telegram)

**Request Body (dari Telegram):**
```json
{
  "update_id": 123456789,
  "message": {
    "message_id": 1,
    "from": {
      "id": 8406125410,
      "first_name": "User",
      "language_code": "id"
    },
    "chat": {
      "id": 8406125410,
      "type": "private"
    },
    "date": 1781625602,
    "text": "Berapa surat masuk hari ini?"
  }
}
```

**Response (200 OK):**
```
ok
```

**Bot Commands:**
- `/start` - Registrasi dan dapatkan Telegram ID
- Any text - Query AI Assistant

**Bot Features:**
- ✅ Same AI tools as web app
- ✅ Natural language processing
- ✅ Role-based access control
- ✅ Real-time responses
- ✅ Markdown formatting

---

### GET /api/telegram/set-webhook
Register webhook URL ke Telegram.

**Authentication:** None (admin only via URL access)

**Response (200 OK):**
```json
{
  "webhook_url": "https://sipas.vercel.app/api/telegram",
  "telegram_response": {
    "ok": true,
    "result": true,
    "description": "Webhook was set"
  }
}
```

---

## Authentication

### Login Flow

#### 1. Sign In
```javascript
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@sipas.go.id',
  password: 'password123'
})
```

**Response:**
```json
{
  "user": {
    "id": "uuid-user",
    "email": "user@sipas.go.id",
    "role": "staf"
  },
  "session": {
    "access_token": "eyJhbGci...",
    "refresh_token": "...",
    "expires_at": 1781629200
  }
}
```

#### 2. Get Current Session
```javascript
const { data: { session } } = await supabase.auth.getSession()
```

#### 3. Sign Out
```javascript
await supabase.auth.signOut()
```

---

## Error Handling

### Standard Error Response
```json
{
  "error": "Error message here",
  "code": "ERROR_CODE",
  "details": "Additional details if any"
}
```

### HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (not authenticated)
- `403` - Forbidden (not authorized)
- `404` - Not Found
- `409` - Conflict (duplicate data)
- `500` - Internal Server Error

---

## Rate Limiting

### AI API
- **Gemini**: 15 requests/minute (free tier)
- **DeepSeek**: No hard limit (pay-per-use)
- **OpenRouter**: Variable by model

### Telegram Bot
- **Webhook**: No limit from our side
- **Telegram API**: 30 messages/second per bot

### Supabase
- **Free tier**: 500 MB database, 1 GB transfer/month
- **Pro tier**: Unlimited with connection pooling

---

## Webhook Setup

### Telegram Webhook
1. Deploy aplikasi ke Vercel
2. Set environment variable `TELEGRAM_BOT_TOKEN`
3. Set `NEXT_PUBLIC_SITE_URL` ke URL production
4. Visit `/api/telegram/set-webhook`
5. Verify webhook: `https://api.telegram.org/bot<TOKEN>/getWebhookInfo`

---

## Testing API

### Using cURL

**Get surat masuk:**
```bash
curl -X GET \
  'https://ldqyvxcrtqxcahjevcad.supabase.co/rest/v1/surat_masuk?limit=5' \
  -H 'apikey: <SUPABASE_ANON_KEY>' \
  -H 'Authorization: Bearer <JWT_TOKEN>'
```

**Create user:**
```bash
curl -X POST \
  'https://sipas.vercel.app/api/users' \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "test@sipas.go.id",
    "password": "password123",
    "full_name": "Test User",
    "username": "testuser",
    "role": "staf"
  }'
```

**Chat with AI:**
```bash
curl -X POST \
  'https://sipas.vercel.app/api/ai/chat' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <JWT_TOKEN>' \
  -d '{
    "messages": [
      {"role": "user", "content": "Berapa surat masuk hari ini?"}
    ]
  }'
```

---

## API Versioning

**Current Version:** `v1`

Future versions akan menggunakan prefix `/api/v2/...` untuk backward compatibility.
