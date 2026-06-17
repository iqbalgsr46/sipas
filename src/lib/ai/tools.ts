import { z } from "zod";
import { createClient } from "@/lib/supabase-server";

// Menggunakan pattern factory function agar bisa menerima user dan supabase dari route.ts
export const createSipasTools = (userId: string, userRole: string, supabase: any) => {
  // Fungsi internal mengembalikan client supabase yang sudah di-inject
  const getDb = async () => supabase;

  const withInputSchemas = <T extends Record<string, any>>(tools: T): T => {
    for (const tool of Object.values(tools)) {
      if (tool.parameters && !tool.inputSchema) {
        tool.inputSchema = tool.parameters;
      }
    }
    return tools;
  };

  const todayInJakarta = () => {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());

    const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
    return `${get("year")}-${get("month")}-${get("day")}`;
  };

  const addDays = (date: string, days: number) => {
    const parsed = new Date(`${date}T00:00:00+07:00`);
    parsed.setUTCDate(parsed.getUTCDate() + days);
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(parsed);
  };

  const statistikSchema = z.object({
    periode: z.enum(["semua", "hari_ini", "kemarin", "bulan_ini", "tahun_ini", "custom"]).optional().default("semua"),
    tanggal_mulai: z.string().optional().describe("Tanggal mulai format YYYY-MM-DD untuk periode custom"),
    tanggal_selesai: z.string().optional().describe("Tanggal selesai format YYYY-MM-DD untuk periode custom"),
    dummy: z.string().optional().describe("Tidak digunakan"),
  });

  const getStatsRange = (periode = "semua", tanggalMulai?: string, tanggalSelesai?: string) => {
    const today = todayInJakarta();
    const [year, month] = today.split("-");

    if (periode === "hari_ini") {
      return { start: today, endExclusive: addDays(today, 1), label: "hari ini" };
    }

    if (periode === "kemarin") {
      const yesterday = addDays(today, -1);
      return { start: yesterday, endExclusive: today, label: "kemarin" };
    }

    if (periode === "bulan_ini") {
      const start = `${year}-${month}-01`;
      const nextMonth = month === "12"
        ? `${Number(year) + 1}-01-01`
        : `${year}-${String(Number(month) + 1).padStart(2, "0")}-01`;
      return { start, endExclusive: nextMonth, label: "bulan ini" };
    }

    if (periode === "tahun_ini") {
      return { start: `${year}-01-01`, endExclusive: `${Number(year) + 1}-01-01`, label: "tahun ini" };
    }

    if (periode === "custom" && tanggalMulai) {
      return {
        start: tanggalMulai,
        endExclusive: addDays(tanggalSelesai || tanggalMulai, 1),
        label: tanggalSelesai && tanggalSelesai !== tanggalMulai
          ? `${tanggalMulai} sampai ${tanggalSelesai}`
          : tanggalMulai,
      };
    }

    return null;
  };

  return withInputSchemas({
    // ==========================================
    // 1. TOOLS BACA (READ) - Bebas tanpa role
    // ==========================================
    
    statistik_surat: {
      description: `Mendapatkan statistik dan jumlah surat dalam sistem SIPAS.
      
KAPAN MENGGUNAKAN TOOL INI:
- User bertanya "berapa", "jumlah", "statistik", "total"
- User ingin tahu overview data surat
- Contoh: "berapa surat masuk hari ini?", "jumlah surat keluar bulan ini"

RETURN: { surat_masuk: { total }, surat_keluar: { total, menunggu_approval } }

SELALU gunakan tool ini untuk pertanyaan statistik, JANGAN jawab asal-asalan!`,
      parameters: statistikSchema,
      execute: async (args: z.infer<typeof statistikSchema> = {}) => {
        try {
          const supabase = await getDb();
          const range = getStatsRange(args.periode, args.tanggal_mulai, args.tanggal_selesai);
          console.log("[Tool:statistik_surat] Starting query...", { periode: args.periode, range });
          
          const applyRange = (query: any, column: string) => {
            if (!range) return query;
            return query.gte(column, range.start).lt(column, range.endExclusive);
          };
          
          const [sm, sk, pending] = await Promise.all([
            applyRange(supabase.from("surat_masuk").select("id", { count: "exact", head: true }), "tanggal_diterima"),
            applyRange(supabase.from("surat_keluar").select("id", { count: "exact", head: true }), "tanggal_surat"),
            applyRange(supabase.from("surat_keluar").select("id", { count: "exact", head: true }).eq("status", "diajukan"), "tanggal_surat"),
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
            surat_keluar: { total: sk.count || 0, menunggu_approval: pending.count || 0 },
            periode: range?.label ?? "semua data",
            tanggal_mulai: range?.start ?? null,
            tanggal_selesai: range ? addDays(range.endExclusive, -1) : null,
          };
          
          console.log("[Tool:statistik_surat] Returning result:", JSON.stringify(result));
          return result;
        } catch (err: any) {
          console.error("[Tool:statistik_surat] Exception:", err?.message);
          return { error: `Exception: ${err?.message}` };
        }
      }
    },

    cari_surat_masuk: {
      description: `Mencari dan mem-filter surat masuk berdasarkan kriteria.
      
KAPAN MENGGUNAKAN:
- User ingin mencari surat masuk spesifik
- User tanya "cari surat dari...", "ada surat tentang...", "surat masuk dari..."
- Contoh: "cari surat dari Dinas Pendidikan", "surat tentang undangan"

PARAMETER:
- query: Kata kunci untuk perihal/pengirim/nomor surat
- status: Filter status (belum_dibaca/diproses/selesai)
- limit: Jumlah maksimal hasil (default 5)

RETURN: Array of surat_masuk objects`,
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
        return { count: data.length, data };
      }
    },

    cari_surat_keluar: {
      description: `Mencari dan mem-filter surat keluar berdasarkan kriteria.
      
KAPAN MENGGUNAKAN:
- User ingin mencari surat keluar spesifik
- User tanya "surat keluar ke...", "surat yang sudah disetujui", "draft surat"
- Contoh: "cari surat keluar ke Dinas Kesehatan", "surat keluar yang ditolak"

PARAMETER:
- query: Kata kunci untuk perihal/tujuan/nomor surat
- status: Filter status (draft/diajukan/disetujui/ditolak)
- limit: Jumlah maksimal hasil (default 5)

RETURN: Array of surat_keluar objects`,
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
        return { count: data.length, data };
      }
    },

    detail_surat_masuk: {
      description: `Melihat detail lengkap 1 surat masuk spesifik.
      
KAPAN MENGGUNAKAN:
- User minta detail 1 surat masuk spesifik
- Setelah cari_surat_masuk, user pilih satu untuk detail
- Contoh: "detail surat nomor 123/2024", "lihat surat masuk dengan ID xxx"

PARAMETER:
- identifier: ID (UUID) atau Nomor Surat

RETURN: Single surat_masuk object dengan semua field`,
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
      description: `Melihat detail lengkap 1 surat keluar spesifik.
      
KAPAN MENGGUNAKAN:
- User minta detail 1 surat keluar spesifik  
- Setelah cari_surat_keluar, user pilih satu untuk detail
- Contoh: "detail surat keluar nomor 456/2024", "lihat surat dengan ID yyy"

PARAMETER:
- identifier: ID (UUID) atau Nomor Surat

RETURN: Single surat_keluar object dengan semua field`,
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

    daftar_pending_approval: {
      description: `Melihat daftar surat keluar yang menunggu persetujuan (status: diajukan).
      
KAPAN MENGGUNAKAN:
- User tanya "ada surat yang perlu disetujui?", "surat pending", "antrian approval"
- Pimpinan ingin lihat surat yang butuh keputusan
- Contoh: "surat apa yang menunggu approval?", "daftar surat yang belum disetujui"

PARAMETER:
- limit: Jumlah maksimal hasil (default 10)

RETURN: { count, data: array of surat_keluar with status='diajukan' }`,
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
      description: `Mendaftarkan surat masuk baru ke database SIPAS.
      
⚠️ ROLE PERMISSION: Admin, Staf (BUKAN pimpinan)

📋 WAJIB KONFIRMASI 2 LANGKAH:
1. Tampilkan PREVIEW data yang akan disimpan
2. Minta konfirmasi user (ketik "Ya")
3. Baru eksekusi tool ini

KAPAN MENGGUNAKAN:
- User minta "tambah surat masuk", "daftar surat baru", "input surat masuk"
- Contoh: "bisa tambahkan surat masuk?", "daftarkan surat dari Dinas X"

PARAMETER WAJIB:
- nomor_surat: Nomor surat (contoh: 123/SK/2024)
- pengirim: Nama instansi/orang pengirim
- perihal: Topik/judul surat
- tanggal_surat: Format YYYY-MM-DD

PARAMETER OPTIONAL:
- tanggal_diterima: Kapan surat diterima (default: hari ini)
- keterangan: Catatan tambahan
- file_url: URL file PDF jika ada lampiran

FLOW:
1. Tanya data yang kurang
2. Tampilkan preview dalam box
3. Minta "Ya" untuk konfirmasi
4. Panggil tool ini
5. Tampilkan hasil sukses/error`,
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
      description: `Membuat draft surat keluar baru di SIPAS.
      
⚠️ ROLE PERMISSION: Admin, Staf (BUKAN pimpinan)

📋 WAJIB KONFIRMASI 2 LANGKAH:
1. Tampilkan PREVIEW data atau DRAFT SURAT LENGKAP
2. Minta konfirmasi user (ketik "Ya")
3. Baru eksekusi tool ini

KAPAN MENGGUNAKAN:
- User minta "buat surat keluar", "buatkan surat undangan", "draft surat"
- Contoh: "buatkan surat undangan rapat", "buat surat permohonan"

PARAMETER WAJIB:
- tujuan: Ke mana/kepada siapa surat ditujukan
- perihal: Topik/judul surat

PARAMETER OPTIONAL:
- nomor_surat: Nomor surat (jika kosong = auto "DRAFT/timestamp")
- konten: Isi surat (bisa Anda generate jika user minta)
- file_url: URL file PDF jika ada lampiran
- tanggal_surat: Default hari ini

FLOW:
1. Tanya tujuan & perihal
2. Tawarkan generate isi surat lengkap
3. Tampilkan draft surat format resmi
4. Minta "Ya" untuk konfirmasi
5. Panggil tool ini
6. Tampilkan hasil + next step (kirim approval?)`,
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
  });
};
