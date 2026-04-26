"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  /** When true, backdrop click and Escape key will NOT close the modal */
  locked?: boolean;
  children: React.ReactNode;
}

/**
 * ModalPortal — renders into document.body via React Portal.
 * Completely isolated from any parent layout/overflow/stacking context.
 */
export default function ModalPortal({
  open,
  onClose,
  locked = false,
  children,
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  // Escape key to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !locked) onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, locked, onClose]);

  // Prevent body scroll when modal open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={overlayRef}
      className="animate-overlay-in"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
      }}
      onClick={(e) => {
        if (e.target === overlayRef.current && !locked) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="animate-modal-in"
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "520px",
          maxHeight: "90dvh",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "var(--color-surface-container-lowest)",
          borderRadius: "16px",
          border: "1px solid var(--color-outline-variant)",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
