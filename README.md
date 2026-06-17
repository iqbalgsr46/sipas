This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## 🚀 Quick Links

- **[⚡ Quick Start - NVIDIA API](./QUICK-START-AI.md)** - Setup AI dalam 5 menit! 🆓
- **[🤖 AI Models Comparison](./AI-MODELS-COMPARISON.md)** - Perbandingan lengkap AI models
- **[📖 NVIDIA API Setup Guide](./NVIDIA-API-SETUP.md)** - Setup AI gratis & tanpa limit
- **[📚 Cloning Guide](./docs/cloning-guide.md)** - Panduan lengkap instalasi project
- **[🏗️ System Architecture](./docs/system-architecture.md)** - Arsitektur sistem SIPAS
- **[🔌 API Documentation](./docs/api-documentation.md)** - Dokumentasi API endpoints

## ✨ What's New - v2.1.0

### 🎉 NVIDIA API Integration - 100% FREE & UNLIMITED!

SIPAS sekarang support **NVIDIA NIM API** sebagai primary AI provider:

- ✅ **100% GRATIS** - Tidak ada biaya
- ✅ **TANPA LIMIT** - Unlimited requests
- ✅ **Model: Meta Llama 3.1 70B** - Large & powerful
- ✅ **Model Selector UI** - Switch model dengan mudah
- ✅ **Auto Fallback** - 4 level fallback untuk reliability

**Setup cepat (5 menit):**
```bash
# 1. Get API key: https://build.nvidia.com/
# 2. Edit .env.local:
NVIDIA_API_KEY=nvapi-your-key-here
# 3. Restart: npm run dev
# 4. Test AI Chat!
```

👉 **[Quick Start Guide](./QUICK-START-AI.md)** untuk langkah lengkap!

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## 🧪 Test AI Configuration

After setting up your NVIDIA API key, test if it's working:

```bash
# Test NVIDIA API key
npm run test:nvidia

# Or with specific key
node test-nvidia-api.js nvapi-your-key-here
```

**Expected output:**
```
✅ API Key VALID!
⏱️  Response time: 2500ms
🤖 AI Response:
────────────────────────────────────────────────────────────
Saya adalah asisten AI yang siap membantu Anda!
────────────────────────────────────────────────────────────
✨ NVIDIA API working perfectly!
```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

