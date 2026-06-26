import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AISettingsManager } from "./ai-settings-manager";

/**
 * Component tests for the AI settings manager (#19b). `fetch` is mocked so the
 * config load, the fallback toggle (PATCH), and the connection test (POST) run in
 * jsdom without a server. Toggling fallback and engine selection share the same
 * `save` → PATCH path.
 */

vi.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve({
    ok: status < 400,
    status,
    json: () => Promise.resolve(body),
  } as Response);
}

const initialView = {
  config: { defaultEngine: "openai", fallbackEnabled: true },
  engines: [
    { engine: "openai", status: "connected" },
    { engine: "gemini", status: "not_configured" },
  ],
};

let calls: Array<{ url: string; method: string; body: unknown }>;

beforeEach(() => {
  calls = [];
  global.fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    const body = init?.body ? JSON.parse(init.body as string) : undefined;
    calls.push({ url, method, body });
    if (url.endsWith("/api/ai/settings") && method === "GET")
      return jsonResponse(initialView);
    if (url.endsWith("/api/ai/settings") && method === "PATCH")
      return jsonResponse({ ...initialView.config, ...body });
    if (url.endsWith("/api/ai/test"))
      return jsonResponse({ status: "connected" });
    return jsonResponse({}, 200);
  }) as unknown as typeof fetch;
});

describe("AISettingsManager", () => {
  it("renders the engines with their status", async () => {
    render(<AISettingsManager />);
    await screen.findByText("Motor por defecto");
    expect(screen.getByText("Conectado")).toBeInTheDocument();
    expect(screen.getByText("Sin API key")).toBeInTheDocument();
  });

  it("toggling fallback persists via PATCH", async () => {
    render(<AISettingsManager />);
    await screen.findByText("Motor por defecto");
    fireEvent.click(
      screen.getByRole("switch", { name: "Fallback automático" }),
    );
    await waitFor(() => {
      const patch = calls.find((c) => c.method === "PATCH");
      expect(patch?.body).toEqual({ fallbackEnabled: false });
    });
  });

  it("testing an engine shows the returned status", async () => {
    render(<AISettingsManager />);
    await screen.findByText("Motor por defecto");
    // The gemini row starts "Sin API key"; testing it returns connected.
    fireEvent.click(screen.getAllByRole("button", { name: /Probar/ })[1]);
    await waitFor(() => {
      const post = calls.find((c) => c.url.endsWith("/api/ai/test"));
      expect(post?.body).toEqual({ engine: "gemini" });
    });
    expect(await screen.findAllByText("Conectado")).toHaveLength(2);
  });
});
