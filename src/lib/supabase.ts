/**
 * Supabase Client Configuration
 * ==============================
 * File ini membuat koneksi ke Supabase menggunakan
 * environment variables dari .env.local
 *
 * Cara pakai:
 *   import { supabase } from '@/lib/supabase';
 *   const { data } = await supabase.from('surat_masuk').select('*');
 */

import { createBrowserClient } from "@supabase/ssr";

// Ambil URL dan Key dari environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Buat Supabase client (singleton) dengan dukungan cookie otomatis
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
