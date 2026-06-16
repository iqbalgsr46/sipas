# Activity Diagram - SIPAS v2.0

## 1. Proses Pembuatan dan Approval Surat Keluar (Web)

```mermaid
sequenceDiagram
    actor Staf
    participant Sistem
    participant Database
    actor Pimpinan

    Staf->>Sistem: Isi form & Ajukan Surat Keluar
    Sistem->>Database: Insert surat (status: 'menunggu_approval')
    Database-->>Sistem: OK
    Sistem->>Database: Insert notifikasi untuk Pimpinan
    Sistem-->>Pimpinan: Realtime Toast Notification
    
    Note over Pimpinan,Sistem: Pimpinan Login & Buka Approval
    
    Pimpinan->>Sistem: Lihat Detail Surat
    Pimpinan->>Sistem: Klik "Setujui" / "Tolak"
    Sistem->>Database: Update status surat
    Database-->>Sistem: OK
    Sistem->>Database: Insert notifikasi untuk Staf
    Sistem-->>Staf: Realtime Toast Notification (Surat Disetujui/Ditolak)
```

---

## 2. Telegram Bot - Alur Registrasi User

```mermaid
sequenceDiagram
    actor User
    participant TelegramBot
    participant SIPAS_API
    participant Database
    actor Admin

    User->>TelegramBot: /start
    TelegramBot->>SIPAS_API: POST /api/telegram (webhook)
    SIPAS_API->>Database: Check telegram_id exists?
    Database-->>SIPAS_API: Not found
    SIPAS_API->>TelegramBot: "Telegram ID Anda: 1234567890..."
    TelegramBot-->>User: Kirim screenshot/copy ID ke admin
    
    Note over User,Admin: User mengirim ID ke Admin
    
    Admin->>SIPAS_API: Buka halaman Users
    Admin->>SIPAS_API: Edit user, input telegram_id
    SIPAS_API->>Database: UPDATE users SET telegram_id = '1234567890'
    Database-->>SIPAS_API: OK
    
    User->>TelegramBot: Berapa surat masuk hari ini?
    TelegramBot->>SIPAS_API: POST /api/telegram
    SIPAS_API->>Database: Check telegram_id exists?
    Database-->>SIPAS_API: Found! (user authenticated)
    SIPAS_API->>SIPAS_API: Call AI with tools
    SIPAS_API->>Database: Query statistik_surat
    Database-->>SIPAS_API: Result: 5 surat
    SIPAS_API->>TelegramBot: "Hari ini ada 5 surat masuk"
    TelegramBot-->>User: Tampilkan response
```

---

## 3. Telegram Bot - Alur Query Data via AI

```mermaid
sequenceDiagram
    actor User
    participant TelegramBot
    participant SIPAS_API
    participant AI_Models
    participant Database

    User->>TelegramBot: "Cari surat tentang anggaran"
    TelegramBot->>SIPAS_API: POST /api/telegram (webhook)
    SIPAS_API->>Database: Verify telegram_id & get user role
    Database-->>SIPAS_API: Verified (role: staf)
    
    SIPAS_API->>AI_Models: Call Gemini with tool: cari_surat
    AI_Models->>Database: SELECT * FROM surat WHERE perihal ILIKE '%anggaran%'
    Database-->>AI_Models: [list of surat]
    AI_Models-->>SIPAS_API: Formatted response
    
    alt Gemini Success
        SIPAS_API->>TelegramBot: Send message with surat list
    else Gemini Failed
        SIPAS_API->>AI_Models: Fallback to DeepSeek
        AI_Models->>Database: Retry query
        Database-->>AI_Models: [list of surat]
        AI_Models-->>SIPAS_API: Formatted response
        SIPAS_API->>TelegramBot: Send message
    end
    
    TelegramBot-->>User: Tampilkan hasil pencarian
```

---

## 4. AI Assistant - Upload & Analisis Dokumen

```mermaid
sequenceDiagram
    actor User
    participant Web_UI
    participant AI_API
    participant AI_Vision
    participant Database

    User->>Web_UI: Upload file PDF/image di AI Assistant
    Web_UI->>AI_API: POST /api/ai/upload (multipart/form-data)
    AI_API->>AI_API: Convert to base64
    AI_API->>AI_Vision: Call Gemini Vision model
    AI_Vision-->>AI_API: OCR result + content analysis
    AI_API-->>Web_UI: Return extracted text & insights
    Web_UI-->>User: Tampilkan hasil OCR + AI summary
    
    Note over User,Web_UI: User bisa lanjut chat dengan konteks dokumen
    
    User->>Web_UI: "Buatkan surat balasan dari dokumen ini"
    Web_UI->>AI_API: POST /api/ai/chat
    AI_API->>AI_Vision: Generate dengan context dokumen
    AI_API->>Database: INSERT surat_keluar (via tool: buat_surat_keluar)
    Database-->>AI_API: Success
    AI_API-->>Web_UI: "Surat berhasil dibuat dengan nomor..."
    Web_UI-->>User: Tampilkan draft surat baru
```

---

## 5. Approval Surat via Telegram Bot

```mermaid
sequenceDiagram
    actor Pimpinan
    participant TelegramBot
    participant SIPAS_API
    participant AI_Models
    participant Database
    actor Staf

    Staf->>Database: Ajukan surat keluar (status: menunggu_approval)
    Database->>Database: Insert notification untuk Pimpinan
    
    Pimpinan->>TelegramBot: "Ada surat pending approval?"
    TelegramBot->>SIPAS_API: POST /api/telegram
    SIPAS_API->>AI_Models: Call with tool: statistik_surat
    AI_Models->>Database: Query pending count
    Database-->>AI_Models: 3 surat pending
    AI_Models-->>SIPAS_API: Formatted answer
    SIPAS_API->>TelegramBot: "Ada 3 surat menunggu approval"
    TelegramBot-->>Pimpinan: Tampilkan info
    
    Pimpinan->>TelegramBot: "Setujui surat nomor 001/2024"
    TelegramBot->>SIPAS_API: POST /api/telegram
    SIPAS_API->>Database: Verify role = 'pimpinan'
    Database-->>SIPAS_API: Verified
    SIPAS_API->>AI_Models: Call with tool: approval_surat
    AI_Models->>Database: UPDATE surat SET status='disetujui', approved_by=...
    Database-->>AI_Models: Success
    Database->>Database: Insert notification untuk Staf
    AI_Models-->>SIPAS_API: "Surat berhasil disetujui"
    SIPAS_API->>TelegramBot: Send success message
    TelegramBot-->>Pimpinan: ✅ Surat 001/2024 disetujui
    
    Note over Staf: Staf menerima notifikasi realtime di web
```

---

## Notes

- Semua aktivitas Telegram Bot terintegrasi penuh dengan database SIPAS
- AI Models menggunakan sistem fallback: Gemini → DeepSeek → OpenRouter
- Role-based access control diterapkan baik di web maupun Telegram Bot
- Real-time notifications menggunakan Supabase Realtime Channels
