import { useEffect, useRef } from "react";
import { ROLES } from "../../constants/roles";
import type { RoleId } from "../../types";

interface RoleRulesModalProps {
  onClose: () => void;
}

const CATEGORY_LABELS = {
  classic: "Klassisch",
  special: "Spezial",
} as const;

function getTeamLabel(team: "wolf" | "village"): string {
  return team === "wolf" ? "🐺 Böse" : "🏘️ Gut";
}

export function RoleRulesModal({ onClose }: RoleRulesModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    containerRef.current?.focus();
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black/85 text-white" onClick={onClose}>
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="role-rules-title"
        tabIndex={-1}
        onClick={event => event.stopPropagation()}
        onKeyDown={event => {
          if (event.key === "Escape") {
            event.stopPropagation();
            onClose();
          }
        }}
        className="h-full max-w-md mx-auto bg-gray-950 flex flex-col outline-none"
      >
        <header className="sticky top-0 z-10 bg-gray-950/95 backdrop-blur border-b border-gray-800 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 id="role-rules-title" className="text-xl font-bold truncate">📖 Rollenregeln</h1>
              <p className="text-gray-400 text-xs mt-1">Kurzbeschreibung und genaue App-Regeln</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Regeln schließen"
              className="w-10 h-10 shrink-0 rounded-xl bg-gray-800 hover:bg-gray-700 text-xl leading-none"
            >
              ×
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto min-h-0 px-4 py-4 space-y-6">
          {(["classic", "special"] as const).map(category => (
            <section key={category}>
              <h2 className="text-gray-400 text-xs uppercase tracking-wider mb-2">
                {CATEGORY_LABELS[category]}
              </h2>
              <div className="space-y-3">
                {(Object.entries(ROLES) as [RoleId, typeof ROLES[RoleId]][])
                  .filter(([, role]) => role.cat === category)
                  .map(([roleId, role]) => (
                    <article key={roleId} className="rounded-xl border border-gray-800 bg-gray-900 p-4">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-3xl shrink-0">{role.icon}</span>
                          <div className="min-w-0">
                            <h3 className="font-bold leading-tight truncate">{role.name}</h3>
                            <div className="flex flex-wrap gap-2 mt-2">
                              <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                                role.team === "wolf"
                                  ? "bg-red-950/70 text-red-300 border border-red-900/70"
                                  : "bg-green-950/70 text-green-300 border border-green-900/70"
                              }`}>
                                {getTeamLabel(role.team)}
                              </span>
                              {role.unique && (
                                <span className="inline-flex rounded-full px-2 py-1 text-xs font-semibold bg-gray-800 text-gray-300 border border-gray-700">
                                  Einmalig
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      <p className="text-gray-300 text-sm leading-relaxed mb-3">{role.desc}</p>

                      <div className="space-y-2">
                        {role.rules.map(rule => (
                          <details key={rule.title} className="rounded-lg bg-gray-800 border border-gray-700">
                            <summary className="cursor-pointer select-none px-3 py-2 text-sm font-semibold text-gray-100">
                              {rule.title}
                            </summary>
                            <p className="px-3 pb-3 text-sm leading-relaxed text-gray-300">{rule.text}</p>
                          </details>
                        ))}
                      </div>
                    </article>
                  ))}
              </div>
            </section>
          ))}
        </main>
      </div>
    </div>
  );
}
