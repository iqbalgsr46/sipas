-- Tambahkan kolom telegram_id ke tabel users untuk integrasi Telegram Bot
-- Jalankan di Supabase SQL Editor

ALTER TABLE users 
ADD COLUMN telegram_id TEXT;

-- Buat unique constraint untuk telegram_id (agar satu Telegram ID hanya terdaftar sekali)
ALTER TABLE users 
ADD CONSTRAINT users_telegram_id_unique UNIQUE (telegram_id);

-- Buat index untuk performa query berdasarkan telegram_id
CREATE INDEX IF NOT EXISTS idx_users_telegram_id 
ON users (telegram_id) 
WHERE telegram_id IS NOT NULL;

-- Comment untuk dokumentasi
COMMENT ON COLUMN users.telegram_id IS 'Telegram User ID untuk integrasi bot (opsional, unique)';