# Flowchart Sistem

## 1. Flowchart Login
```mermaid
graph TD
    A([Mulai]) --> B[/Masukkan Email & Password/]
    B --> C{Kredensial Valid?}
    C -->|Tidak| D[Tampilkan Pesan Error]
    D --> B
    C -->|Ya| E[Generate JWT Token]
    E --> F[Simpan Session di LocalStorage]
    F --> G[Arahkan ke Dashboard]
    G --> H([Selesai])
```

---

## 2. Flowchart Input Surat Masuk
```mermaid
graph TD
    A([Mulai]) --> B{User Role?}
    B -->|Bukan Staf/Admin| C[Access Denied]
    C --> Z([Selesai])
    B -->|Staf/Admin| D[Buka Halaman Surat Masuk]
    D --> E[Klik Tambah Surat Masuk]
    E --> F[/Input Data Surat/]
    F --> G[Upload Lampiran Optional]
    G --> H[Klik Simpan]
    H --> I{Validasi Form}
    I -->|Gagal| J[Tampilkan Error]
    J --> F
    I -->|Berhasil| K[Insert ke Database]
    K --> L[Tampilkan Success Toast]
    L --> M[Refresh Tabel Surat Masuk]
    M --> Z
```

---

## 3. Flowchart Surat Keluar & Approval
```mermaid
graph TD
    A([Mulai]) --> B[Staf Input Draf Surat Keluar]
    B --> C[/Isi Form Surat/]
    C --> D{Status Dipilih?}
    D -->|Draft| E[Simpan sebagai Draft]
    E --> Z([Selesai])
    D -->|Diajukan| F[Simpan dengan Status: diajukan]
    F --> G[Insert Notification untuk Pimpinan]
    G --> H[Trigger Realtime Event]
    H --> I[Pimpinan Terima Toast Notification]
    I --> J[Pimpinan Buka Halaman Approval]
    J --> K[Lihat Detail Surat]
    K --> L{Keputusan Pimpinan}
    L -->|Setuju| M[Update Status: disetujui]
    L -->|Tolak| N[Update Status: ditolak]
    L -->|Skip| Z
    M --> O[Insert Notification untuk Staf]
    N --> O
    O --> P[Trigger Realtime Event]
    P --> Q[Staf Terima Notification]
    Q --> Z
```

---

## 4. Flowchart AI Assistant Chat
```mermaid
graph TD
    A([Mulai]) --> B[User Buka AI Assistant]
    B --> C[/Ketik Pertanyaan/]
    C --> D[Kirim ke /api/ai/chat]
    D --> E{AI Provider Available?}
    E -->|Gemini OK| F[Call Gemini API]
    E -->|Gemini Limit| G[Fallback ke DeepSeek]
    G -->|DeepSeek OK| H[Call DeepSeek API]
    G -->|DeepSeek Failed| I[Fallback ke OpenRouter]
    I --> J[Call OpenRouter API]
    
    F --> K{AI Butuh Tool?}
    H --> K
    J --> K
    
    K -->|Ya| L[AI Call Tool]
    L --> M[Tool Query Supabase]
    M --> N[Return Data ke AI]
    N --> O[AI Format Response]
    
    K -->|Tidak| O
    
    O --> P[Stream Response ke User]
    P --> Q[Tampilkan di Chat UI]
    Q --> R{User Lanjut Chat?}
    R -->|Ya| C
    R -->|Tidak| Z([Selesai])
```

---

## 5. Flowchart Telegram Bot Registration
```mermaid
graph TD
    A([Mulai]) --> B[User Cari Bot di Telegram]
    B --> C[Ketik /start]
    C --> D[Bot Terima Webhook]
    D --> E[/api/telegram Route Handler]
    E --> F{Command = /start?}
    F -->|Tidak| G[Proses sebagai Query]
    F -->|Ya| H[Get Telegram User ID]
    H --> I[Generate Welcome Message]
    I --> J[Tampilkan Telegram ID ke User]
    J --> K[User Screenshot/Copy ID]
    K --> L[User Kirim ID ke Admin]
    L --> M[Admin Login ke SIPAS Web]
    M --> N[Buka Halaman Users]
    N --> O[Edit User]
    O --> P[Input Telegram ID]
    P --> Q[Klik Simpan]
    Q --> R[Update Database]
    R --> S[User Sekarang Bisa Query Bot]
    S --> Z([Selesai])
```

---

## 6. Flowchart Telegram Bot Query
```mermaid
graph TD
    A([Mulai]) --> B[User Kirim Pesan ke Bot]
    B --> C[Telegram API Kirim Webhook]
    C --> D[/api/telegram POST Handler]
    D --> E[Extract Message & User ID]
    E --> F{User ID Terdaftar?}
    F -->|Tidak| G[Balas: Akses Ditolak]
    G --> Z([Selesai])
    F -->|Ya| H[Get User Data dari Database]
    H --> I[Send Typing Indicator]
    I --> J[Build AI System Prompt]
    J --> K[Call AI dengan Tools]
    K --> L{AI Provider}
    L -->|Gemini| M[Try Gemini]
    M -->|Success| N[Get Response]
    M -->|Failed| O[Try DeepSeek]
    O -->|Success| N
    O -->|Failed| P[Try OpenRouter]
    P --> N
    
    N --> Q{AI Called Tool?}
    Q -->|Ya| R[Execute Tool]
    R --> S[Query Supabase]
    S --> T[Return Data]
    T --> U[AI Format Result]
    Q -->|Tidak| U
    
    U --> V{Response Valid?}
    V -->|Tidak| W[Fallback Message]
    V -->|Ya| X[Format untuk Telegram]
    W --> X
    X --> Y[Send Message via Telegram API]
    Y --> Z
```

---

## 7. Flowchart Approval via Telegram
```mermaid
graph TD
    A([Mulai]) --> B[Pimpinan Query: Ada surat pending?]
    B --> C[Bot Query Database]
    C --> D[Tampilkan List Surat Pending]
    D --> E[Pimpinan: Approve surat XXX]
    E --> F[Bot Parse Command]
    F --> G{User Role = Pimpinan?}
    G -->|Tidak| H[Balas: Akses Ditolak]
    H --> Z([Selesai])
    G -->|Ya| I[AI Call Tool: approve_surat]
    I --> J[Tool Update Database]
    J --> K{Update Success?}
    K -->|Tidak| L[Balas: Error Message]
    L --> Z
    K -->|Ya| M[Insert Notification]
    M --> N[Trigger Realtime Event]
    N --> O[Balas: Surat Berhasil Disetujui]
    O --> P[Staf Terima Notif di Web/Telegram]
    P --> Z
```

---

## 8. Flowchart Document Upload & AI Analysis
```mermaid
graph TD
    A([Mulai]) --> B[User Upload File]
    B --> C{File Valid?}
    C -->|Tidak| D[Error: Invalid File Type/Size]
    D --> Z([Selesai])
    C -->|Ya| E[Upload ke Supabase Storage]
    E --> F[Get File URL]
    F --> G[Extract Text dari File]
    G --> H{File Type}
    H -->|PDF| I[PDF Text Extraction]
    H -->|DOCX| J[DOCX Text Extraction]
    H -->|TXT| K[Read Plain Text]
    I --> L[Combine Text]
    J --> L
    K --> L
    L --> M[Send Text + Context ke AI]
    M --> N[AI Analyze Document]
    N --> O{Analysis Task}
    O -->|Summarize| P[Generate Summary]
    O -->|Extract Data| Q[Extract Key Info]
    O -->|Classify| R[Classify Document]
    P --> S[Return Result]
    Q --> S
    R --> S
    S --> T[Display to User]
    T --> Z
```

---

## 9. Flowchart Real-time Notification
```mermaid
graph TD
    A([Event Trigger]) --> B{Event Type?}
    B -->|Surat Diajukan| C[Create Notification Record]
    B -->|Surat Approved| C
    B -->|Surat Rejected| C
    C --> D[Insert ke Table notifications]
    D --> E[Supabase Realtime Broadcast]
    E --> F{User Online?}
    F -->|Web| G[Toast Notification di Web]
    F -->|Telegram| H[Push via Telegram Bot]
    F -->|Both| I[Kirim ke Web & Telegram]
    G --> J[User Click Notification]
    H --> J
    I --> J
    J --> K[Navigate to Related Page]
    K --> Z([Selesai])
```

---

## 10. Flowchart Dark Mode Toggle
```mermaid
graph TD
    A([Mulai]) --> B[User Klik Theme Toggle]
    B --> C{Current Theme?}
    C -->|Light| D[Set Theme: Dark]
    C -->|Dark| E[Set Theme: Light]
    D --> F[Update LocalStorage]
    E --> F
    F --> G[Apply Theme Classes]
    G --> H[Update Tailwind Classes]
    H --> I[Trigger Re-render]
    I --> J[Theme Berubah]
    J --> Z([Selesai])
```
