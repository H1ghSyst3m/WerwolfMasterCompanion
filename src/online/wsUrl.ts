interface WsLocation {
  protocol: string;
  host: string;
  hostname: string;
}

export function normalizeWsUrl(configured: string | undefined, location: WsLocation): string {
  const scheme = location.protocol === "https:" ? "wss" : "ws";
  if (configured) {
    const value = configured.trim();
    if (!value) return `${scheme}://${location.hostname}:8787/ws`;
    const lowerValue = value.toLowerCase();
    if (lowerValue.startsWith("ws://") || lowerValue.startsWith("wss://")) return value;
    if (lowerValue.startsWith("http://")) return `ws://${value.slice("http://".length)}`;
    if (lowerValue.startsWith("https://")) return `wss://${value.slice("https://".length)}`;
    if (value.startsWith("/")) return `${scheme}://${location.host}${value}`;
    return `${scheme}://${value}`;
  }
  return `${scheme}://${location.hostname}:8787/ws`;
}

export function getDefaultWsUrl(): string {
  const configured = (import.meta as ImportMeta & { env?: { VITE_WS_URL?: string } }).env?.VITE_WS_URL;
  return normalizeWsUrl(configured, window.location);
}
