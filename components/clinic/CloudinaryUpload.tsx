"use client";

import { useRef, useState } from "react";
import { Upload, X, Loader2 } from "lucide-react";
import { uploadClinicPhoto } from "@/lib/clinicApi";

interface Props {
  currentUrl?: string | null;
  onUploaded: (url: string) => void;
  size?: "sm" | "md";
}

export default function CloudinaryUpload({ currentUrl, onUploaded, size = "md" }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dim = size === "sm" ? "h-16 w-16" : "h-24 w-24";
  const textDim = size === "sm" ? "text-[10px]" : "text-xs";

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) { setError("Faqat rasm fayllari (.jpg, .png, .webp)"); return; }
    if (file.size > 5 * 1024 * 1024) { setError("Hajmi 5MB dan oshmasin"); return; }

    setError(null);
    setUploading(true);
    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);
    try {
      const url = await uploadClinicPhoto(file);
      setPreview(url);
      onUploaded(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Xato yuz berdi");
      setPreview(currentUrl ?? null);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className={`relative ${dim} rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden cursor-pointer hover:border-teal-400 hover:bg-teal-50 transition-all group`}
        onClick={() => !uploading && inputRef.current?.click()}
      >
        {preview ? (
          <>
            <img src={preview} alt="profil" className="h-full w-full object-cover" />
            {!uploading && (
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Upload size={16} className="text-white" />
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center gap-1 text-slate-400">
            <Upload size={18} />
            <span className={`${textDim} font-semibold`}>Rasm yuklash</span>
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
            <Loader2 size={20} className="animate-spin text-teal-500" />
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => !uploading && inputRef.current?.click()}
          disabled={uploading}
          className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition"
        >
          {uploading ? "Yuklanmoqda..." : "Fayl tanlash"}
        </button>
        {preview && !uploading && (
          <button
            type="button"
            onClick={() => { setPreview(null); onUploaded(""); }}
            className="rounded-xl border border-red-200 bg-red-50 px-2 py-1.5 text-xs text-red-500 hover:bg-red-100 transition"
          >
            <X size={12} />
          </button>
        )}
      </div>

      {error && <p className="text-xs text-red-500 text-center">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
      />
    </div>
  );
}
