import { z } from "zod";
import { createClient } from "@/lib/supabase-server";

// Menggunakan pattern factory function agar bisa menerima user dan supabase dari route.ts
export const createSipasTools = (userId: string, userRole: string, supabase: any) => {
  // Fungsi internal mengembalikan client supabase yang sudah di-inject
  const getDb = async () => supabase;

  return {
    // ==========================================
    // 1. TOOLS BACA (READ) - Bebas tanpa role
    // ==========================================
    cari_surat_masuk: {
      description: "Cari/filter surat masuk berdasarkan kata kunci, status, atau rentang tanggal.",
      parameters: z.object({
        query: z.string().optional().describe("Kata kunci pencarian (perihal/pengirim/nomor)"),
        status: z.enum(["belum_dibaca", "diproses", "selesai"]).optional(),
        limit: z.number().optional().default(5),
      }),
      execute: async ({ query, status, limit }: { query?: string; status?: string; limit: number }) => {
        const supabase = await getDb();
        let q = supabase.from("surat_masuk").select("*").order("created_at", { ascending: false }).limit(limit);
        
        if (status) q = q.eq("status", status);
        if (query) q = q.or(`perihal.ilike.%${query}%,pengirim.ilike.%${query}%,nomor_surat.ilike.%${query}%`);
        
        const { data, error } = await q;
        if (error) return { error: error.message };
        return { data };
      }
    },

    cari_surat_keluar: {
      description: "Cari/filter surat keluar berdasarkan kata kunci, status, atau rentang tanggal.",
      parameters: z.object({
        query: z.string().optional().describe("Kata kunci pencarian (perihal/tujuan/nomor)"),
        status: z.enum(["draft", "diajukan", "disetujui", "ditolak"]).optional(),
        limit: z.number().optional().default(5),
      }),
      execute: async ({ query, status, limit }: { query?: string; status?: string; limit: number }) => {
        const supabase = await getDb();
        let q = supabase.from("surat_keluar").select("*").order("created_at", { ascending: false }).limit(limit);
        
        if (status) q = q.eq("status", status);
        if (query) q = q.or(`perihal.ilike.%${query}%,tujuan.ilike.%${query}%,nomor_surat.ilike.%${query}%`);
        
        const { data, error } = await q;
        if (error) return { error: error.message };
        return { data };
      }
    },

    detail_surat_masuk: {
      description: "Melihat detail lengkap 1 surat masuk berdasarkan ID atau Nomor Surat.",
      parameters: z.object({
        identifier: z.string().describe("ID UUID atau Nomor Surat"),
      }),
      execute: async ({ identifier }: { identifier: string }) => {
        const supabase = await getDb();
        const { data, error } = await supabase.from("surat_masuk")
          .select("*")
          .or(`id.eq.${identifier},nomor_surat.eq.${identifier}`)
          .single();
        if (error) return { error: error.message };
        return { data };
      }
    },

    detail_surat_keluar: {
      description: "Melihat detail lengkap 1 surat keluar berdasarkan ID atau Nomor Surat.",
      parameters: z.object({
        identifier: z.string().describe("ID UUID atau Nomor Surat"),
      }),
      execute: async ({ identifier }: { identifier: string }) => {
        const supabase = await getDb();
        const { data, error } = await supabase.from("surat_keluar")
          .select("*")
          .or(`id.eq.${identifier},nomor_surat.eq.${identifier}`)
          .single();
        if (error) return { error: error.message };
        return { data };
      }
    },

    statistik_surat: {
      description: "Mendapatkan statistik jumlah surat masuk, surat keluar, dan antrean approval.",
      parameters: z.object({
        dummy: z.string().optional().describe("Tidak digunakan"),
      }),
      execute: async () => {
        try {
          const supabase = await getDb();
          console.log("[Tool:statistik_surat] Starting query...");
          
          const [sm, sk, pending] = await Promise.all([
            supabase.from("surat_masuk").select("id", { count: "exact" }),
            supabase.from("surat_keluar").select("id", { count: "exact" }),
            supabase.from("surat_keluar").select("id", { count: "exact" }).eq("status", "diajukan"),
          ]);
          
          console.log("[Tool:statistik_surat] Query results:", {
            sm_count: sm.count,
            sm_error: sm.error?.message,
            sk_count: sk.count,
            sk_error: sk.error?.message,
            pending_count: pending.count,
            pending_error: pending.error?.message
          });
          
          // Check for errors
          if (sm.error) return { error: `Surat masuk: ${sm.error.message}` };
          if (sk.error) return { error: `Surat keluar: ${sk.error.message}` };
          if (pending.error) return { error: `Pending: ${pending.error.message}` };
          
          const result = { 
            surat_masuk: { total: sm.count || 0 },
            surat_keluar: { total: sk.count || 0, menunggu_approval: pending.count || 0 }
          };
          
          console.log("[Tool:statistik_surat] Returning result:", JSON.stringify(result));
          return result;
        } catch (err: any) {
          console.error("[Tool:statistik_surat] Exception:", err?.message);
          return { error: `Exception: ${err?.message}` };
        }
      }
    },

    daftar_pending_approval: {
      description: "Melihat daftar surat keluar yang berstatus 'diajukan' dan menunggu persetujuan pimpinan.",
      parameters: z.object({
        limit: z.number().optional().default(10),
      }),
      execute: async ({ limit }: { limit: number }) => {
        const supabase = await getDb();
        const { data, error } = await supabase.from("surat_keluar")
          .select("*")
          .eq("status", "diajukan")
          .order("created_at", { ascending: false })
          .limit(limit);
        if (error) return { error: error.message };
        return { count: data.length, data };
      }
    },

    // ==========================================
    // 2. TOOLS TULIS (WRITE) - Role Based
    // ==========================================
    buat_surat_masuk: {
      description: "Mendaftarkan surat masuk baru ke sistem. Role: Admin, Staf.",
      parameters: z.object({
        nomor_surat: z.string(),
        pengirim: z.string(),
        perihal: z.string(),
        tanggal_surat: z.string(),
        tanggal_diterima: z.string().optional(),
        keterangan: z.string().optional(),
        file_url: z.string().optional(),
      }),
      execute: async (args: any) => {
        if (userRole === "pimpinan") return { error: "Role pimpinan tidak diizinkan membuat surat masuk." };
        const supabase = await getDb();
        
        const insertData = {
          nomor_surat: args.nomor_surat,
          pengirim: args.pengirim,
          perihal: args.perihal,
          tanggal_surat: args.tanggal_surat,
          tanggal_diterima: args.tanggal_diterima || new Date().toISOString().split('T')[0],
          keterangan: args.keterangan,
          file_url: args.file_url,
          status: "belum_dibaca",
          registered_by: userId
        };

        const { data, error } = await supabase.from("surat_masuk").insert(insertData).select().single();
        if (error) return { error: error.message };
        return { success: true, data };
      }
    },

    buat_surat_keluar: {
      description: "Membuat draft surat keluar baru. Role: Admin, Staf.",
      parameters: z.object({
        nomor_surat: z.string(),
        tujuan: z.string(),
        perihal: z.string(),
        konten: z.string().optional(),
        file_url: z.string().optional(),
      }),
      execute: async (args: any) => {
        if (userRole === "pimpinan") return { error: "Role pimpinan tidak diizinkan membuat surat keluar." };
        const supabase = await getDb();
        
        const insertData = {
          nomor_surat: args.nomor_surat || "DRAFT/" + Date.now(),
          tujuan: args.tujuan,
          perihal: args.perihal,
          konten: args.konten || args.isi_surat,
          file_url: args.file_url,
          tanggal_surat: args.tanggal_surat || new Date().toISOString().split('T')[0],
          status: "draft",
          created_by: userId
        };

        const { data, error } = await supabase.from("surat_keluar").insert(insertData).select().single();
        if (error) return { error: error.message };
        return { success: true, data };
      }
    },

    edit_surat_masuk: {
      description: "Mengedit data surat masuk. Role: Admin, Staf.",
      parameters: z.object({
        id: z.string(),
        nomor_surat: z.string().optional(),
        pengirim: z.string().optional(),
        perihal: z.string().optional(),
        status: z.enum(["belum_dibaca", "diproses", "selesai"]).optional(),
        keterangan: z.string().optional(),
        file_url: z.string().optional(),
      }),
      execute: async (args: any) => {
        if (userRole === "pimpinan") return { error: "Role pimpinan tidak bisa mengedit." };
        const supabase = await getDb();
        
        const updates: any = {};
        if (args.nomor_surat !== undefined) updates.nomor_surat = args.nomor_surat;
        if (args.pengirim !== undefined) updates.pengirim = args.pengirim;
        if (args.perihal !== undefined) updates.perihal = args.perihal;
        if (args.status !== undefined) updates.status = args.status;
        if (args.keterangan !== undefined) updates.keterangan = args.keterangan;
        if (args.file_url !== undefined) updates.file_url = args.file_url;
        
        const { data, error } = await supabase.from("surat_masuk").update(updates).eq("id", args.id).select().single();
        if (error) return { error: error.message };
        return { success: true, data };
      }
    },

    edit_surat_keluar: {
      description: "Mengedit data surat keluar (hanya jika draft atau ditolak). Role: Admin, Staf.",
      parameters: z.object({
        id: z.string(),
        nomor_surat: z.string().optional(),
        tujuan: z.string().optional(),
        perihal: z.string().optional(),
        konten: z.string().optional(),
        file_url: z.string().optional(),
      }),
      execute: async (args: any) => {
        if (userRole === "pimpinan") return { error: "Role pimpinan tidak bisa mengedit." };
        const supabase = await getDb();
        const { data: sk } = await supabase.from("surat_keluar").select("status").eq("id", args.id).single();
        if (!sk) return { error: "Surat tidak ditemukan." };
        if (sk.status !== "draft" && sk.status !== "ditolak") return { error: "Hanya surat draft/ditolak yang bisa diedit." };
        
        const updates: any = {};
        if (args.nomor_surat !== undefined) updates.nomor_surat = args.nomor_surat;
        if (args.tujuan !== undefined) updates.tujuan = args.tujuan;
        if (args.perihal !== undefined) updates.perihal = args.perihal;
        if (args.konten !== undefined) updates.konten = args.konten;
        if (args.file_url !== undefined) updates.file_url = args.file_url;
        
        const { data, error } = await supabase.from("surat_keluar").update(updates).eq("id", args.id).select().single();
        if (error) return { error: error.message };
        return { success: true, data };
      }
    },

    kirim_approval: {
      description: "Mengubah status surat keluar dari 'draft' atau 'ditolak' menjadi 'diajukan'. Role: Admin, Staf.",
      parameters: z.object({
        id: z.string().describe("ID surat keluar"),
      }),
      execute: async ({ id }: { id: string }) => {
        if (userRole === "pimpinan") return { error: "Role pimpinan tidak diizinkan mengajukan surat." };
        const supabase = await getDb();
        
        // Cek status saat ini
        const { data: sk } = await supabase.from("surat_keluar").select("status").eq("id", id).single();
        if (!sk) return { error: "Surat tidak ditemukan." };
        if (sk.status !== "draft" && sk.status !== "ditolak") {
          return { error: `Hanya surat berstatus draft atau ditolak yang bisa diajukan. Status saat ini: ${sk.status}` };
        }

        const { data, error } = await supabase.from("surat_keluar")
          .update({ status: "diajukan" })
          .eq("id", id)
          .select()
          .single();
          
        if (error) return { error: error.message };
        return { success: true, status_baru: data.status, message: "Surat berhasil diajukan untuk approval." };
      }
    },

    setujui_surat: {
      description: "Menyetujui surat keluar yang 'diajukan'. Role: Pimpinan, Admin.",
      parameters: z.object({
        id: z.string().describe("ID surat keluar yang akan disetujui"),
      }),
      execute: async ({ id }: { id: string }) => {
        if (userRole === "staf") return { error: "Role staf tidak diizinkan menyetujui surat." };
        const supabase = await getDb();
        
        // Cek status
        const { data: sk } = await supabase.from("surat_keluar").select("status").eq("id", id).single();
        if (!sk) return { error: "Surat tidak ditemukan." };
        if (sk.status !== "diajukan") return { error: `Surat harus berstatus 'diajukan'. Status saat ini: ${sk.status}` };

        const { data, error } = await supabase.from("surat_keluar")
          .update({ 
            status: "disetujui",
            approved_by: userId,
            approved_at: new Date().toISOString()
          })
          .eq("id", id)
          .select()
          .single();
          
        if (error) return { error: error.message };
        return { success: true, data, message: "Surat telah disetujui." };
      }
    },

    tolak_surat: {
      description: "Menolak surat keluar yang 'diajukan'. Role: Pimpinan, Admin.",
      parameters: z.object({
        id: z.string(),
        alasan: z.string().describe("Alasan penolakan (meskipun tidak disimpan di DB, tetap wajib disebutkan di UI)"),
      }),
      execute: async ({ id, alasan }: { id: string, alasan: string }) => {
        if (userRole === "staf") return { error: "Role staf tidak diizinkan menolak surat." };
        if (!alasan) return { error: "Alasan penolakan wajib disertakan." };
        
        const supabase = await getDb();
        const { data: sk } = await supabase.from("surat_keluar").select("status").eq("id", id).single();
        if (!sk) return { error: "Surat tidak ditemukan." };
        if (sk.status !== "diajukan") return { error: `Surat harus berstatus 'diajukan'. Status saat ini: ${sk.status}` };

        const { data, error } = await supabase.from("surat_keluar")
          .update({ 
            status: "ditolak",
            approved_by: userId,
            approved_at: new Date().toISOString()
          })
          .eq("id", id)
          .select()
          .single();
          
        if (error) return { error: error.message };
        return { success: true, data, message: `Surat ditolak dengan alasan: ${alasan}` };
      }
    },
    
    hapus_surat: {
      description: "Menghapus surat masuk atau keluar. Hanya Admin.",
      parameters: z.object({
        jenis: z.enum(["masuk", "keluar"]),
        id: z.string()
      }),
      execute: async ({ jenis, id }: { jenis: string, id: string }) => {
        if (userRole !== "admin") return { error: "HANYA ADMIN yang diizinkan menghapus data." };
        const supabase = await getDb();
        const tabel = jenis === "masuk" ? "surat_masuk" : "surat_keluar";
        
        const { error } = await supabase.from(tabel).delete().eq("id", id);
        if (error) return { error: error.message };
        return { success: true, message: `Surat ${jenis} berhasil dihapus.` };
      }
    }
  };
};
