import type { ReactNode } from "react";

export default function MountainLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mountain-layout flex min-h-full flex-1 flex-col pb-24">
      {children}
    </div>
  );
}
