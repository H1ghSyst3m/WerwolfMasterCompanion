import { Btn } from "../ui/Btn";

interface NightStepDawnProps {
  resolveNight: () => void;
}

export function NightStepDawn({ resolveNight }: NightStepDawnProps) {
  return (
    <Btn onClick={resolveNight} cls="bg-amber-600 hover:bg-amber-500 text-white w-full" size="lg">
      🌅 Nacht auswerten
    </Btn>
  );
}
