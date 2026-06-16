# SIPAS v2.0 Changelog & Documentation Update

**Update Date**: June 16, 2026  
**Version**: 2.0.0  
**Status**: Documentation Complete

---

## 🎉 Major Features Added

### 1. AI Assistant (Web)
- **Multi-model AI Chat** dengan fallback system
  - Primary: Google Gemini 2.0 Flash
  - Fallback #1: DeepSeek Chat
  - Fallback #2: OpenRouter Free Models
- **AI Tools Integration**:
  - `statistik_surat` - Query jumlah surat
  - `cari_surat` - Search surat by criteria
  - `detail_surat` - Get surat details
  - `buat_surat_keluar` - Create new surat (staf only)
  - `approval_surat` - Approve/reject surat (pimpinan only)
- **Document Upload & OCR**
  - Support PDF, images (JPG, PNG)
  - AI Vision untuk extract & analyze
  - Context-aware chat dengan dokumen

### 2. Telegram Bot Integration
- **Bot Username**: `@sipas_karawang_bot`
- **Webhook URL**: `https://sipas.vercel.app/api/telegram`
- **Features**:
  - Self-registration via `/start` command
  - Whitelist-based access control (telegram_id)
  - Full AI assistant via chat
  - All SIPAS tools available
  - Role-based permissions sama dengan web
- **Known Issue**: Tool results returning `undefined` (under investigation)

### 3. Dark Mode
- Full dark mode support dengan TailAdmin template colors
- Toggle di header, persistent via localStorage
- Theme-aware components (charts, badges, SVGs)

### 4. User Management Enhancement
- Tambah field `telegram_id` untuk integrasi bot
- Admin dapat set Telegram ID via edit user
- Unique constraint & indexed untuk performa

---

## 📚 Documentation Updates

### ✅ Completed Updates

| File | Status | Changes |
| :--- | :---: | :--- |
| `PRD.md` | ✅ | Updated to v2.0 with AI & Telegram features |
| `system-architecture.md` | ✅ | Added AI providers, Telegram flow, deployment diagram |
| `api-documentation.md` | ✅ | Added `/api/ai/*` & `/api/telegram/*` endpoints |
| `use-case-diagram.md` | ✅ | Added Telegram Bot & AI Assistant use cases |
| `flowchart.md` | ✅ | Added Telegram registration & query flows, AI chat & upload |
| `ERD.md` | ✅ | Added `telegram_id` field, constraints, indexes |
| `role-permission-matrix.md` | ✅ | Added AI & Telegram permissions per role |
| `activity-diagram.md` | ✅ | Added 4 new sequence diagrams (Telegram, AI) |
| `testing-scenario.md` | ✅ | Added 20+ test cases for Telegram & AI features |
| `cloning-guide.md` | ✅ | Added AI keys, Telegram setup, webhook configuration |

---

## 🗄️ Database Changes

### New Columns
```sql
ALTER TABLE users ADD COLUMN telegram_id TEXT;
ALTER TABLE users ADD CONSTRAINT users_telegram_id_unique UNIQUE (telegram_id);
CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users (telegram_id) WHERE telegram_id IS NOT NULL;
```

### Migration File
- `add-telegram-column.sql` (already executed in production)

---

## 🔧 Environment Variables Added

```env
# AI Providers
GOOGLE_GENERATIVE_AI_API_KEY=AIzaSy...
DEEPSEEK_API_KEY=sk-...
OPENROUTER_API_KEY=sk-or-v1-...

# Telegram Bot
TELEGRAM_BOT_TOKEN=1234567890:ABC...
NEXT_PUBLIC_SITE_URL=https://sipas.vercel.app
```

---

## 🐛 Known Issues

### 🔴 Critical
1. **Telegram Bot Tool Results Undefined**
   - **Status**: Open
   - **Description**: AI tools execute successfully (logs confirm data retrieval), but AI SDK returns `result = undefined`
   - **Impact**: Bot tidak dapat memberikan data response yang informatif
   - **Workaround**: None currently, under investigation
   - **Suspected Cause**: AI SDK integration issue with tool result handling

### 🟡 Medium
_(None)_

### 🟢 Minor
_(None)_

---

## 🚀 Deployment Status

- **Production URL**: https://sipas-sistem-persuratan-kabkarawang.vercel.app
- **Telegram Webhook**: ✅ Active
- **AI Models**: ✅ All operational
- **Database**: ✅ Migrated successfully

---

## 📊 Testing Summary

| Category | Total Tests | Passed | Failed | Pending |
| :--- | :---: | :---: | :---: | :---: |
| Web App | 12 | 12 | 0 | 0 |
| Telegram Bot | 15 | 10 | 0 | 5 (tool results issue) |
| AI Models | 3 | 3 | 0 | 0 |
| Security | 6 | 6 | 0 | 0 |
| **TOTAL** | **36** | **31** | **0** | **5** |

**Pass Rate**: 86% (31/36)

---

## 🎯 Next Steps (Future Development)

1. **Fix Telegram Bot Tool Results** - Priority: High
2. **Add Telegram Push Notifications** - Notifikasi approval via Telegram
3. **AI Conversation History** - Save & resume chat sessions
4. **Multi-language Support** - Indonesian & English
5. **Analytics Dashboard** - AI usage statistics, bot metrics
6. **Advanced AI Tools** - Generate documents, auto-categorization

---

## 👥 Contributors

- **Development**: Wulan (with AI assistance)
- **Documentation**: Comprehensive update on June 16, 2026
- **Testing**: Manual testing on production environment

---

## 📝 Notes

- All documentation now reflects actual v2.0 implementation
- Screenshots can be added to docs for better clarity
- Video tutorials dapat dibuat untuk onboarding users
- Consider creating API postman collection for easier testing

---

**Documentation Status**: ✅ Complete  
**Last Updated**: June 16, 2026, 23:30 WIB
