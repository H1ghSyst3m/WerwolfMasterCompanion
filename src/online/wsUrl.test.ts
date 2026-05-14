import { describe, expect, it } from "vitest";
import { normalizeWsUrl } from "./wsUrl";

const httpLocation = {
  protocol: "http:",
  host: "localhost:5173",
  hostname: "localhost",
};

const httpsLocation = {
  protocol: "https:",
  host: "example.com",
  hostname: "example.com",
};

describe("normalizeWsUrl", () => {
  it("keeps websocket URLs unchanged", () => {
    expect(normalizeWsUrl("ws://localhost:8787/ws", httpLocation)).toBe("ws://localhost:8787/ws");
    expect(normalizeWsUrl("wss://example.com/ws", httpLocation)).toBe("wss://example.com/ws");
  });

  it("converts http URLs to websocket URLs", () => {
    expect(normalizeWsUrl("http://localhost:8787/ws", httpLocation)).toBe("ws://localhost:8787/ws");
    expect(normalizeWsUrl("https://example.com/ws", httpLocation)).toBe("wss://example.com/ws");
  });

  it("normalizes host and path values using the current page scheme", () => {
    expect(normalizeWsUrl("localhost:8787/ws", httpLocation)).toBe("ws://localhost:8787/ws");
    expect(normalizeWsUrl("/ws", httpsLocation)).toBe("wss://example.com/ws");
  });

  it("uses the default server endpoint when no URL is configured", () => {
    expect(normalizeWsUrl(undefined, httpLocation)).toBe("ws://localhost:8787/ws");
    expect(normalizeWsUrl("   ", httpLocation)).toBe("ws://localhost:8787/ws");
    expect(normalizeWsUrl(undefined, httpsLocation)).toBe("wss://example.com:8787/ws");
  });
});
