"use client";

import Script from "next/script";
import { useState } from "react";

interface WebARProps {
  glbPath?: string;
  usdzPath?: string;
  itemName: string;
  portionSize: string;
}

export function WebARViewer({
  glbPath,
  usdzPath,
  itemName,
  portionSize,
}: WebARProps) {
  const [arFailed, setArFailed] = useState(false);

  return (
    <>
      {glbPath && !arFailed && (
        <Script
          src="https://ajax.googleapis.com/ajax/libs/model-viewer/4.0.0/model-viewer.min.js"
          type="module"
          strategy="afterInteractive"
          onError={() => setArFailed(true)}
        />
      )}
      <div className="flex w-full flex-col items-center rounded-2xl border border-amber-500/30 bg-gray-900 p-4 text-white shadow-xl">
        {!arFailed && glbPath ? (
          <model-viewer
            src={glbPath}
            ios-src={usdzPath}
            alt={`3D ${itemName}`}
            ar
            ar-modes="webxr scene-viewer quick-look"
            camera-controls
            touch-action="pan-y"
            shadow-intensity="1.5"
            style={{ width: "100%", height: "260px" }}
            onerror={() => setArFailed(true)}
          >
            <button
              slot="ar-button"
              className="mx-auto mt-4 flex transform items-center gap-2 rounded-full bg-amber-500 px-6 py-3 font-extrabold text-black shadow-lg transition hover:bg-amber-600 active:scale-95"
            >
              <span>📷 Preview {portionSize} Size on Table</span>
            </button>
          </model-viewer>
        ) : (
          <div className="flex h-64 w-full flex-col items-center justify-center rounded-xl border border-dashed border-amber-400/50 bg-gray-800 p-4">
            <div className="mb-3 flex items-end justify-center gap-6">
              <div className="flex flex-col items-center">
                <span className="mb-1 text-xs text-gray-400">12 oz</span>
                <div className="flex h-20 w-12 items-center justify-center rounded-b-lg border border-amber-400 bg-amber-700/60 text-xs font-bold">
                  M
                </div>
              </div>
              <div className="flex flex-col items-center">
                <span className="mb-1 text-xs font-bold text-amber-400">
                  16 oz (Selected)
                </span>
                <div className="flex h-28 w-16 items-center justify-center rounded-b-lg border-2 border-amber-300 bg-amber-500/80 text-sm font-extrabold text-black shadow-lg shadow-amber-500/40">
                  L
                </div>
              </div>
              <div className="flex flex-col items-center">
                <span className="mb-1 text-xs text-gray-400">24 oz</span>
                <div className="flex h-36 w-20 items-center justify-center rounded-b-lg border border-amber-400 bg-amber-900/60 text-xs font-bold">
                  XL
                </div>
              </div>
            </div>
            <p className="text-center text-xs text-amber-200">
              2D Scale Comparison (16oz = 15cm height against standard desk
              items)
            </p>
          </div>
        )}
        <p className="mt-2 text-[11px] text-gray-400">
          Zero app download required. Powered by WebAR / iOS QuickLook.
        </p>
      </div>
    </>
  );
}
