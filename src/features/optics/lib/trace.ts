import type { LabDocument, Stokes, TraceResult } from "../../../shared/document";
import { add, mul, dot, sub, direction, norm } from "../../../shared/geometry";
import { emit } from "./emission";
import { nearestSurface } from "./surfaces";
import { reflect, refract, materialIndex } from "./refraction";
import {
  applyMueller,
  polarizerMueller,
  waveplateMueller,
  REFLECTION_MUELLER,
  scaleStokes,
  sourceStokes,
  type Mueller,
} from "./polarization";
export function trace(doc: LabDocument): TraceResult {
  const result: TraceResult = { segments: [], hits: [], truncated: 0 };
  // 每个偏振器件的 Mueller 矩阵只计算一次，供所有光线复用
  const muellers = new Map<string, Mueller>();
  for (const e of doc.items) {
    if (e.kind === "polarizer") muellers.set(e.id, polarizerMueller(e.axis));
    if (e.kind === "waveplate")
      muellers.set(e.id, waveplateMueller(e.axis, e.retardance));
  }
  for (const source of doc.items.filter((e) => e.kind === "source"))
    for (const ray of emit(source)) {
      let o = ray.origin,
        d = ray.direction,
        inside: string | null = null,
        // 偏振态在光线自己的局部横向基底 (V = 台面法线, H = 台面内 ⊥ d) 中表达；
        // 折射/透镜弯折时基底随光线一起旋转，Stokes 矢量无需变换。
        stokes: Stokes = sourceStokes(source, ray.power);
      for (let bounce = 0; bounce < 32; bounce++) {
        const hit = nearestSurface(doc.items, o, d);
        const dest = hit?.point ?? add(o, mul(d, 1800));
        result.segments.push({
          from: o,
          to: dest,
          power: stokes[0],
          wavelength: source.wavelength,
          source: source.id,
          stokes,
        });
        if (!hit) break;
        const e = hit.element;
        if (e.kind === "screen") {
          result.hits.push({
            screen: e.id,
            position: dot(sub(hit.point, e), direction(e.angle)),
            power: stokes[0],
            wavelength: source.wavelength,
            source: source.id,
            stokes,
          });
          break;
        }
        if (e.kind === "mirror") {
          d = reflect(d, hit.normal);
          // 反射后局部横向基底重定义：Stokes 经反射 Mueller 矩阵变换，
          // 线偏振方向镜像、圆偏振旋向翻转，不能沿用实验台绝对角度。
          stokes = applyMueller(REFLECTION_MUELLER, stokes);
        }
        if (e.kind === "polarizer" || e.kind === "waveplate")
          stokes = applyMueller(muellers.get(e.id)!, stokes);
        if (e.kind === "lens") {
          const axis = direction(e.angle - 90),
            tangent = direction(e.angle),
            forward = dot(d, axis) >= 0 ? 1 : -1,
            u = dot(sub(hit.point, e), tangent),
            axial = Math.max(0.0001, Math.abs(dot(d, axis))),
            slope = dot(d, tangent) / axial - u / e.focal;
          d = norm(add(mul(axis, forward), mul(tangent, slope)));
        }
        if (e.kind === "prism") {
          const n = materialIndex(e.index, source.wavelength),
            exiting: boolean = inside === e.id,
            transmitted = refract(
              d,
              hit.normal,
              exiting ? n : 1,
              exiting ? 1 : n,
            );
          if (transmitted) {
            d = transmitted;
            inside = exiting ? null : e.id;
            stokes = scaleStokes(stokes, 0.96);
          } else {
            d = reflect(d, hit.normal);
            stokes = applyMueller(REFLECTION_MUELLER, stokes);
          }
        }
        o = add(hit.point, mul(d, 0.01));
        if (bounce === 31) result.truncated++;
      }
    }
  return result;
}
