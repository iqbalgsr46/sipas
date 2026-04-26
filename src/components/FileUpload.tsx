"use client";

import { useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface FileUploadProps {
  onUploadSuccess: (url: string) => void;
  onUploadError: (error: string) => void;
  /** Pass existing URL to show current file in edit mode */
  existingFileUrl?: string | null;
  bucket?: string;
  folder?: string;
}

export default function FileUpload({
  onUploadSuccess,
  onUploadError,
  existingFileUrl,
  bucket = "documents",
  folder = "surat",
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  /** null = no new file chosen; string = name of newly uploaded file */
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  // Reset whenever the existingFileUrl changes (i.e. form opened fresh vs edit)
  useEffect(() => {
    setUploadedFileName(null);
    dragCounterRef.current = 0;
  }, [existingFileUrl]);

  /* ── drag helpers ─────────────────────────────────────────────── */
  const onDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current++;
    setIsDragging(true);
  };
  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) setIsDragging(false);
  };
  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); };
  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current = 0;
    setIsDragging(false);
    if (e.dataTransfer.files?.length) await upload(e.dataTransfer.files[0]);
  };

  /* ── upload logic ────────────────────────────────────────────── */
  async function upload(file: File) {
    if (file.type !== "application/pdf") {
      onUploadError("Hanya file PDF yang diperbolehkan.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      onUploadError("Ukuran file maksimal 5 MB.");
      return;
    }

    setUploading(true);
    setUploadedFileName(file.name);

    try {
      const ext = file.name.split(".").pop();
      const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, file, { cacheControl: "3600", upsert: false });

      if (error) throw error;

      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
      onUploadSuccess(urlData.publicUrl);
    } catch (err: any) {
      setUploadedFileName(null);
      onUploadError(err.message || "Gagal mengunggah file.");
    } finally {
      setUploading(false);
    }
  }

  const onInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) await upload(e.target.files[0]);
    // reset input so same file can be re-selected
    e.target.value = "";
  };

  const clearFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setUploadedFileName(null);
    onUploadSuccess(""); // signal parent that file was cleared
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  /* ── derived state ───────────────────────────────────────────── */
  const hasNewFile = !!uploadedFileName;
  const hasExisting = !!existingFileUrl && !hasNewFile;
  const hasAnyFile = hasNewFile || hasExisting;
  const displayName = hasNewFile
    ? uploadedFileName
    : hasExisting
    ? existingFileUrl!.split("/").pop() ?? "File tersimpan"
    : null;

  /* ── border colour ───────────────────────────────────────────── */
  const borderClass = isDragging
    ? "border-primary bg-primary/5"
    : uploading
    ? "border-primary/50 bg-surface"
    : hasAnyFile
    ? "border-[#2e7d32] bg-[#f1f8f1]"
    : "border-outline-variant bg-surface hover:border-primary/50 hover:bg-surface-container-lowest";

  return (
    <div className="w-full space-y-2">
      {/* Drop Zone */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload file PDF"
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && !uploading && fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-5 transition-all duration-200 text-center flex flex-col items-center justify-center gap-2.5 cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-primary ${borderClass}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={onInputChange}
          disabled={uploading}
        />

        {uploading ? (
          <>
            <span className="material-symbols-outlined animate-spin text-primary text-[32px]">
              progress_activity
            </span>
            <p className="font-inter text-sm text-on-surface-variant">
              Mengunggah <span className="font-semibold text-on-surface">{uploadedFileName}</span>…
            </p>
          </>
        ) : hasAnyFile ? (
          <>
            <div className="w-11 h-11 rounded-full bg-[#e8f5e9] text-[#2e7d32] flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">task_alt</span>
            </div>
            <div className="w-full px-2">
              <p
                className="font-inter text-sm font-semibold text-on-surface truncate max-w-full"
                title={displayName ?? undefined}
              >
                {displayName}
              </p>
              <p className="font-inter text-xs text-on-surface-variant mt-0.5">
                Klik atau drag untuk mengganti file
              </p>
            </div>
            {/* Clear button */}
            <button
              type="button"
              onClick={clearFile}
              aria-label="Hapus file"
              className="absolute top-2 right-2 p-1 rounded-full text-on-surface-variant hover:text-error hover:bg-error-container/40 transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </>
        ) : (
          <>
            <div className="w-11 h-11 rounded-full bg-surface-container-high text-on-surface-variant flex items-center justify-center">
              <span className="material-symbols-outlined text-[24px]">upload_file</span>
            </div>
            <div>
              <p className="font-inter text-sm font-semibold text-on-surface">
                Pilih atau <span className="text-primary">drag & drop</span> file PDF
              </p>
              <p className="font-inter text-xs text-on-surface-variant mt-0.5">
                Hanya PDF · Maksimal 5 MB
              </p>
            </div>
          </>
        )}
      </div>

      {/* Link to existing file (edit mode) */}
      {hasExisting && (
        <a
          href={existingFileUrl!}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1 text-xs font-inter text-primary hover:underline"
        >
          <span className="material-symbols-outlined text-[14px]">open_in_new</span>
          Lihat file saat ini
        </a>
      )}
    </div>
  );
}
