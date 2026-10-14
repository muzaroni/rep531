import { describe, expect, it } from "vitest";
import { defaults } from "./model";
import { makeWorkout, cycleVariant } from "./calculations";
import { changeCycleVariation } from "./changeCycleVariation";

describe("mid-cycle variation changes", () => {
  it("changes only the current cycle's future prescriptions and preserves snapshots", () => {
    const state = defaults();
    state.active = makeWorkout(state);
    state.active.sets[0].done = true;
    state.history = [{ ...makeWorkout(state), id: "finished", completedAt: new Date().toISOString() }];
    state.pastWorkout = { ...makeWorkout(state), id: "past", historyOnly: true };
    state.settings.cycleVariants = { "1": "normal", "2": "normal" };
    const original = structuredClone(state);
    const next = changeCycleVariation(state, "swap");
    expect(next.active).toBe(state.active);
    expect(next.history).toBe(state.history);
    expect(next.pastWorkout).toBe(state.pastWorkout);
    expect(next.position).toBe(state.position);
    expect(next.settings.maxes).toEqual(state.settings.maxes);
    expect(next.settings.cycleVariants).toEqual({ "1": "swap", "2": "normal" });
    expect(makeWorkout({ ...next, active: null }).bbbLift).toBe("deadlift");
    expect(next.active!.bbbLift).toBe("squat");
    expect(cycleVariant(next.settings, 3)).toBe("normal");
    expect(state).toEqual(original);
    expect(changeCycleVariation(next, "normal").settings.cycleVariants["1"]).toBe("normal");
  });
});
