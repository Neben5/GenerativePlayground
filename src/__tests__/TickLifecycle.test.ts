import { CA, getTickCount, getTickRate, isRunning, setCurrentCA, setTickRate, toggleTickLoop } from "../ECA";
import { NeighborhoodType } from "../CARule";
import { Rule110 } from "../Rule110";
import { resetDebugConfig } from "../DebugConfig";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function createMockCanvas(width: number, height: number): HTMLCanvasElement {
  const context2D = {
    imageSmoothingEnabled: false,
    scale: () => undefined,
    fillStyle: "white",
    fillRect: () => undefined,
  } as unknown as CanvasRenderingContext2D;

  return {
    width,
    height,
    getContext: () => context2D,
    getBoundingClientRect: () => ({
      left: 0,
      top: 0,
      width,
      height,
      x: 0,
      y: 0,
      right: width,
      bottom: height,
      toJSON: () => ({}),
    }),
  } as unknown as HTMLCanvasElement;
}

function ensurePaused(): void {
  if (isRunning()) {
    toggleTickLoop();
  }
}

function ensureRunning(): void {
  if (!isRunning()) {
    toggleTickLoop();
  }
}

describe("Tick lifecycle controls", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetDebugConfig();

    const canvas = createMockCanvas(320, 80);
    const ca = new CA(
      8,
      2,
      { left: 0, top: 0, width: 320, height: 80 },
      NeighborhoodType.ELEMENTARY,
      new Rule110(),
      canvas
    );
    setCurrentCA(ca);

    ensurePaused();
  });

  afterEach(() => {
    ensurePaused();
    resetDebugConfig();
    vi.useRealTimers();
  });

  it("updates tick rate via setter", () => {
    setTickRate(24);
    expect(getTickRate()).toBe(24);
  });

  it("toggles running state with pause/resume", () => {
    expect(isRunning()).toBe(false);

    toggleTickLoop();
    expect(isRunning()).toBe(true);

    toggleTickLoop();
    expect(isRunning()).toBe(false);
  });

  it("advances tick count while running", () => {
    setTickRate(20);
    ensureRunning();

    const before = getTickCount();
    vi.advanceTimersByTime(220);
    const after = getTickCount();

    expect(after).toBeGreaterThan(before);
  });
});
