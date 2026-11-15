import { Trash2, SlidersHorizontal } from "lucide-react";
import {
  labels,
  type Element,
  type Polarization,
} from "../../../shared/document";
import { parameters } from "../lib/parameters";
const polarizationOptions: { value: Polarization; label: string }[] = [
  { value: "unpolarized", label: "自然光（非偏振）" },
  { value: "linear", label: "线偏振" },
  { value: "circular", label: "圆偏振" },
  { value: "partial", label: "部分偏振" },
];
export function Inspector({
  element,
  onUpdate,
  onRemove,
}: {
  element?: Element;
  onUpdate: (patch: Partial<Element>) => void;
  onRemove: () => void;
}) {
  if (!element)
    return (
      <section className="inspector">
        <div className="section-title">
          器件属性 <SlidersHorizontal size={15} />
        </div>
        <p className="empty">
          选择实验台上的器件
          <br />
          查看并调整光学参数
        </p>
      </section>
    );
  return (
    <section className="inspector">
      <div className="section-title">
        器件属性 <SlidersHorizontal size={15} />
      </div>
      <div className="selected-name">
        <i />
        {labels[element.kind]}
        <span>已选中</span>
      </div>
      <div className="coordinates">
        {(["x", "y"] as const).map((key) => (
          <label key={key}>
            {key.toUpperCase()}
            <input
              aria-label={key + " 坐标"}
              type="number"
              min="20"
              max={key === "x" ? 980 : 580}
              value={Math.round(element[key])}
              onChange={(e) =>
                onUpdate({
                  [key]: Math.max(
                    20,
                    Math.min(key === "x" ? 980 : 580, Number(e.target.value)),
                  ),
                })
              }
            />
            <small>mm</small>
          </label>
        ))}
      </div>
      {element.kind === "source" && (
        <label className="parameter">
          <span>
            偏振态
            <b>
              <select
                aria-label="偏振态"
                value={element.polarization}
                onChange={(e) =>
                  onUpdate({ polarization: e.target.value as Polarization })
                }
              >
                {polarizationOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </b>
          </span>
        </label>
      )}
      {element.kind === "source" && element.polarization === "circular" && (
        <label className="parameter">
          <span>
            旋向
            <b>
              <select
                aria-label="圆偏振旋向"
                value={element.polHandedness < 0 ? "left" : "right"}
                onChange={(e) =>
                  onUpdate({
                    polHandedness: e.target.value === "left" ? -1 : 1,
                  })
                }
              >
                <option value="right">右旋</option>
                <option value="left">左旋</option>
              </select>
            </b>
          </span>
        </label>
      )}
      {parameters(element).map((p) => (
        <label className="parameter" key={p.key}>
          <span>
            {p.label}
            <b>
              {Number(element[p.key]).toFixed(p.step < 1 ? 2 : 0)}{" "}
              <small>{p.unit}</small>
            </b>
          </span>
          <input
            aria-label={p.label}
            type="range"
            min={p.min}
            max={p.max}
            step={p.step}
            value={Number(element[p.key])}
            onChange={(e) =>
              onUpdate({
                [p.key]:
                  p.key === "focal" && Number(e.target.value) === 0
                    ? 10
                    : Number(e.target.value),
              })
            }
          />
          <div className="range-label">
            <span>{p.min}</span>
            <span>{p.max}</span>
          </div>
        </label>
      ))}
      <button className="delete" onClick={onRemove}>
        <Trash2 size={14} />
        移除器件
      </button>
    </section>
  );
}
