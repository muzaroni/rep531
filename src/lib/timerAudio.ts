export const chimeNames = [
  "Clear bell", "Glass", "Crystal", "Bright ping",
  "Porcelain", "Silver", "Spark", "Pure chime",
];
let context: AudioContext | undefined;
let stopPlaying: (() => void) | undefined;
let room: AudioBuffer | undefined;
let playbackVersion = 0;
export function stopChime() {
  playbackVersion++;
  stopPlaying?.();
  stopPlaying = undefined;
}
export function unlockAudio() {
  try {
    if (!globalThis.AudioContext) return;
    context ??= new AudioContext();
    void context.resume().catch(() => {});
  } catch {
    /* Audio support must not block the timer. */
  }
}
export function playChime(index: number, repeats = 1) {
  stopChime();
  const version = playbackVersion;
  unlockAudio();
  if (!context) return;
  const ctx = context;
  const frequency = [1568, 1760, 2093, 1865, 1318, 1661, 1976, 1480][index] ?? 1568;
  const play = () => {
    if (version !== playbackVersion) return;
    // A short diffuse stereo room, generated locally for offline playback.
    if (!room) {
      room = ctx.createBuffer(2, Math.ceil(ctx.sampleRate * 0.65), ctx.sampleRate);
      let seed = 531;
      for (let channel = 0; channel < 2; channel++) {
        const samples = room.getChannelData(channel);
        for (let i = 0; i < samples.length; i++) {
          seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
          samples[i] = (seed / 2147483648 - 1) * Math.exp(-10 * i / ctx.sampleRate);
        }
      }
    }
    const beginning = ctx.currentTime;
    const bus = ctx.createGain();
    const reverb = ctx.createConvolver();
    const wet = ctx.createGain();
    bus.gain.value = 0.85;
    wet.gain.value = 0.18;
    reverb.buffer = room;
    bus.connect(ctx.destination);
    bus.connect(reverb);
    reverb.connect(wet);
    wet.connect(ctx.destination);
    // Inharmonic partials give one acoustic strike a bell-like timbre.
    const nodes = Array.from({ length: Math.max(1, Math.min(10, Math.floor(repeats))) }, (_, repeat) => {
    const start = beginning + repeat * 0.5;
    return [
      { ratio: 1, level: 0.62, decay: 0.5 },
      { ratio: 2.76, level: 0.16, decay: 0.28 },
      { ratio: 5.4, level: 0.06, decay: 0.14 },
    ].map(({ ratio, level, decay }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = frequency * ratio;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(level, start + 0.002);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + decay);
      gain.gain.linearRampToValueAtTime(0, start + decay + 0.01);
      osc.connect(gain);
      gain.connect(bus);
      osc.start(start);
      // Keep the graph alive until the room tail has finished.
      osc.stop(start + 1.2);
      return { osc, gain };
    });
    }).flat();
    const disconnect = () => {
      for (const { osc, gain } of nodes) { osc.disconnect(); gain.disconnect(); }
      bus.disconnect(); reverb.disconnect(); wet.disconnect();
    };
    nodes.at(-1)!.osc.onended = disconnect;
    stopPlaying = () => {
      for (const { osc } of nodes) osc.stop();
      disconnect();
    };
  };
  try {
    if (ctx.state === "suspended") void ctx.resume().then(play).catch(() => {});
    else play();
  } catch {
    /* Unavailable audio must never interrupt workout logging. */
  }
}
