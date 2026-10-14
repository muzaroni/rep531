import { Input } from "./ui/shadcn/input";
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
      <p className="plate-unit-indicator">Using <strong>{settings.units === "lb" ? "Pounds (lb)" : "Kilograms (kg)"}</strong></p>
      <p className="subtle">
        Olympic bar · 45 lb / 20 kg. List available plate sizes as matching
        pairs.
      </p>
      <div className="equipment-grid">
        {(["lb", "kg"] as const).map((unit) => (
          <label className="stack-field plate-bank" key={unit} data-active={settings.units === unit}>
            <span className="plate-bank-label">{unit === "lb" ? "Pound plates · lb" : "Kilogram plates · kg"}
            {settings.units === unit && <strong className="plate-bank-active">In use</strong>}</span>
            <Input
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
