import type { LabDocument } from "../../../shared/document";
export function saveDocument(doc: LabDocument) {
  localStorage.setItem("lumen-document", JSON.stringify(doc));
}
const KINDS = [
  "source",
  "mirror",
  "lens",
  "prism",
  "polarizer",
  "waveplate",
  "screen",
];
const POLARIZATIONS = ["unpolarized", "linear", "circular", "partial"];
export function loadDocument(): LabDocument | null {
  try {
    const v = JSON.parse(localStorage.getItem("lumen-document") ?? "null");
    if (v?.version !== 1 || !Array.isArray(v.items) || v.items.length > 80)
      return null;
    for (const e of v.items) {
      if (!KINDS.includes(e.kind) || typeof e.id !== "string") return null;
      for (const k of [
        "x",
        "y",
        "angle",
        "size",
        "power",
        "rays",
        "spread",
        "wavelength",
        "focal",
        "index",
      ])
        if (!Number.isFinite(e[k])) return null;
      if (
        e.rays < 1 ||
        e.rays > 41 ||
        e.size <= 0 ||
        e.focal === 0 ||
        e.index < 1
      )
        return null;
      // 旧版本文档缺少偏振字段：填充默认值完成迁移，
      // 保证重开后偏振图与总功率对应同一布局。
      if (!Number.isFinite(e.axis)) e.axis = 0;
      if (!Number.isFinite(e.retardance)) e.retardance = 90;
      if (!Number.isFinite(e.polAngle)) e.polAngle = 0;
      if (!Number.isFinite(e.polDegree)) e.polDegree = 0.5;
      e.polHandedness = e.polHandedness === -1 ? -1 : 1;
      if (!POLARIZATIONS.includes(e.polarization))
        e.polarization = "unpolarized";
    }
    return v;
  } catch {
    return null;
  }
}
