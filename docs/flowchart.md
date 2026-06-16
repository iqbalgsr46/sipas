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

## 4. Flowchart AI Assistant Chat (with NVIDIA Primary)
```mermaid
graph TD
    A([Mulai]) --> B[User Buka AI Assistant]
    B --> C[/Ketik Pertanyaan/]
    C --> D{Model Dipilih?}
    D -->|NVIDIA| E[Selected: NVIDIA]
    D -->|Gemini| F[Selected: Gemini]
    D -->|DeepSeek| G[Selected: DeepSeek]
    
    E --> H[Kirim ke /api/ai/chat dengan Model]
    F --> H
    G --> H
    
    H --> I[Call Selected AI Provider]
    I --> J{Provider Available?}
    J -->|Error| K[Trigger Fallback Chain]
    J -->|Success| L[Continue]
    
    K --> M[Try Next Provider]
    M --> I
    
    L --> N{AI Butuh Tool?}
    N -->|Ya| O[AI Recognize Intent]
    N -->|Tidak| P[Format Response]
    
    O --> Q[Select Appropriate Tool]
    Q --> R[AI Call Tool]
    R --> S[Tool Query Supabase]
    S --> T[Return Data ke AI]
    T --> P
    
    P --> U[Stream Response ke User]
    U --> V[Tampilkan di Chat UI dengan Model Info]
    V --> W{User Lanjut Chat?}
    W -->|Ya| C
    W -->|Tidak| Z([Selesai])
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

## 6. Flowchart Telegram Bot Query (with NVIDIA Primary)
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
    K --> L{Primary: NVIDIA}
    L -->|Try NVIDIA| M[Call NVIDIA NIM]
    M -->|Success| N[Get Response]
    M -->|Error| O[Fallback ke Gemini]
    O -->|Try Gemini| P[Call Gemini API]
    P -->|Success| N
    P -->|Error| Q[Fallback ke DeepSeek]
    Q -->|Try DeepSeek| R[Call DeepSeek API]
    R -->|Success| N
    R -->|Error| S[Fallback ke OpenRouter]
    S -->|Try OpenRouter| T[Call OpenRouter]
    T --> N
    
    N --> U{AI Called Tool?}
    U -->|Ya| V[Execute Tool]
    V --> W[Query Supabase]
    W --> X[Return Data]
    X --> Y[AI Format Result]
    U -->|Tidak| Y
    
    Y --> AA{Response Valid?}
    AA -->|Tidak| AB[Fallback Message]
    AA -->|Ya| AC[Format untuk Telegram]
    AB --> AC
    AC --> AD[Send Message via Telegram API]
    AD --> Z
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

---

## 11. Flowchart AI Intent Recognition (v2.2.0)
```mermaid
graph TD
    A([User Query Diterima]) --> B[AI System Prompt: Think Step-by-Step]
    B --> C{Analyze Query Intent}
    
    C -->|"berapa/jumlah surat"| D[Intent: Statistik]
    C -->|"cari/tampilkan surat"| E[Intent: Search]
    C -->|"buatkan/buat surat"| F[Intent: Create]
    C -->|"approval/setujui"| G[Intent: Approval]
    C -->|"detail/info surat"| H[Intent: Details]
    C -->|"other"| I[Intent: General Query]
    
    D --> J[Select Tool: statistik_surat]
    E --> K[Select Tool: cari_surat_masuk]
    F --> L[Select Tool: buat_surat_keluar]
    G --> M[Select Tool: approval_surat]
    H --> N[Select Tool: detail_surat]
    I --> O[AI Tanya Clarifying Question]
    
    J --> P[Execute Tool]
    K --> P
    L --> P
    M --> P
    N --> P
    O --> Q[Ulangi Intent Recognition]
    Q --> C
    
    P --> R[Tool Return Data]
    R --> S[AI Format Response dengan Context]
    S --> T[Return ke User dengan Tool Info]
    T --> U([Selesai])
```

---

## 12. Flowchart AI Fallback Mechanism (v2.2.0)
```mermaid
graph TD
    A([API Call Started]) --> B[Try Selected/Primary Provider]
    B --> C{Response Success?}
    
    C -->|Success| D[Return Response]
    C -->|Error| E{Error Type?}
    
    E -->|Timeout| F[Fallback Triggered]
    E -->|Quota Limit| F
    E -->|API Error| F
    E -->|Invalid Key| F
    E -->|Network Error| F
    
    F --> G[Log Error Info]
    G --> H{Current Provider}
    
    H -->|NVIDIA Failed| I[Try Gemini]
    H -->|Gemini Failed| J[Try DeepSeek]
    H -->|DeepSeek Failed| K[Try OpenRouter]
    H -->|OpenRouter Failed| L[All Providers Failed]
    
    I --> M{Success?}
    J --> M
    K --> M
    
    M -->|Success| N[Add Fallback Notice to Response]
    M -->|Failed| O[Move to Next Provider]
    O --> H
    
    L --> P[Return Error Message]
    N --> D
    P --> D
    
    D --> Q[Send Response to User]
    Q --> R([Complete])
```
