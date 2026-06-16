# Product Requirements Document (PRD)
**Sistem Informasi Persuratan (SIPAS) v2.0**

### 🎯 Tujuan Sistem
- Digitalisasi pencatatan surat masuk dan surat keluar
- Sentralisasi data persuratan dalam satu sistem berbasis web
- Mempercepat proses persetujuan (approval) secara elektronik
- **Integrasi AI Assistant** untuk membantu pengguna mengelola persuratan
- **Akses Multi-Platform** melalui web dan Telegram Bot

### 👥 Pengguna & Hak Akses
- **Admin**: Konfigurasi sistem, manajemen pengguna, dan integrasi Telegram Bot
- **Pimpinan**: Meninjau dan menyetujui surat keluar melalui web atau Telegram
- **Staf**: Mencatat surat masuk dan membuat draf surat keluar

### ⚙️ Fitur Utama

#### 📋 Manajemen Surat
- **Surat Masuk**: Pencatatan data surat yang diterima instansi
- **Surat Keluar**: Pembuatan draf surat dengan workflow approval
- **Approval System**: Pimpinan dapat approve/reject surat keluar
- **Search & Filter**: Pencarian berdasarkan nomor, perihal, pengirim/tujuan
- **Statistik Real-time**: Dashboard dengan grafik dan metrics

#### 🤖 AI Assistant (Powered by Gemini, DeepSeek, OpenRouter)
- **Natural Language Query**: Tanya tentang surat dengan bahasa natural
- **Auto-Suggest**: Rekomendasi berdasarkan pola surat sebelumnya
- **Smart Search**: Pencarian semantik dengan AI
- **Document Upload**: Upload dan analisis dokumen surat
- **Multi-Provider Fallback**: Gemini → DeepSeek → OpenRouter

#### 📱 Telegram Bot Integration
- **Self-Registration**: User chat `/start` untuk dapatkan Telegram ID
- **Whitelist System**: Hanya user terdaftar yang bisa akses
- **Full AI Features**: Semua fitur AI Assistant tersedia di Telegram
- **Role-Based Access**: Akses disesuaikan dengan role user
- **Real-time Notifications**: Notifikasi instant untuk approval & updates

#### 🔐 Keamanan & Autentikasi
- **Supabase Auth**: Login aman dengan email/password
- **Row Level Security (RLS)**: Data isolation per user
- **Role-Based Access Control (RBAC)**: Permission granular per role
- **Telegram Whitelist**: Bot hanya untuk user terdaftar

#### 🔔 Notifikasi Realtime
- **Web Notifications**: Toast notifications saat ada update
- **Telegram Notifications**: Push notifications via bot
- **Realtime Updates**: Supabase Realtime untuk sync instant

### 🚀 Teknologi Stack

#### Frontend
- **Framework**: Next.js 16.2.4 (App Router, Turbopack)
- **Styling**: Tailwind CSS, Shadcn UI components
- **Dark Mode**: Next-themes dengan persistent state
- **Charts**: Recharts untuk visualisasi data

#### Backend & Database
- **BaaS**: Supabase (PostgreSQL, GoTrue Auth, Realtime)
- **API**: PostgREST auto-generated REST API
- **Storage**: Supabase Storage untuk file upload

#### AI Integration
- **Primary**: Google Gemini 2.5 Flash
- **Fallback 1**: DeepSeek Chat
- **Fallback 2**: OpenRouter (free models)
- **SDK**: Vercel AI SDK v4

#### Telegram Bot
- **Platform**: Telegram Bot API
- **Webhook**: Vercel Serverless Functions
- **Integration**: Shared AI tools dengan web app

### 📊 Deployment & Infrastructure
- **Hosting**: Vercel (Serverless, Edge Functions)
- **Database**: Supabase Cloud (PostgreSQL managed)
- **Domain**: Custom domain via Vercel
- **CI/CD**: GitHub Actions → Vercel auto-deploy

### 🔄 Update dari Versi Sebelumnya

#### v1.0 → v2.0
- ✅ Added: AI Assistant dengan multi-provider fallback
- ✅ Added: Telegram Bot integration
- ✅ Added: Dark mode support
- ✅ Added: Real-time charts dan statistics
- ✅ Added: Document upload dan AI analysis
- ✅ Added: Telegram ID management di user profile
- ✅ Improved: Error handling dan logging
- ✅ Improved: UI/UX dengan TailAdmin template
