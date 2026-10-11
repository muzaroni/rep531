import { useState } from "react";
import { type Settings } from "../domain/model";
type Props = { settings: Settings; update: (patch: Partial<Settings>) => void };
export function EquipmentEditor({ settings, update }: Props) {
  const [plateText, setPlateText] = useState({
    lb: settings.equipment.lb.plates.join(", "),
    kg: settings.equipment.kg.plates.join(", "),
  });
  return (
    <section className="equipment-settings">
      <h3 className="settings-subheading">Plates</h3>
      <p className="subtle">
        Olympic bar · 45 lb / 20 kg. List available plate sizes as matching
        pairs.
      </p>
      <div className="equipment-grid">
        {(["lb", "kg"] as const).map((unit) => (
          <label className="stack-field" key={unit}>
            {unit === "lb" ? "Pound plates" : "Kilogram plates"}
            {settings.units === unit ? " · in use" : ""}
            <input
              aria-label={`Available ${unit} plates`}
              value={plateText[unit]}
              onChange={(e) => {
                const text = e.target.value;
                setPlateText((s) => ({ ...s, [unit]: text }));
                update({
                  equipment: {
                    ...settings.equipment,
                    [unit]: {
                      ...settings.equipment[unit],
                      plates: text
                        .split(",")
                        .map((value) => Number(value.trim())),
                    },
                  },
                });
              }}
            />
          </label>
        ))}
      </div>
    </section>
  );
}
