export const chimeNames = [
  "Bell",
  "Soft ping",
  "Double tap",
  "Ascending",
  "Descending",
  "Triangle",
  "Pulse",
  "Finish line",
];
let context: AudioContext | undefined;
export function unlockAudio() {
  try {
    if (!globalThis.AudioContext) return;
    context ??= new AudioContext();
    void context.resume().catch(() => {});
  } catch {
    /* Audio support must not block the timer. */
  }
}
export function playChime(index: number) {
  unlockAudio();
  if (!context) return;
  const ctx = context;
  const sequences = [
    [880],
    [660],
    [750, 750],
    [440, 660, 880],
    [880, 660, 440],
    [1046, 1318],
    [550, 550, 550],
    [523, 659, 784, 1046],
  ];
  sequences[index].forEach((freq, i) => {
    const start = ctx.currentTime + i * 0.18,
      osc = ctx.createOscillator(),
      gain = ctx.createGain();
    osc.type = index === 5 ? "triangle" : "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.18, start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.5);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.51);
  });
}
