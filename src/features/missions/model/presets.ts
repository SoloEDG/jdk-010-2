import type { Element, LabDocument } from "../../../shared/document";
const e = (
  id: string,
  kind: Element["kind"],
  x: number,
  y: number,
  patch: Partial<Element> = {},
): Element => ({
  id,
  kind,
  x,
  y,
  angle: kind === "source" ? 0 : 90,
  size: 180,
  power: 1,
  rays: 9,
  spread: 0,
  wavelength: 550,
  focal: 180,
  index: 1.52,
  axis: 0,
  retardance: 90,
  polarization: "unpolarized",
  polAngle: 0,
  polDegree: 0.5,
  polHandedness: 1,
  ...patch,
});
export const missions = [
  {
    id: "focus",
    name: "寻找焦点",
    tag: "透镜成像",
    description: "移动接收屏，使平行光经凸透镜后汇聚成一个清晰光斑。",
    condition: "接收 ≥ 80% 光能，RMS 半径 ≤ 3 mm",
    doc: {
      version: 1,
      items: [
        e("source", "source", 140, 300, { size: 120 }),
        e("lens", "lens", 450, 300, { size: 240 }),
        e("screen", "screen", 790, 300, { size: 230 }),
      ],
    } as LabDocument,
  },
  {
    id: "reflection",
    name: "转折的光",
    tag: "镜面反射",
    description: "调整镜面方向，把光束转向上方的接收屏。",
    condition: "接收屏捕获 ≥ 80% 光源能量",
    doc: {
      version: 1,
      items: [
        e("source", "source", 150, 370, { size: 60 }),
        e("mirror", "mirror", 500, 370, { angle: -35 }),
        e("screen", "screen", 500, 100, { angle: 0, size: 200 }),
      ],
    } as LabDocument,
  },
  {
    id: "refraction",
    name: "穿过玻璃",
    tag: "棱镜折射",
    description: "移动接收屏，捕获穿过三棱镜的折射光束。",
    condition: "经过棱镜后，接收 ≥ 60% 光源能量",
    doc: {
      version: 1,
      items: [
        e("source", "source", 130, 280, { size: 45 }),
        e("prism", "prism", 490, 300, { angle: -90, size: 170 }),
        e("screen", "screen", 800, 300, { size: 200 }),
      ],
    } as LabDocument,
  },
  {
    id: "extinction",
    name: "交叉偏振片消光",
    tag: "偏振 · 马吕斯定律",
    description:
      "线偏振光依次通过两片偏振片。旋转第二片偏振片的透光轴，使它与第一片正交，观察接收屏上的消光现象。",
    condition: "两片偏振片均在光路中，接收能量 ≤ 2% 光源能量",
    doc: {
      version: 1,
      items: [
        e("source", "source", 120, 300, {
          size: 60,
          polarization: "linear",
          polAngle: 0,
        }),
        e("polarizer-a", "polarizer", 360, 300, { axis: 0, size: 140 }),
        e("polarizer-b", "polarizer", 560, 300, { axis: 30, size: 140 }),
        e("screen", "screen", 810, 300, { size: 200 }),
      ],
    } as LabDocument,
  },
  {
    id: "circular",
    name: "合成圆偏振光",
    tag: "偏振 · 四分之一波片",
    description:
      "线偏振光穿过四分之一波片。调整波片快轴，使出射光变为圆偏振 —— 接收屏的圆偏振分量应占绝对优势。",
    condition: "接收 ≥ 50% 光能，且圆偏振分量 ≥ 90%",
    doc: {
      version: 1,
      items: [
        e("source", "source", 120, 300, {
          size: 60,
          polarization: "linear",
          polAngle: 45,
        }),
        e("qwp", "waveplate", 480, 300, {
          axis: 15,
          retardance: 90,
          size: 140,
        }),
        e("screen", "screen", 810, 300, { size: 200 }),
      ],
    } as LabDocument,
  },
];
export const initialDocument = missions[0].doc;
