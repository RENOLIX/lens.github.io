const API_KEY = "AIzaSyAoZ_T9UcSmOQ1aj7213IFVdFDWe8x9CxA";
const BASE = "https://firestore.googleapis.com/v1/projects/lens-16470/databases/(default)/documents";

function toValue(value: unknown): Record<string, unknown> {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(toValue) } };
  return { mapValue: { fields: Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, toValue(item)])) } };
}

export async function submitLensOrder(order: Record<string, unknown>) {
  const complete = { ...order, source: "lens", status: "new", createdAt: new Date() };
  const body = { fields: Object.fromEntries(Object.entries(complete).map(([key, value]) => [key, toValue(value)])) };
  const response = await fetch(`${BASE}/orders?key=${API_KEY}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body)
  });
  if (!response.ok) throw new Error("La commande n'a pas pu être envoyée.");
}
