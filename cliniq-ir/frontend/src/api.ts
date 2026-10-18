export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...init,
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...init.headers },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    if (response.status === 401 && !path.startsWith("/auth/")) {
      window.dispatchEvent(new Event("session-expired"));
    }
    const message =
      typeof body.detail === "string"
        ? body.detail
        : response.status === 422
          ? "Check your search or filter values and try again."
          : "Unable to load this information. Please try again.";
    throw new ApiError(message, response.status);
  }
  if (response.status === 204) return undefined as T;
  return response.json();
}

export function recordUrl(record: {
  id: number;
  patient_id: string;
  encounter_id: string;
}) {
  return `/patients/${encodeURIComponent(record.patient_id)}/encounters/${encodeURIComponent(record.encounter_id)}/records/${record.id}`;
}

export function encounterUrl(patient: string, encounter: string) {
  return `/patients/${encodeURIComponent(patient)}/encounters/${encodeURIComponent(encounter)}`;
}

export function formatDate(value: string, full = false) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: full ? "long" : "short",
    year: "numeric",
  }).format(new Date(value));
}
