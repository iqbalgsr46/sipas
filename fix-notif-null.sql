-- =============================================
-- HOTFIX: FIX ERROR NOTIFIKASI NULL VALUE
-- =============================================
-- Masalah: Gagal Menyetujui karena `user_id` di tabel notifications bernilai null.
-- Penyebab: Data surat lama di database mungkin tidak memiliki nilai `created_by`.
-- Solusi: Pengecekan IF IS NOT NULL pada trigger notifikasi.
-- =============================================

CREATE OR REPLACE FUNCTION public.handle_surat_keluar_notif()
RETURNS trigger AS $$
DECLARE
  v_pimpinan_id UUID;
BEGIN
  IF LOWER(OLD.status) IN ('draft', 'ditolak') AND LOWER(NEW.status) = 'diajukan' THEN
    FOR v_pimpinan_id IN SELECT id FROM public.users WHERE LOWER(role) = 'pimpinan' LOOP
      INSERT INTO public.notifications (user_id, title, message)
      VALUES (v_pimpinan_id, 'Approval Dibutuhkan', 'Surat No: ' || NEW.nomor_surat || ' (' || NEW.perihal || ') menunggu persetujuan Anda.');
    END LOOP;
  END IF;

  IF LOWER(OLD.status) = 'diajukan' AND LOWER(NEW.status) = 'disetujui' THEN
    -- Pengecekan agar tidak error jika data surat lama tidak memiliki created_by
    IF NEW.created_by IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, message)
      VALUES (NEW.created_by, 'Surat Disetujui', 'Surat No: ' || NEW.nomor_surat || ' telah DISETUJUI oleh Pimpinan.');
    END IF;
  END IF;

  IF LOWER(OLD.status) = 'diajukan' AND LOWER(NEW.status) = 'ditolak' THEN
    IF NEW.created_by IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, message)
      VALUES (NEW.created_by, 'Surat Ditolak', 'Surat No: ' || NEW.nomor_surat || ' DITOLAK oleh Pimpinan. Silakan periksa.');
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
