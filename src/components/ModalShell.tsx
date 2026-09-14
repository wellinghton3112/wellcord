"use client";
import { useEffect, useRef } from "react";

type ModalShellProps = {
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  maxWidth?: string;
};

export function ModalShell({ onClose, children, className = "", maxWidth = "max-w-md" }: ModalShellProps) {
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 modal-backdrop"
      onClick={(e) => { if (e.target === backdropRef.current) onClose(); }}
    >
      <div
        className={`bg-[#313338] rounded-xl shadow-2xl border border-[#3F4147] w-full ${maxWidth} modal-content ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
