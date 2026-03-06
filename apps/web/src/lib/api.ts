const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000/api";

export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`);
  if (!response.ok) {
    throw new Error(`GET ${path} failed with ${response.status}`);
  }
  return (await response.json()) as T;
}

export async function apiPost<T>(path: string, payload: unknown): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`POST ${path} failed with ${response.status}: ${text}`);
  }
  return (await response.json()) as T;
}

export function openAlertsStream(onMessage: (event: unknown) => void): EventSource {
  const source = new EventSource(`${API_BASE}/alerts/stream`);
  source.onmessage = (ev) => {
    try {
      onMessage(JSON.parse(ev.data));
    } catch {
      // Ignore malformed events from stream.
    }
  };
  return source;
}
