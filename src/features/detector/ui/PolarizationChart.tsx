import type { Measurement } from "../lib/measurement";
/**
 * 偏振图：由接收屏上累加的 Stokes 矢量绘制。
 * 左侧为偏振椭圆（偏振部分的轨迹，竖直方向 = 台面法线），
 * 右侧为六个正交分量的能量占比柱状图。
 * 数据与总功率来自同一次追迹，保存/撤销后始终对应同一布局。
 */
export function PolarizationChart({ measurement: m }: { measurement: Measurement }) {
  const [i, q, u, c] = m.stokes;
  const polI = Math.hypot(q, u, c);
  // 偏振椭圆参数：方位角 ψ = ½atan2(U,Q)，椭圆度 χ = ½asin(C/|S|)
  const psi = Math.atan2(u, q) / 2,
    chi = polI > 1e-12 ? Math.asin(Math.max(-1, Math.min(1, c / polI))) / 2 : 0;
  const rx = 26 * Math.cos(Math.abs(chi)),
    ry = 26 * Math.sin(Math.abs(chi)) * (chi < 0 ? -1 : 1);
  const deg = (psi * 180) / Math.PI - 90;
  const bars: { label: string; value: number; color: string }[] = [
    { label: "竖直", value: m.pol.vertical, color: "#9ecaff" },
    { label: "水平", value: m.pol.horizontal, color: "#9ecaff" },
    { label: "+45°", value: m.pol.diag45, color: "#c0a8f5" },
    { label: "−45°", value: m.pol.diag135, color: "#c0a8f5" },
    { label: "右旋", value: m.pol.right, color: "#f5b267" },
    { label: "左旋", value: m.pol.left, color: "#f5b267" },
  ];
  const max = Math.max(1e-12, ...bars.map((b) => b.value));
  return (
    <div className="pol-chart">
      <svg viewBox="0 0 80 80" className="pol-ellipse" aria-label="偏振椭圆">
        <line x1="40" y1="6" x2="40" y2="74" stroke="#2c3947" strokeDasharray="2 4" />
        <line x1="6" y1="40" x2="74" y2="40" stroke="#2c3947" strokeDasharray="2 4" />
        {i > 1e-12 && polI > 1e-9 ? (
          <ellipse
            cx="40"
            cy="40"
            rx={Math.max(0.5, rx)}
            ry={Math.max(0.5, Math.abs(ry))}
            transform={`rotate(${deg} 40 40)`}
            fill="none"
            stroke="#b5eb78"
            strokeWidth="2"
          />
        ) : (
          <circle cx="40" cy="40" r="3" fill="#b5eb78" />
        )}
        <text x="40" y="12" textAnchor="middle" fontSize="7" fill="#637b8c">
          V
        </text>
        <text x="72" y="43" textAnchor="end" fontSize="7" fill="#637b8c">
          H
        </text>
      </svg>
      <div className="pol-bars">
        {bars.map((b) => (
          <div key={b.label} className="pol-bar">
            <span>{b.label}</span>
            <div className="pol-bar-track">
              <i
                style={{
                  width: `${(b.value / max) * 100}%`,
                  background: b.color,
                }}
              />
            </div>
            <em>{b.value.toFixed(3)} W</em>
          </div>
        ))}
      </div>
      <div className="pol-summary">
        <small>偏振度</small>
        <strong>{(m.pol.dop * 100).toFixed(1)}%</strong>
      </div>
    </div>
  );
}
