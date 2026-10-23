import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const runtimeSource = await readFile(new URL("../worker/aesthetic-runtime.ts", import.meta.url), "utf8");
const runtimeDoc = await readFile(new URL("../docs/BOUQUET_AESTHETIC_RUNTIME.md", import.meta.url), "utf8");
const referenceDoc = await readFile(new URL("../docs/BOUQUET_DESIGN_REFERENCE.md", import.meta.url), "utf8");
const workerSource = await readFile(new URL("../worker/index.ts", import.meta.url), "utf8");
const pageSource = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

test("generation prompt follows the runtime art-direction order", () => {
  const headings = [
    "1. PRIMARY GESTURE",
    "2. SPATIAL COMPOSITION",
    "3. DOMINANT TENSION",
    "4. BRIGHTNESS / TEMPERATURE",
    "5. COLOR HIERARCHY",
    "6. SILHOUETTE",
    "7. MATERIAL BEHAVIOR",
    "8. FLORAL ELEMENTS",
    "9. PACKAGING",
    "10. LIGHTING / BACKGROUND",
    "11. NEGATIVE CONSTRAINTS",
  ];
  const positions = headings.map((heading) => runtimeSource.indexOf(heading));
  assert.ok(positions.every((position) => position >= 0));
  assert.deepEqual([...positions].sort((a, b) => a - b), positions);
});

test("portrait defaults are explicitly removed from palette and darkness", () => {
  assert.match(runtimeSource, /Black hair, skin, eyes and facial shadows are human defaults/);
  assert.match(runtimeSource, /exclude them from the palette and darkMass/);
});

test("runtime and historical design reference stay separated", () => {
  assert.match(runtimeDoc, /Runtime Aesthetic Spec v2\.0/);
  assert.match(runtimeDoc, /Runtime 只在审美经验能够蒸馏为跨案例通用规则时更新/);
  assert.match(referenceDoc, /运行时唯一规范：`BOUQUET_AESTHETIC_RUNTIME\.md`/);
  assert.match(referenceDoc, /不直接注入生成上下文/);
});

test("visual QA includes every hard-reject family", () => {
  for (const phrase of [
    "ordinary gift bouquet",
    "uniformly saturated wash",
    "accent hue is missing",
    "incidental hair/skin/features dominate",
    "flowers are evenly scattered",
    "all space is filled",
    "layered traditional gift wrapping",
    "no clearly visible Primary Gesture",
  ]) assert.match(runtimeSource, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("the browser runs analysis, rendering and QA as bounded requests", () => {
  for (const route of ["/api/analyse", "/api/render", "/api/qa"]) assert.match(workerSource, new RegExp(route));
  const phases = ["postGenerationPhase<{ analysis", "postGenerationPhase<{ imageDataUrl", "postGenerationPhase<{ qa"];
  const positions = phases.map((phase) => pageSource.indexOf(phase));
  assert.ok(positions.every((position) => position >= 0));
  assert.deepEqual([...positions].sort((a, b) => a - b), positions);
});

test("every result uses one fixed background and buildable florist materials", () => {
  assert.match(runtimeSource, /same seamless matte light neutral-grey studio background/);
  assert.match(runtimeSource, /approximately #d8d8d4/);
  assert.match(runtimeSource, /No mesh wall, perforated screen, architectural backdrop/);
  assert.match(runtimeSource, /purchasable, cuttable, bindable and stable in a hand-tied bouquet/);
  assert.match(runtimeDoc, /所有生成结果统一使用近似 `#d8d8d4`/);
  assert.match(runtimeDoc, /现实中可购买、可裁剪、可用花艺铁丝或胶带连接/);
});
