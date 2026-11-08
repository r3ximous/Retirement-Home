import { Mountain } from "lucide-react";

export default function AltitudeLogo({
  compact = false,
}: {
  compact?: boolean;
}) {
  return (
    <div
      aria-label="Altitude Cafe"
      className={`flex flex-col items-center text-altitude-navy ${
        compact ? "gap-1" : "gap-2"
      }`}
      role="img"
    >
      <span className="font-black tracking-[0.12em]">ALTITUDE</span>
      <Mountain
        aria-hidden="true"
        size={compact ? 46 : 68}
        strokeWidth={2.2}
      />
    </div>
  );
}
