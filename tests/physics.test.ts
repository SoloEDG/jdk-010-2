import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reflect, refract } from '../src/features/optics/lib/refraction';
import { trace } from '../src/features/optics/lib/trace';
import { sourceStokes, stokesComponents } from '../src/features/optics/lib/polarization';
import type { Element, LabDocument } from '../src/shared/document';

const el = (id: string, kind: Element['kind'], x: number, y: number, patch: Partial<Element> = {}): Element => ({
  id, kind, x, y,
  angle: kind === 'source' ? 0 : 90,
  size: 180, power: 1, rays: 9, spread: 0, wavelength: 550, focal: 150, index: 1.5,
  axis: 0, retardance: 90, polarization: 'unpolarized', polAngle: 0, polDegree: 0.5, polHandedness: 1,
  ...patch,
});
const doc = (...items: Element[]): LabDocument => ({ version: 1, items });

test('reflection preserves norm and reverses the normal component', () => {
  const r = reflect({ x: 1, y: 0 }, { x: -1, y: 0 });
  assert.deepEqual(r, { x: -1, y: 0 });
});
test('total internal reflection returns no transmitted direction', () =>
  assert.equal(refract({ x: .8, y: .6 }, { x: 0, y: -1 }, 1.5, 1), null));
test('parallel rays converge through a thin lens onto a screen', () => {
  const r = trace(doc(
    el('s', 'source', 100, 300, { size: 100 }),
    el('l', 'lens', 400, 300, { size: 200 }),
    el('d', 'screen', 550, 300, { size: 200 }),
  ));
  assert.equal(r.hits.length, 9);
  assert.ok(r.hits.every(h => Math.abs(h.position) < .01));
});

test('crossed polarizers extinguish the beam (Malus law)', () => {
  const base = [
    el('s', 'source', 100, 300, { size: 40, polarization: 'linear', polAngle: 0 }),
    el('p1', 'polarizer', 350, 300, { axis: 0, size: 120 }),
    el('d', 'screen', 800, 300, { size: 200 }),
  ];
  const parallel = trace(doc(...base.map(e => ({ ...e }))));
  assert.ok(parallel.hits.reduce((s, h) => s + h.power, 0) > 0.99);
  for (const [axis, expected] of [[45, 0.5], [90, 0]] as const) {
    const r = trace(doc(
      el('s', 'source', 100, 300, { size: 40, polarization: 'linear', polAngle: 0 }),
      el('p1', 'polarizer', 350, 300, { axis: 0, size: 120 }),
      el('p2', 'polarizer', 550, 300, { axis, size: 120 }),
      el('d', 'screen', 800, 300, { size: 200 }),
    ));
    const energy = r.hits.reduce((s, h) => s + h.power, 0);
    assert.ok(Math.abs(energy - expected) < 1e-9, `axis ${axis}: ${energy}`);
  }
});
test('unpolarized light loses half its power through a polarizer', () => {
  const r = trace(doc(
    el('s', 'source', 100, 300, { size: 40 }),
    el('p', 'polarizer', 400, 300, { axis: 30, size: 120 }),
    el('d', 'screen', 800, 300, { size: 200 }),
  ));
  const m = stokesComponents([r.hits.reduce((s, h) => s + h.stokes[0], 0), r.hits.reduce((s, h) => s + h.stokes[1], 0), r.hits.reduce((s, h) => s + h.stokes[2], 0), r.hits.reduce((s, h) => s + h.stokes[3], 0)]);
  assert.ok(Math.abs(m.vertical + m.horizontal - 0.5) < 1e-9);
  assert.ok(Math.abs(m.dop - 1) < 1e-9);
});
test('quarter-wave plate at 45° turns linear light circular', () => {
  const r = trace(doc(
    el('s', 'source', 100, 300, { size: 40, polarization: 'linear', polAngle: 45 }),
    el('w', 'waveplate', 400, 300, { axis: 0, retardance: 90, size: 120 }),
    el('d', 'screen', 800, 300, { size: 200 }),
  ));
  const c = r.hits.reduce((s, h) => s + h.stokes[3], 0);
  const i = r.hits.reduce((s, h) => s + h.stokes[0], 0);
  assert.ok(Math.abs(Math.abs(c / i) - 1) < 1e-9);
});
test('half-wave plate mirrors the linear polarization direction', () => {
  const r = trace(doc(
    el('s', 'source', 100, 300, { size: 40, polarization: 'linear', polAngle: 45 }),
    el('w', 'waveplate', 400, 300, { axis: 0, retardance: 180, size: 120 }),
    el('d', 'screen', 800, 300, { size: 200 }),
  ));
  const u = r.hits.reduce((s, h) => s + h.stokes[2], 0);
  const i = r.hits.reduce((s, h) => s + h.stokes[0], 0);
  assert.ok(Math.abs(u / i + 1) < 1e-9);
});
test('mirror reflection flips circular handedness; two reflections restore it', () => {
  const one = trace(doc(
    el('s', 'source', 100, 300, { size: 40, polarization: 'circular' }),
    el('m', 'mirror', 500, 300, { angle: 45, size: 200 }),
    el('d', 'screen', 500, 500, { angle: 0, size: 200 }),
  ));
  const c1 = one.hits.reduce((s, h) => s + h.stokes[3], 0);
  assert.ok(c1 < -0.99, `after one reflection C=${c1}`);
  const two = trace(doc(
    el('s', 'source', 100, 300, { size: 40, polarization: 'circular' }),
    el('m1', 'mirror', 500, 300, { angle: 45, size: 200 }),
    el('m2', 'mirror', 500, 500, { angle: 45, size: 200 }),
    el('d', 'screen', 800, 500, { angle: 90, size: 300 }),
  ));
  const c2 = two.hits.reduce((s, h) => s + h.stokes[3], 0);
  assert.ok(c2 > 0.99, `after two reflections C=${c2}`);
});
test('partial polarization keeps its degree; polarizer repolarizes it', () => {
  const direct = sourceStokes(el('s', 'source', 0, 0, { polarization: 'partial', polDegree: 0.6 }), 1);
  assert.ok(Math.abs(stokesComponents(direct).dop - 0.6) < 1e-12);
  const r = trace(doc(
    el('s', 'source', 100, 300, { size: 40, polarization: 'partial', polDegree: 0.6, polAngle: 0 }),
    el('p', 'polarizer', 400, 300, { axis: 0, size: 120 }),
    el('d', 'screen', 800, 300, { size: 200 }),
  ));
  const s = r.hits.reduce((a, h) => [a[0] + h.stokes[0], a[1] + h.stokes[1], a[2] + h.stokes[2], a[3] + h.stokes[3]], [0, 0, 0, 0]);
  const m = stokesComponents(s);
  assert.ok(Math.abs(m.dop - 1) < 1e-9);
  assert.ok(Math.abs(s[0] - 0.8) < 1e-9, `transmitted ${s[0]}`);
});
test('mutually incoherent sources sum as Stokes vectors, not as one state', () => {
  const r = trace(doc(
    el('a', 'source', 100, 250, { size: 40, polarization: 'linear', polAngle: 0 }),
    el('b', 'source', 100, 350, { size: 40, polarization: 'linear', polAngle: 90 }),
    el('d', 'screen', 700, 300, { size: 400 }),
  ));
  const s = r.hits.reduce((a, h) => [a[0] + h.stokes[0], a[1] + h.stokes[1], a[2] + h.stokes[2], a[3] + h.stokes[3]], [0, 0, 0, 0]);
  const m = stokesComponents(s);
  assert.ok(Math.abs(s[0] - 2) < 1e-9);
  assert.ok(Math.abs(m.dop) < 1e-9, 'orthogonal incoherent mix is unpolarized');
});
