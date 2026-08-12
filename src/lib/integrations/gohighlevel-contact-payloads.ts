export interface GHLContactPayloadSource {
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  companyName: string | null;
  score: number;
  temperature?: string;
}

export interface GHLUpdateContactPayload {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  companyName?: string;
  customFields?: Record<string, unknown>;
  tags?: string[];
}

export interface GHLCreateContactPayload extends GHLUpdateContactPayload {
  locationId: string;
}

export function buildGHLUpdateContactPayload(
  source: GHLContactPayloadSource,
): GHLUpdateContactPayload {
  const payload: GHLUpdateContactPayload = {
    email: source.email,
    firstName: source.firstName,
    lastName: source.lastName,
  };

  if (source.phone) payload.phone = source.phone;
  if (source.companyName) payload.companyName = source.companyName;
  if (source.score > 0 || source.temperature) {
    payload.customFields = {};
    if (source.score > 0) {
      payload.customFields["ai_score"] = String(source.score);
    }
    if (source.temperature) {
      payload.customFields["lead_temperature"] = source.temperature;
    }
  }
  if (source.temperature) {
    payload.tags = ["revora", source.temperature.toLowerCase()];
  }

  return payload;
}

export function buildGHLCreateContactPayload(
  source: GHLContactPayloadSource,
  locationId: string,
): GHLCreateContactPayload {
  return {
    ...buildGHLUpdateContactPayload(source),
    locationId,
  };
}
