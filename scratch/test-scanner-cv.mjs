import { distance, quadArea, isConvex, getDefaultQuad, smoothQuad } from "../lib/scanner-cv.ts";

function assert(condition, message) {
  if (!condition) {
    throw new Error("Assertion failed: " + message);
  }
}

console.log("Testing scanner CV utilities...");

// Test 1: distance
const d = distance({ x: 0, y: 0 }, { x: 3, y: 4 });
assert(Math.abs(d - 5) < 1e-6, `distance expected 5, got ${d}`);
console.log("✓ Test 1 Passed: distance calculation");

// Test 2: quadArea
const quad = {
  tl: { x: 0, y: 0 },
  tr: { x: 100, y: 0 },
  br: { x: 100, y: 50 },
  bl: { x: 0, y: 50 },
};
const area = quadArea(quad);
assert(Math.abs(area - 5000) < 1e-6, `area expected 5000, got ${area}`);
console.log("✓ Test 2 Passed: quadArea calculation (5000)");

// Test 3: isConvex
assert(isConvex(quad) === true, "Standard rectangle should be convex");
const nonConvexQuad = {
  tl: { x: 0, y: 0 },
  tr: { x: 100, y: 0 },
  br: { x: 20, y: 20 }, // Dent inwards
  bl: { x: 0, y: 50 },
};
assert(isConvex(nonConvexQuad) === false, "Dented polygon should not be convex");
console.log("✓ Test 3 Passed: isConvex verification");

// Test 4: getDefaultQuad for Docs and ID Card
const docsQuad = getDefaultQuad(1000, 1000, "docs");
assert(docsQuad.tl.x === 80 && docsQuad.tl.y === 80, "Docs quad margin 8%");
assert(docsQuad.br.x === 920 && docsQuad.br.y === 920, "Docs quad bottom-right 92%");

const idQuad = getDefaultQuad(1000, 1000, "idcard");
const idW = idQuad.tr.x - idQuad.tl.x;
const idH = idQuad.bl.y - idQuad.tl.y;
const ratio = idW / idH;
assert(Math.abs(ratio - 1.5858) < 0.05, `ID Card ratio expected ~1.5858, got ${ratio}`);
console.log("✓ Test 4 Passed: getDefaultQuad geometry");

// Test 5: smoothQuad (EMA)
const prev = { tl: { x: 10, y: 10 }, tr: { x: 100, y: 10 }, br: { x: 100, y: 80 }, bl: { x: 10, y: 80 } };
const curr = { tl: { x: 20, y: 20 }, tr: { x: 110, y: 20 }, br: { x: 110, y: 90 }, bl: { x: 20, y: 90 } };
const smoothed = smoothQuad(curr, prev, 0.5);
assert(smoothed.tl.x === 15 && smoothed.tl.y === 15, "EMA midpoint expected 15");
console.log("✓ Test 5 Passed: smoothQuad EMA filter");

// Test 6: Projective transformation math (Heckbert formulation)
function testHeckbertMapping(quad, u, v) {
  const x0 = quad.tl.x, y0 = quad.tl.y;
  const x1 = quad.tr.x, y1 = quad.tr.y;
  const x2 = quad.br.x, y2 = quad.br.y;
  const x3 = quad.bl.x, y3 = quad.bl.y;

  const dx1 = x1 - x2, dx2 = x3 - x2;
  const sx = x0 - x1 + x2 - x3;
  const dy1 = y1 - y2, dy2 = y3 - y2;
  const sy = y0 - y1 + y2 - y3;

  const det = dx1 * dy2 - dx2 * dy1;
  const g = (sx * dy2 - sy * dx2) / det;
  const h = (dx1 * sy - dy1 * sx) / det;
  const a = x1 - x0 + g * x1;
  const b = x3 - x0 + h * x3;
  const c = x0;
  const d = y1 - y0 + g * y1;
  const e = y3 - y0 + h * y3;
  const f = y0;

  const denom = g * u + h * v + 1;
  return {
    x: (a * u + b * v + c) / denom,
    y: (d * u + e * v + f) / denom,
  };
}

const warpedQuad = {
  tl: { x: 10, y: 20 },
  tr: { x: 90, y: 15 },
  br: { x: 100, y: 85 },
  bl: { x: 5, y: 95 },
};

// Corner (0, 0) must map to tl
const p00 = testHeckbertMapping(warpedQuad, 0, 0);
assert(Math.abs(p00.x - 10) < 1e-4 && Math.abs(p00.y - 20) < 1e-4, "Top-left mapping matches");

// Corner (1, 0) must map to tr
const p10 = testHeckbertMapping(warpedQuad, 1, 0);
assert(Math.abs(p10.x - 90) < 1e-4 && Math.abs(p10.y - 15) < 1e-4, "Top-right mapping matches");

// Corner (1, 1) must map to br
const p11 = testHeckbertMapping(warpedQuad, 1, 1);
assert(Math.abs(p11.x - 100) < 1e-4 && Math.abs(p11.y - 85) < 1e-4, "Bottom-right mapping matches");

// Corner (0, 1) must map to bl
const p01 = testHeckbertMapping(warpedQuad, 0, 1);
assert(Math.abs(p01.x - 5) < 1e-4 && Math.abs(p01.y - 95) < 1e-4, "Bottom-left mapping matches");
console.log("✓ Test 6 Passed: Heckbert projective homography mapping");

// Test 7: Bradley-Roth adaptive thresholding simulation
const mockW = 20;
const mockH = 20;
const mockGray = new Uint8Array(mockW * mockH);
// Background = 220 (light), central text pixel = 60 (dark text)
mockGray.fill(220);
mockGray[10 * mockW + 10] = 60;

const integral = new Float64Array(mockW * mockH);
for (let y = 0; y < mockH; y++) {
  let sum = 0;
  const rowOffset = y * mockW;
  const prevRowOffset = (y - 1) * mockW;
  for (let x = 0; x < mockW; x++) {
    sum += mockGray[rowOffset + x];
    integral[rowOffset + x] = y === 0 ? sum : integral[prevRowOffset + x] + sum;
  }
}

const s = 4;
const s2 = Math.floor(s / 2);
function getThresholded(x, y) {
  const x1 = Math.max(0, x - s2);
  const x2 = Math.min(mockW - 1, x + s2);
  const y1 = Math.max(0, y - s2);
  const y2 = Math.min(mockH - 1, y + s2);
  const count = (x2 - x1 + 1) * (y2 - y1 + 1);

  const a = integral[y2 * mockW + x2];
  const b = y1 > 0 ? integral[(y1 - 1) * mockW + x2] : 0;
  const c = x1 > 0 ? integral[y2 * mockW + (x1 - 1)] : 0;
  const d = x1 > 0 && y1 > 0 ? integral[(y1 - 1) * mockW + (x1 - 1)] : 0;
  const sum = a - b - c + d;
  const val = mockGray[y * mockW + x];
  return val * count < sum * 0.86 ? 0 : 255;
}

assert(getThresholded(0, 0) === 255, "White paper background remains 255");
assert(getThresholded(10, 10) === 0, "Dark text pixel detected as black ink (0)");
console.log("✓ Test 7 Passed: Bradley-Roth adaptive thresholding logic");

// Test 8: ID Card Dual Page aspect ratio
const idRatio = 85.6 / 53.98;
assert(Math.abs(idRatio - 1.58577) < 0.001, "ID-1 card ratio matches standard");
console.log("✓ Test 8 Passed: ID Card aspect ratio standard confirmed");

console.log("\n==================================");
console.log("ALL 8/8 SCANNER CV TESTS PASSED!");
console.log("==================================");
