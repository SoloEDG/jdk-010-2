export type Kind =
  | "source"
  | "mirror"
  | "lens"
  | "prism"
  | "polarizer"
  | "waveplate"
  | "screen";
export type Polarization = "unpolarized" | "linear" | "circular" | "partial";
/**
 * 光线偏振态统一采用 Stokes 矢量 [I, Q, U, C] 表达，
 * 参考基底为光线的局部横向基底：V = 台面法线（竖直方向），H = 台面内 ⊥ 传播方向。
 * Q = V − H，U = +45° − (−45°)（自 V 起算），C = 右旋 − 左旋。
 * 完全偏振时 Q²+U²+C² = I²（等价于 Jones 矢量，相位差信息保留在 U、C 中）；
 * 部分偏振为混合态；互不相干的光线在接收屏处对 Stokes 矢量直接相加。
 */
export type Stokes = [number, number, number, number];
export interface Point {
  x: number;
  y: number;
}
export interface Element extends Point {
  id: string;
  kind: Kind;
  angle: number;
  size: number;
  power: number;
  rays: number;
  spread: number;
  wavelength: number;
  focal: number;
  index: number;
  /** 偏振片透光轴 / 波片快轴方向，自台面法线（竖直）起算，单位度 */
  axis: number;
  /** 波片相位延迟，单位度（90 = λ/4，180 = λ/2） */
  retardance: number;
  polarization: Polarization;
  /** 线偏振 / 部分偏振的偏振方向，自台面法线起算，单位度 */
  polAngle: number;
  /** 部分偏振光的偏振度 0…1 */
  polDegree: number;
  /** 圆偏振旋向：+1 右旋，−1 左旋 */
  polHandedness: number;
}
export interface LabDocument {
  version: 1;
  items: Element[];
}
export interface Segment {
  from: Point;
  to: Point;
  power: number;
  wavelength: number;
  source: string;
  stokes: Stokes;
}
export interface ScreenHit {
  screen: string;
  position: number;
  power: number;
  wavelength: number;
  source: string;
  stokes: Stokes;
}
export interface TraceResult {
  segments: Segment[];
  hits: ScreenHit[];
  truncated: number;
}
export const labels: Record<Kind, string> = {
  source: "光源",
  mirror: "平面镜",
  lens: "凸透镜",
  prism: "三棱镜",
  polarizer: "偏振片",
  waveplate: "波片",
  screen: "接收屏",
};
