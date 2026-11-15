import type { Element, Stokes } from "../../../shared/document";

/**
 * 偏振演算核心。
 *
 * 状态表达：所有光线统一携带 Stokes 矢量 S = [I, Q, U, C]，
 * 参考每条光线自己的局部横向基底 (V, H)：
 *   V = 台面法线（竖直方向，全局不变），
 *   H = 台面内垂直于传播方向的单位矢量（随光线弯折/反射而改变）。
 * 器件角度（透光轴、快轴、偏振方向）一律自 V 起算，
 * 因此不是实验台的绝对角度，而是在光线局部基底中的角度。
 *
 * 完全偏振：Q²+U²+C² = I²，等价于 Jones 矢量（全局相位除外），
 * 相干信息（两分量相位差）保留在 U、C 中，经波片时不会丢失。
 * 部分偏振：Q²+U²+C² < I²，为混合态（等价于 2×2 相干矩阵）。
 * 互不相干的光线（不同光源、不同路径）在接收屏处对 Stokes 矢量
 * 直接相加 —— 绝不能把它们的 Jones 矢量当作同一偏振态相干叠加。
 *
 * 器件作用通过 Mueller 矩阵完成；Mueller 矩阵由 Jones 矩阵经
 *   M_ij = ½ Tr(σ_i J σ_j J†)
 * 生成，保证波片的相位信息被完整保留。
 */

type C = [number, number]; // [实部, 虚部]

const cadd = (a: C, b: C): C => [a[0] + b[0], a[1] + b[1]];
const cmul = (a: C, b: C): C => [
  a[0] * b[0] - a[1] * b[1],
  a[0] * b[1] + a[1] * b[0],
];
const conj = (a: C): C => [a[0], -a[1]];

type Mat2 = [C, C, C, C]; // 行优先 2×2

function mul2(a: Mat2, b: Mat2): Mat2 {
  return [
    cadd(cmul(a[0], b[0]), cmul(a[1], b[2])),
    cadd(cmul(a[0], b[1]), cmul(a[1], b[3])),
    cadd(cmul(a[2], b[0]), cmul(a[3], b[2])),
    cadd(cmul(a[2], b[1]), cmul(a[3], b[3])),
  ];
}
function dagger(a: Mat2): Mat2 {
  return [conj(a[0]), conj(a[2]), conj(a[1]), conj(a[3])];
}
function trace2(a: Mat2): C {
  return cadd(a[0], a[3]);
}

const PAULI: Mat2[] = [
  [
    [1, 0],
    [0, 0],
    [0, 0],
    [1, 0],
  ],
  [
    [1, 0],
    [0, 0],
    [0, 0],
    [-1, 0],
  ],
  [
    [0, 0],
    [1, 0],
    [1, 0],
    [0, 0],
  ],
  [
    [0, 0],
    [0, -1],
    [0, 1],
    [0, 0],
  ],
];

export type Mueller = number[][]; // 4×4，行优先

/** 由 Jones 矩阵生成 Mueller 矩阵：M_ij = ½ Tr(σ_i J σ_j J†) */
export function muellerFromJones(j: Mat2): Mueller {
  const jd = dagger(j);
  return PAULI.map((si) =>
    PAULI.map((sj) => 0.5 * trace2(mul2(mul2(si, j), mul2(sj, jd)))[0]),
  );
}

export function applyMueller(m: Mueller, s: Stokes): Stokes {
  return [0, 1, 2, 3].map((i) =>
    m[i][0] * s[0] + m[i][1] * s[1] + m[i][2] * s[2] + m[i][3] * s[3],
  ) as Stokes;
}

export function scaleStokes(s: Stokes, k: number): Stokes {
  return [s[0] * k, s[1] * k, s[2] * k, s[3] * k];
}

const rad = (deg: number) => (deg * Math.PI) / 180;

/** 理想线偏振片，透光轴自台面法线起算 axis 度 */
export function polarizerMueller(axisDeg: number): Mueller {
  const c = Math.cos(rad(axisDeg)),
    s = Math.sin(rad(axisDeg));
  return muellerFromJones([
    [c * c, 0],
    [c * s, 0],
    [c * s, 0],
    [s * s, 0],
  ]);
}

/** 波片：快轴自台面法线起算 axis 度，相位延迟 retardance 度 */
export function waveplateMueller(axisDeg: number, retardDeg: number): Mueller {
  const a = rad(axisDeg),
    d = rad(retardDeg),
    ca = Math.cos(a),
    sa = Math.sin(a),
    ed: C = [Math.cos(d), Math.sin(d)];
  // J = R(axis) · diag(1, e^{iδ}) · R(axis)ᵀ，快轴沿 (cos axis, sin axis)
  const oneMinusEd: C = [1 - ed[0], -ed[1]];
  return muellerFromJones([
    [ca * ca + sa * sa * ed[0], sa * sa * ed[1]],
    [ca * sa * oneMinusEd[0], ca * sa * oneMinusEd[1]],
    [ca * sa * oneMinusEd[0], ca * sa * oneMinusEd[1]],
    [sa * sa + ca * ca * ed[0], ca * ca * ed[1]],
  ]);
}

/**
 * 镜面反射（含棱镜全反射）的 Mueller 矩阵。
 * 反射后光线的局部横向基底重定义（H 反向），物理场随之镜像，
 * 在新基底中等价于 Jones 对角阵 diag(1, −1)：
 * 线偏振方向镜像、圆偏振旋向翻转，而能量不变。
 */
export const REFLECTION_MUELLER: Mueller = muellerFromJones([
  [1, 0],
  [0, 0],
  [0, 0],
  [-1, 0],
]);

/** 光源出射的 Stokes 矢量（总功率 power，在每条光线的局部基底中表达） */
export function sourceStokes(source: Element, power: number): Stokes {
  switch (source.polarization) {
    case "linear": {
      const a = rad(source.polAngle);
      return [power, power * Math.cos(2 * a), power * Math.sin(2 * a), 0];
    }
    case "circular":
      return [power, 0, 0, power * (source.polHandedness < 0 ? -1 : 1)];
    case "partial": {
      const p = Math.max(0, Math.min(1, source.polDegree)),
        a = rad(source.polAngle);
      return [
        power,
        power * p * Math.cos(2 * a),
        power * p * Math.sin(2 * a),
        0,
      ];
    }
    default:
      return [power, 0, 0, 0];
  }
}

export interface PolComponents {
  vertical: number;
  horizontal: number;
  diag45: number;
  diag135: number;
  right: number;
  left: number;
  /** 偏振度 0…1 */
  dop: number;
  /** 偏振部分的线偏振方向（自台面法线起算，度） */
  angle: number;
}

/** 由（可非相干累加的）Stokes 矢量提取各偏振分量能量 */
export function stokesComponents(s: Stokes): PolComponents {
  const [i, q, u, c] = s;
  return {
    vertical: (i + q) / 2,
    horizontal: (i - q) / 2,
    diag45: (i + u) / 2,
    diag135: (i - u) / 2,
    right: (i + c) / 2,
    left: (i - c) / 2,
    dop: i > 1e-12 ? Math.min(1, Math.hypot(q, u, c) / i) : 0,
    angle: (Math.atan2(u, q) * 90) / Math.PI,
  };
}
