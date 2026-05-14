import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import { Btn } from "../ui/Btn";

interface RoomJoinQrProps {
  roomCode: string;
}

function isHttpUrl(url: URL): boolean {
  return url.protocol === "http:" || url.protocol === "https:";
}

function parseJoinBaseUrl(configuredUrl: string | undefined): URL {
  if (configuredUrl) {
    try {
      const parsed = new URL(configuredUrl);
      if (isHttpUrl(parsed)) return parsed;
    } catch {
      // Fall back to the current frontend URL when the configured public URL is invalid.
    }
  }
  return new URL(window.location.href);
}

function buildJoinUrl(roomCode: string): string {
  const configuredUrl = (import.meta as ImportMeta & { env?: { VITE_PUBLIC_APP_URL?: string } }).env?.VITE_PUBLIC_APP_URL;
  const sourceUrl = parseJoinBaseUrl(configuredUrl);
  const url = isHttpUrl(sourceUrl)
    ? new URL(sourceUrl.pathname, sourceUrl.origin)
    : new URL("/", window.location.origin);
  url.searchParams.set("mode", "online");
  url.searchParams.set("room", roomCode);
  return url.toString();
}

export function RoomJoinQr({ roomCode }: RoomJoinQrProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const linkInputRef = useRef<HTMLInputElement>(null);
  const copyResetTimerRef = useRef<number | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

  const joinUrl = useMemo(() => buildJoinUrl(roomCode), [roomCode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    void QRCode.toCanvas(canvas, joinUrl, {
      errorCorrectionLevel: "M",
      margin: 1,
      scale: 6,
      color: {
        dark: "#111827",
        light: "#ffffff",
      },
    });
  }, [joinUrl]);

  useEffect(() => () => {
    if (copyResetTimerRef.current !== null) window.clearTimeout(copyResetTimerRef.current);
  }, []);

  const resetCopyState = (state: "copied" | "failed") => {
    if (copyResetTimerRef.current !== null) window.clearTimeout(copyResetTimerRef.current);
    setCopyState(state);
    copyResetTimerRef.current = window.setTimeout(() => {
      copyResetTimerRef.current = null;
      setCopyState("idle");
    }, 1800);
  };

  const copyWithFallback = (text: string): boolean => {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.top = "-1000px";
    textarea.style.left = "-1000px";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    try {
      return document.execCommand("copy");
    } catch {
      return false;
    } finally {
      document.body.removeChild(textarea);
    }
  };

  const copyJoinLink = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(joinUrl);
        resetCopyState("copied");
        return;
      }
    } catch {
      // Fall back below for browsers that expose clipboard but block it.
    }

    if (copyWithFallback(joinUrl)) {
      resetCopyState("copied");
      return;
    }

    linkInputRef.current?.focus();
    linkInputRef.current?.select();
    resetCopyState("failed");
  };

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 mb-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <h2 className="font-bold">Beitrittslink</h2>
          <p className="text-xs text-gray-500 mt-0.5">Scannen oder Link teilen</p>
        </div>
        <Btn onClick={copyJoinLink} cls="bg-gray-800 hover:bg-gray-700 text-white" size="sm">
          {copyState === "copied" ? "Kopiert" : copyState === "failed" ? "Markiert" : "Kopieren"}
        </Btn>
      </div>

      <div className="flex flex-col items-center gap-3">
        <div className="bg-white rounded-xl p-3">
          <canvas ref={canvasRef} width={174} height={174} aria-label="QR-Code für Raum-Beitritt" />
        </div>
        <input
          ref={linkInputRef}
          value={joinUrl}
          readOnly
          onFocus={event => event.currentTarget.select()}
          aria-label="Beitrittslink"
          className="w-full rounded-lg bg-gray-950 border border-gray-800 px-3 py-2 text-xs text-gray-400"
        />
        {copyState === "failed" && (
          <p className="text-xs text-amber-400 text-center">
            Automatisches Kopieren blockiert. Der Link wurde markiert.
          </p>
        )}
      </div>
    </div>
  );
}
