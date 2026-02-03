import { useEffect, useMemo, useRef, useState } from "react";
import ImageMapper from "react-img-mapper";

type TentCount = { tentId: string; count: number };

type Props = {
  byTent: TentCount[]; // from getSummary(...).byTent
  imageUrl?: string;
  onSelectTent?: (id: string) => void; // clicks won't fire when disabled=true; keep for future
  selectedTentId?: string;
  // optional: use discrete buckets instead of gradient
  useBuckets?: boolean;
  buckets?: { max: number; color: string }[];
};

const DEFAULT_IMAGE =
  "https://raw.githubusercontent.com/trinityprime/amplify-x-leafai/refs/heads/latiffv2/src/assets/farm-map.png";

// Tent polygons (your coordinates)
const farmArea = [
  { id: "tent-1", shape: "poly", coords: [140, 57, 73, 53, 66, 212, 136, 212] },
  { id: "tent-2", shape: "poly", coords: [149, 54, 202, 52, 199, 210, 148, 215] },
  { id: "tent-3", shape: "poly", coords: [214, 55, 270, 53, 268, 214, 212, 212] },
  { id: "tent-4", shape: "poly", coords: [282, 57, 340, 57, 336, 212, 278, 214] },
  { id: "tent-5", shape: "poly", coords: [347, 55, 407, 57, 403, 219, 345, 214] },
  { id: "tent-6", shape: "poly", coords: [411, 58, 478, 57, 471, 214, 411, 212] },
  { id: "tent-7", shape: "poly", coords: [484, 57, 538, 58, 540, 210, 482, 214] },
  { id: "tent-8", shape: "poly", coords: [568, 62, 628, 58, 628, 212, 568, 214] },
  { id: "tent-9", shape: "poly", coords: [645, 49, 699, 57, 694, 218, 641, 216] },
  { id: "tent-10", shape: "poly", coords: [709, 57, 767, 57, 763, 214, 703, 214] },
  { id: "tent-11", shape: "poly", coords: [772, 57, 832, 57, 826, 214, 772, 214] },
  { id: "tent-12", shape: "poly", coords: [838, 55, 898, 57, 894, 210, 838, 216] },
  { id: "tent-13", shape: "poly", coords: [911, 57, 965, 57, 965, 214, 907, 214] },
  { id: "tent-14", shape: "poly", coords: [976, 58, 1027, 57, 1031, 208, 974, 208] },
  { id: "tent-15", shape: "poly", coords: [1040, 55, 1096, 53, 1094, 206, 1040, 212] },
  { id: "tent-16", shape: "poly", coords: [1107, 57, 1167, 55, 1162, 205, 1107, 214] },
  { id: "tent-17", shape: "poly", coords: [1175, 49, 1229, 53, 1231, 212, 1177, 210] },
  { id: "tent-18", shape: "poly", coords: [207, 251, 268, 255, 267, 433, 205, 433] },
  { id: "tent-19", shape: "poly", coords: [280, 259, 332, 259, 334, 427, 278, 424] },
  { id: "tent-20", shape: "poly", coords: [695, 253, 763, 251, 763, 399, 699, 401] },
  { id: "tent-21", shape: "poly", coords: [772, 251, 825, 257, 819, 399, 770, 401] },
  { id: "tent-22", shape: "poly", coords: [840, 251, 896, 246, 898, 401, 838, 405] },
  { id: "tent-23", shape: "poly", coords: [905, 248, 963, 253, 958, 397, 903, 401] },
  { id: "tent-24", shape: "poly", coords: [969, 249, 1025, 249, 1029, 399, 973, 403] },
  { id: "tent-25", shape: "poly", coords: [1040, 248, 1092, 251, 1090, 396, 1038, 396] },
  { id: "tent-26", shape: "poly", coords: [1105, 244, 1160, 246, 1158, 394, 1105, 401] },
  { id: "tent-27", shape: "poly", coords: [1169, 249, 1227, 253, 1235, 407, 1173, 409] },
  { id: "tent-28", shape: "poly", coords: [697, 411, 755, 412, 753, 558, 697, 564] },
  { id: "tent-29", shape: "poly", coords: [767, 413, 823, 413, 817, 570, 765, 570] },
  { id: "tent-30", shape: "poly", coords: [832, 415, 892, 421, 888, 567, 834, 570] },
  { id: "tent-31", shape: "poly", coords: [694, 590, 755, 600, 753, 749, 695, 746] },
  { id: "tent-32", shape: "poly", coords: [763, 602, 821, 603, 817, 749, 763, 748] },
  { id: "tent-33", shape: "poly", coords: [830, 594, 892, 600, 888, 746, 830, 749] },
  { id: "tent-34", shape: "poly", coords: [898, 600, 956, 598, 956, 753, 898, 753] },
  { id: "tent-35", shape: "poly", coords: [967, 598, 1019, 600, 1019, 746, 965, 749] },
  { id: "tent-36", shape: "poly", coords: [1036, 600, 1088, 603, 1084, 746, 1026, 749] },
  { id: "tent-37", shape: "poly", coords: [1101, 598, 1154, 600, 1154, 744, 1101, 742] },
  { id: "tent-38", shape: "poly", coords: [1169, 596, 1223, 596, 1223, 738, 1165, 738] },
];

export default function TentHeatMap({
  byTent,
  imageUrl = DEFAULT_IMAGE,
  selectedTentId,
  useBuckets = false,
  buckets,
}: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [w, setW] = useState(0);

  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setW(Math.round(e.contentRect.width));
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const d of byTent || []) {
      if (!d?.tentId) continue;
      m.set(String(d.tentId), Number(d.count || 0));
    }
    return m;
  }, [byTent]);

  const maxCount = useMemo(() => {
    let max = 0;
    counts.forEach((c) => (max = Math.max(max, c)));
    return max;
  }, [counts]);

  function lerp(a: number, b: number, t: number) {
    return Math.round(a + (b - a) * t);
  }

  function toRgba(hex: string, alpha = 0.6) {
    const h = hex.replace("#", "");
    const bigint = parseInt(h, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  // Always-on fill color (used for preFillColor)
  function colorForCount(count: number) {
    if (useBuckets && buckets?.length) {
      const b = buckets.find((x) => count <= x.max) || buckets[buckets.length - 1];
      return toRgba(b.color, 0.6);
    }
    if (maxCount <= 0) return "rgba(200,200,200,0.5)";
    const t = Math.max(0, Math.min(1, count / maxCount));
    // green -> red gradient
    const r = lerp(46, 220, t);
    const g = lerp(204, 50, t);
    const b = lerp(113, 50, t);
    return `rgba(${r}, ${g}, ${b}, 0.6)`;
  }

  // Build areas with preFillColor so fills show while disabled
  const displayAreas = useMemo(() => {
    return farmArea.map((a) => {
      const count = counts.get(a.id) || 0;
      const isSelected = a.id === selectedTentId;
      const fill = colorForCount(count);
      return {
        ...a,
        preFillColor: fill, // <- crucial: always visible when disabled
        fillColor: fill,    // set too for safety across versions
        strokeColor: isSelected ? "#000" : "rgba(0,0,0,0.6)",
        lineWidth: isSelected ? 2 : 1,
        title: `${a.id} • ${count} issues`,
      };
    });
  }, [counts, maxCount, selectedTentId, useBuckets, buckets]);

  return (
    <div ref={ref} className="w-full">
      <ImageMapper
        src={imageUrl}
        name="farm-map"
        areas={displayAreas}
        responsive
        parentWidth={w}
        disabled={true}          // disable hover so fills remain static
        isMulti={false}
        strokeColor="rgba(0,0,0,0)" // no global stroke; per-area strokeColor used
        // onClick will not fire while disabled; remove or keep if you’ll toggle it later
        // onClick={(area) => area?.id && onSelectTent?.(String(area.id))}
      />
      <Legend maxCount={maxCount} />
    </div>
  );
}

function Legend({ maxCount }: { maxCount: number }) {
  const steps = 6;
  const swatches = new Array(steps).fill(0).map((_, i) => {
    const t = i / (steps - 1);
    const r = Math.round(46 + (220 - 46) * t);
    const g = Math.round(204 + (50 - 204) * t);
    const b = Math.round(113 + (50 - 113) * t);
    return `rgb(${r}, ${g}, ${b})`;
  });

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
      <span style={{ fontSize: 12, color: "#555" }}>Low</span>
      <div style={{ display: "flex", gap: 2 }}>
        {swatches.map((c, i) => (
          <div key={i} style={{ width: 20, height: 10, background: c }} />
        ))}
      </div>
      <span style={{ fontSize: 12, color: "#555" }}>High ({maxCount})</span>
    </div>
  );
}