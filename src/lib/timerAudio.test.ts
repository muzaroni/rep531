import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });

describe("timer chimes", () => {
  it("plays one acoustic strike with fast attack, decaying partials and a bounded stereo room tail", async () => {
    const notes: { start: number; stop: number; frequency: { value: number }; attack: number; decay: number; cancelled: boolean }[] = [];
    const rooms: Float32Array[][] = [];
    const connections: unknown[] = [];
    vi.stubGlobal("AudioContext", class {
      currentTime = 10;
      sampleRate = 44100;
      state = "running";
      destination = {};
      resume = () => Promise.resolve();
      createBuffer(channels: number, length: number) {
        const samples = Array.from({ length: channels }, () => new Float32Array(length));
        rooms.push(samples);
        return { getChannelData: (channel: number) => samples[channel] };
      }
      createConvolver() { return { buffer: null, connect(target: unknown) { connections.push(target); }, disconnect() {} }; }
      createOscillator() {
        const note = { start: 0, stop: 0, frequency: { value: 0 }, attack: 0, decay: 0, cancelled: false };
        notes.push(note);
        return {
          frequency: note.frequency, type: "sine", onended: null,
          connect() {}, disconnect() {},
          start(time: number) { note.start = time; },
          stop(time?: number) { if (time !== undefined) note.stop = time; else note.cancelled = true; },
        };
      }
      createGain() {
        const note = notes.at(-1);
        return {
          gain: {
            value: 0, setValueAtTime() {},
            linearRampToValueAtTime(value: number, time: number) { if (value && note) note.attack = time; },
            exponentialRampToValueAtTime(_value: number, time: number) { if (note) note.decay = time; },
          }, connect() {}, disconnect() {},
        };
      }
    });
    const { playChime, stopChime } = await import("./timerAudio");
    for (let index = 0; index < 8; index++) {
      notes.length = 0;
      playChime(index);
      expect(notes).toHaveLength(3);
      expect(new Set(notes.map(note => note.start)).size).toBe(1);
      for (const note of notes) {
        expect(note.frequency.value).toBeGreaterThan(1300);
        expect(note.attack - note.start).toBeCloseTo(0.002);
        expect(note.decay - note.start).toBeLessThanOrEqual(0.5);
        expect(note.stop - note.start).toBeCloseTo(1.2);
      }
    }
    expect(connections).toHaveLength(8);
    notes.length = 0;
    playChime(0, 10);
    expect(notes).toHaveLength(30);
    expect(new Set(notes.map(note => note.start)).size).toBe(10);
    expect(notes[3].start - notes[0].start).toBeCloseTo(0.5);
    expect(notes.at(-1)!.stop - notes[0].start).toBeCloseTo(5.7);
    stopChime();
    expect(notes.every(note => note.cancelled)).toBe(true);
    expect(rooms).toHaveLength(1);
    expect(rooms[0]).toHaveLength(2);
    for (const samples of rooms[0]) {
      expect(samples.length / 44100).toBeCloseTo(0.65);
      expect(Math.max(...samples.slice(-100))).toBeLessThan(0.002);
    }
  });
  it("does not interrupt logging when audio is unavailable", async () => {
    vi.stubGlobal("AudioContext", undefined);
    const { playChime } = await import("./timerAudio");
    expect(() => playChime(0)).not.toThrow();
  });
});
