import type { LabDocument, TraceResult } from "../../../shared/document";
export function evaluateMission(
  id: string,
  doc: LabDocument,
  result: TraceResult,
) {
  const energy = doc.items
    .filter((e) => e.kind === "source")
    .reduce((s, e) => s + e.power, 0);
  const hits = result.hits;
  const received = hits.reduce((s, h) => s + h.power, 0);
  const center = received
    ? hits.reduce((s, h) => s + h.position * h.power, 0) / received
    : 0;
  const rms = received
    ? Math.sqrt(
        hits.reduce((s, h) => s + (h.position - center) ** 2 * h.power, 0) /
          received,
      )
    : Infinity;
  const ratio = energy ? received / energy : 0;
  const prism = doc.items.some((e) => e.kind === "prism");
  if (id === "extinction") {
    // 交叉偏振片：光确实到达接收屏（命中数 > 0），但能量被消光到阈值以下
    const polarizers = doc.items.filter((e) => e.kind === "polarizer").length;
    const complete = polarizers >= 2 && hits.length > 0 && ratio <= 0.02;
    return {
      complete,
      ratio,
      rms,
      progress: complete
        ? 1
        : Math.max(0, Math.min(0.99, (0.25 - ratio) / 0.23)),
    };
  }
  if (id === "circular") {
    // 圆偏振分量占比 |C| / I（对屏幕上非相干累加的 Stokes 矢量求值）
    let i = 0,
      c = 0;
    for (const h of hits) {
      i += h.stokes[0];
      c += h.stokes[3];
    }
    const circularity = i > 1e-12 ? Math.abs(c) / i : 0;
    const complete = ratio >= 0.5 && circularity >= 0.9;
    return {
      complete,
      ratio,
      rms,
      progress: Math.min(
        complete ? 1 : 0.99,
        Math.min(ratio / 0.5, circularity / 0.9),
      ),
    };
  }
  const complete =
    id === "focus"
      ? ratio >= 0.8 && rms <= 3
      : id === "reflection"
        ? ratio >= 0.8
        : ratio >= 0.6 && prism;
  return {
    complete,
    ratio,
    rms,
    progress: Math.min(
      1,
      id === "focus"
        ? Math.min(ratio / 0.8, 3 / Math.max(3, rms))
        : ratio / (id === "reflection" ? 0.8 : 0.6),
    ),
  };
}
