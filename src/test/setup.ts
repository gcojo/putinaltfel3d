// Stub-uri pentru jsdom (Recharts / dnd-kit au nevoie de ele).
class RO {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = RO;
if (!window.matchMedia) {
  window.matchMedia = (q: string) =>
    ({
      matches: false, media: q, onchange: null,
      addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}
