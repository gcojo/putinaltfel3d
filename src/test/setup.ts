// Stub-uri pentru jsdom (Recharts / dnd-kit au nevoie de ele).
class RO {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = RO;
// Ca în Chromium nou: scrollTo() returnează un Promise (prinde efecte care îl returnează din greșeală).
window.scrollTo = (() => Promise.resolve()) as unknown as typeof window.scrollTo;
if (!window.matchMedia) {
  window.matchMedia = (q: string) =>
    ({
      matches: false, media: q, onchange: null,
      addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}
