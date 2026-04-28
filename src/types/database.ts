/**
 * Database Types for Supabase
 * ============================
 * TypeScript interface yang merepresentasikan
 * struktur database Supabase SIPAS (Simplified).
 *
 * Role: admin | staf | pimpinan (static, hardcoded)
 * Tanpa disposisi, tanpa role dinamis, tanpa permission dinamis.
 */

// =============================================
// Tipe untuk masing-masing tabel
// =============================================

/** Profil pengguna sistem */
export interface User {
  id: string;
  full_name: string;
  username: string;
  email: string;
  role: "admin" | "staf" | "pimpinan";
  status: "aktif" | "nonaktif";
  avatar_url?: string | null;
  created_at: string;
  updated_at: string;
}

/** Surat yang diterima instansi */
export interface SuratMasuk {
  id: string;
  nomor_surat: string;
  pengirim: string;
  perihal: string;
  tanggal_surat: string;
  tanggal_diterima: string;
  status: "belum_dibaca" | "diproses" | "selesai";
  keterangan: string | null;
  file_url: string | null;
  registered_by: string; // NOT NULL (v2.0)
  created_at: string;
  updated_at: string;
}

/** Surat yang dikirim keluar instansi */
export interface SuratKeluar {
  id: string;
  nomor_surat: string; // UNIQUE (v2.0)
  tujuan: string;
  perihal: string;
  tanggal_surat: string; // NOT NULL (v2.0)
  status: "draft" | "diajukan" | "disetujui" | "ditolak";
  konten: string | null;
  file_url: string | null;
  created_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

// =============================================
// Tipe tambahan v2.0
// =============================================

/** Notifikasi dengan kolom type (v2.0) */
export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: "submission" | "approval" | "rejection" | "info";
  is_read: boolean;
  created_at: string;
}

/** Log aktivitas pengguna (v2.0) */
export interface ActivityLog {
  id: string;
  user_id: string;
  action: string;
  target_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}


export type UserInsert = {
  full_name: string;
  username: string;
  email: string;
  role?: "admin" | "staf" | "pimpinan";
  status?: "aktif" | "nonaktif";
};

export type SuratMasukInsert = {
  nomor_surat: string;
  pengirim: string;
  perihal: string;
  tanggal_surat: string;
  tanggal_diterima?: string;
  status?: "belum_dibaca" | "diproses" | "selesai";
  keterangan?: string | null;
  file_url?: string | null;
  registered_by?: string | null;
};

export type SuratKeluarInsert = {
  nomor_surat: string;
  tujuan: string;
  perihal: string;
  tanggal_surat?: string;
  status?: "draft" | "diajukan" | "disetujui" | "ditolak";
  konten?: string | null;
  file_url?: string | null;
  created_by?: string | null;
};

// =============================================
// Update types (semua opsional)
// =============================================

export type UserUpdate = Partial<UserInsert>;
export type SuratMasukUpdate = Partial<SuratMasukInsert>;
export type SuratKeluarUpdate = Partial<SuratKeluarInsert>;

// =============================================
// Database Schema (untuk generic Supabase client)
// =============================================

export interface Database {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: UserInsert;
        Update: UserUpdate;
      };
      surat_masuk: {
        Row: SuratMasuk;
        Insert: SuratMasukInsert;
        Update: SuratMasukUpdate;
      };
      surat_keluar: {
        Row: SuratKeluar;
        Insert: SuratKeluarInsert;
        Update: SuratKeluarUpdate;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
