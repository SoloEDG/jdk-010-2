import type { Element, ScreenHit, Stokes } from "../../../shared/document";
import {
  stokesComponents,
  type PolComponents,
} from "../../optics/lib/polarization";
export interface Measurement {
  bins: number[];
  energy: number;
  centroid: number;
  spread: number;
  count: number;
  peak: number;
  /** 所有命中光线的 Stokes 矢量之和（互不相干光线直接相加） */
  stokes: Stokes;
  /** 各偏振分量的能量 */
  pol: PolComponents;
}
export function measure(
  screen: Element | undefined,
  hits: ScreenHit[],
  resolution: number,
): Measurement {
  const valid = screen ? hits.filter((h) => h.screen === screen.id) : [];
  const bins = Array<number>(resolution).fill(0);
  const stokes: Stokes = [0, 0, 0, 0];
  let energy = 0,
    centroid = 0;
  for (const h of valid) {
    const i = Math.max(
      0,
      Math.min(
        resolution - 1,
        Math.floor((h.position / screen!.size + 0.5) * resolution),
      ),
    );
    bins[i] += h.power;
    energy += h.power;
    centroid += h.position * h.power;
    stokes[0] += h.stokes[0];
    stokes[1] += h.stokes[1];
    stokes[2] += h.stokes[2];
    stokes[3] += h.stokes[3];
  }
  centroid = energy ? centroid / energy : 0;
  const spread = energy
    ? Math.sqrt(
        valid.reduce((s, h) => s + (h.position - centroid) ** 2 * h.power, 0) /
          energy,
      )
    : 0;
  return {
    bins,
    energy,
    centroid,
    spread,
    count: valid.length,
    peak: Math.max(0, ...bins),
    stokes,
    pol: stokesComponents(stokes),
  };
}
