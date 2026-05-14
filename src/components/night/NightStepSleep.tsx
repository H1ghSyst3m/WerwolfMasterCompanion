import { Btn } from "../ui/Btn";

interface NightStepSleepProps {
  advanceNightStep: () => void;
}

export function NightStepSleep({ advanceNightStep }: NightStepSleepProps) {
  return (
    <Btn onClick={advanceNightStep} cls="bg-indigo-600 hover:bg-indigo-500 text-white w-full" size="lg">
      Weiter →
    </Btn>
  );
}
