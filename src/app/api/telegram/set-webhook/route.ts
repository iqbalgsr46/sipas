/**
 * GET /api/telegram/set-webhook
 * Panggil endpoint ini sekali setelah deploy untuk mendaftarkan webhook ke Telegram.
 * Contoh: https://sipas.vercel.app/api/telegram/set-webhook
 */
export async function GET(req: Request) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  if (!token) {
    return Response.json({ error: "TELEGRAM_BOT_TOKEN tidak dikonfigurasi" }, { status: 500 });
  }
  if (!siteUrl || siteUrl.includes("localhost")) {
    return Response.json({
      error: "NEXT_PUBLIC_SITE_URL harus berupa URL production (bukan localhost)",
      hint: "Set NEXT_PUBLIC_SITE_URL=https://sipas.vercel.app di Vercel environment variables",
    }, { status: 400 });
  }

  // Hilangkan trailing slash dari siteUrl jika ada
  const cleanSiteUrl = siteUrl.replace(/\/$/, '');
  const webhookUrl = `${cleanSiteUrl}/api/telegram`;

  const res = await fetch(
    `https://api.telegram.org/bot${token}/setWebhook`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: webhookUrl }),
    }
  );

  const data = await res.json();
  return Response.json({
    webhook_url: webhookUrl,
    telegram_response: data,
  });
}
