import type { ReactNode } from "react";
import { Btn } from "../ui/Btn";

interface SetupScreenShellProps {
  /** Current step number (1-based). Shown as "step / totalSteps" in header right. */
  step: number;
  /** Total number of steps (default 3). */
  totalSteps?: number;
  /** Header centre title. */
  title: string;
  /** Optional action rendered next to the step indicator. */
  headerAction?: ReactNode;
  /** Called when the back button is pressed. Pass undefined to show a spacer instead. */
  onBack?: () => void;
  /** Content always anchored at the bottom of the screen. Omit to hide the footer entirely. */
  footer?: ReactNode;
  /** Scrollable body content. */
  children: ReactNode;
}

/** Consistent shell layout for setup steps 1-3. */
export function SetupScreenShell({
  step,
  totalSteps = 3,
  title,
  headerAction,
  onBack,
  footer,
  children,
}: SetupScreenShellProps) {
  return (
    <div className="h-full bg-gray-950 text-white flex flex-col overflow-hidden">

      {/* Sticky header */}
      <header className="sticky top-0 z-10 bg-gray-950 border-b border-gray-800 px-4 pt-4 pb-3">
        <div className="flex items-center justify-between gap-2 max-w-md mx-auto">
          {onBack ? (
            <Btn
              onClick={onBack}
              cls="text-white bg-gray-800 hover:bg-gray-700 shrink-0"
              size="sm"
              aria-label="Zurück"
            >
              ←
            </Btn>
          ) : (
            /* spacer keeps title centred when there's no back button */
            <div className="w-[46px] shrink-0" />
          )}

          <h1 className="text-xl font-bold truncate text-center flex-1">{title}</h1>

          <div className="flex items-center justify-end gap-2 shrink-0 min-w-[2.5rem]">
            {headerAction}
            <span className="text-gray-400 text-sm font-medium text-right">
              {step} / {totalSteps}
            </span>
          </div>
        </div>
      </header>

      {/* Scrollable body */}
      <main className="flex-1 overflow-y-auto min-h-0">
        <div className="px-4 py-4 max-w-md mx-auto">
          {children}
        </div>
      </main>

      {/* Sticky footer, only rendered when content is provided */}
      {footer != null && (
        <footer className="sticky bottom-0 bg-gray-950 border-t border-gray-800 px-4 py-4">
          <div className="space-y-2 max-w-md mx-auto">
            {footer}
          </div>
        </footer>
      )}

    </div>
  );
}
