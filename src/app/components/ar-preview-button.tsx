"use client";

import { useEffect, useRef, useState } from "react";
import { ScanLine, X } from "lucide-react";
import { WebARViewer } from "@/components/WebARViewer";
import type { MenuItem } from "../menu/menu-data";

export default function ARPreviewButton({
  item,
  light = false,
}: {
  item: MenuItem;
  light?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const previousFocus = document.activeElement;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("keydown", onKeyDown);
    closeButtonRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, [isOpen]);

  if (!item.arGlbUrl && !item.arUsdzUrl) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-haspopup="dialog"
        className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 ${
          light
            ? "border-white/45 text-white hover:bg-white/10 focus-visible:outline-white"
            : "border-altitude-navy/25 text-altitude-navy hover:bg-altitude-navy/10 focus-visible:outline-altitude-navy"
        }`}
      >
        <ScanLine aria-hidden="true" size={15} />
        View in AR
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-black/70 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="ar-preview-title"
            className="w-full max-w-xl rounded-2xl bg-white p-4 shadow-2xl mobile:p-6"
          >
            <header className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-altitude-navy/70">
                  Web AR preview
                </p>
                <h2
                  id="ar-preview-title"
                  className="mt-1 text-xl font-bold text-altitude-black"
                >
                  {item.title}
                </h2>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close AR preview"
                className="flex size-10 shrink-0 items-center justify-center rounded-full bg-altitude-black/5 text-altitude-black hover:bg-altitude-black/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-altitude-navy"
              >
                <X aria-hidden="true" size={19} />
              </button>
            </header>
            <WebARViewer
              glbPath={item.arGlbUrl}
              usdzPath={item.arUsdzUrl}
              itemName={item.title}
              portionSize="16 oz"
            />
          </section>
        </div>
      )}
    </>
  );
}
