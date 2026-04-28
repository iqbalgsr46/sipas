# API Documentation

> Catatan: Karena sistem ini menggunakan Supabase JS SDK (PostgREST), API dipanggil melalui abstraksi JavaScript `supabase.from()`. Berikut ekuivalen HTTP Endpoint yang merepresentasikan aksi tersebut.

---

### Endpoint: `POST /surat_keluar`
Membuat draf surat keluar baru.

**Request Body:**
```json
{
  "nomor_surat": "001/SK/2026",
  "tanggal_surat": "2026-04-29",
  "tujuan": "Dinas Pendidikan",
  "perihal": "Undangan Rapat",
  "status": "menunggu_approval",
  "created_by": "uuid-user-staf"
}
```

**Response (201 Created):**
```json
{
  "id": "uuid-surat-keluar",
  "nomor_surat": "001/SK/2026",
  "status": "menunggu_approval",
  "created_at": "2026-04-29T10:00:00Z"
}
```

---

### Endpoint: `PATCH /surat_keluar/{id}`
Memperbarui status surat keluar (Approval).

**Request Body:**
```json
{
  "status": "disetujui",
  "approved_by": "uuid-user-pimpinan"
}
```

**Response (200 OK):**
```json
{
  "id": "uuid-surat-keluar",
  "status": "disetujui",
  "approved_by": "uuid-user-pimpinan",
  "updated_at": "2026-04-29T11:00:00Z"
}
```
