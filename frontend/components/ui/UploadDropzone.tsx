"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/cn";

type UploadDropzoneProps = {
  file: File | null;
  onFileChange: (file: File | null) => void;
  error?: string;
};

export function UploadDropzone({ file, onFileChange, error }: UploadDropzoneProps) {
  const inputId = useId();
  const [dragging, setDragging] = useState(false);
  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  function applyFile(nextFile: File | null) {
    if (!nextFile) {
      onFileChange(null);
      return;
    }

    onFileChange(nextFile);
  }

  return (
    <div className="upload-shell">
      <label
        htmlFor={inputId}
        className={cn("upload-dropzone", dragging && "upload-dropzone-dragging", error && "upload-dropzone-error")}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          applyFile(event.dataTransfer.files?.[0] ?? null);
        }}
      >
        <input
          id={inputId}
          className="sr-only"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={(event) => applyFile(event.target.files?.[0] ?? null)}
        />

        <div className="upload-badge">{file ? "Uploaded" : "Upload Proof"}</div>
        <div className="upload-copy">
          <strong>{file ? "Payment screenshot ready" : "Tap or drag your payment screenshot here"}</strong>
          <span>JPEG, PNG, or WebP up to 5 MB. Mobile tap and desktop drag both work.</span>
        </div>

        {previewUrl ? (
          <motion.div className="upload-preview" initial={{ opacity: 0.2, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
            <img src={previewUrl} alt="Selected payment screenshot" />
          </motion.div>
        ) : (
          <div className="upload-state-grid">
            <span>Secure upload</span>
            <span>Single image</span>
            <span>Mobile ready</span>
            <span>Up to 5 MB</span>
          </div>
        )}
      </label>

      <div className="upload-meta">
        <span>{file ? `${file.name} | ${(file.size / 1024 / 1024).toFixed(2)} MB` : "Attach one payment screenshot to continue."}</span>
        {file ? (
          <button type="button" className="inline-action" onClick={() => onFileChange(null)}>
            Remove file
          </button>
        ) : null}
      </div>

      {error ? <div className="error">{error}</div> : null}
    </div>
  );
}
