export type CatalogProduct = {
  id: string; brand: string; name: string; price: number; size: string; image: string;
  short: string; description: string; benefits: string[]; usage: string;
};

export type DeliveryRate = { desk: number; home: number };
export type DeliveryPrices = DeliveryRate & { wilayas?: Record<string, DeliveryRate> };

const API_KEY = "AIzaSyAoZ_T9UcSmOQ1aj7213IFVdFDWe8x9CxA";
const BASE = "https://firestore.googleapis.com/v1/projects/lens-16470/databases/(default)/documents";
const CACHE_TTL = 60 * 60 * 1000;

type FireValue = Record<string, unknown>;
type FireDocument = { fields?: Record<string, FireValue> };

function fromValue(value: FireValue): unknown {
  if ("stringValue" in value) return value.stringValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return Number(value.doubleValue);
  if ("booleanValue" in value) return value.booleanValue;
  if ("timestampValue" in value) return value.timestampValue;
  if ("nullValue" in value) return null;
  if ("arrayValue" in value) {
    const values = (value.arrayValue as { values?: FireValue[] }).values ?? [];
    return values.map(fromValue);
  }
  if ("mapValue" in value) return fromFields((value.mapValue as FireDocument).fields ?? {});
  return undefined;
}

function fromFields(fields: Record<string, FireValue>) {
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, fromValue(value)]));
}

function toValue(value: unknown): FireValue {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(toValue) } };
  return { mapValue: { fields: Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, toValue(item)])) } };
}

function readCache<T>(key: string): T | null {
  try {
    const cached = JSON.parse(localStorage.getItem(key) || "null") as { at: number; value: T } | null;
    return cached && Date.now() - cached.at < CACHE_TTL ? cached.value : null;
  } catch { return null; }
}

function writeCache<T>(key: string, value: T) {
  try { localStorage.setItem(key, JSON.stringify({ at: Date.now(), value })); } catch { /* storage may be disabled */ }
}

async function getDocument<T>(path: string): Promise<T | null> {
  const response = await fetch(`${BASE}/${path}?key=${API_KEY}`);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Service momentanément indisponible");
  const document = await response.json() as FireDocument;
  return fromFields(document.fields ?? {}) as T;
}

export async function loadCosmeticCatalog(fallback: CatalogProduct[]) {
  const cached = readCache<CatalogProduct[]>("dermae_catalog_v1");
  if (cached?.length) return cached;
  try {
    const document = await getDocument<{ products: CatalogProduct[] }>("catalog/cosmetics");
    const products = document?.products?.length ? document.products : fallback;
    writeCache("dermae_catalog_v1", products);
    return products;
  } catch { return fallback; }
}

export async function loadDeliveryPrices(): Promise<DeliveryPrices> {
  const cached = readCache<DeliveryPrices>("dermae_delivery_v1");
  if (cached) return cached;
  try {
    const document = await getDocument<DeliveryPrices>("settings/delivery");
    const prices = document?.desk && document?.home ? document : { desk: 450, home: 700, wilayas: {} };
    writeCache("dermae_delivery_v1", prices);
    return prices;
  } catch { return { desk: 450, home: 700, wilayas: {} }; }
}

export async function submitCosmeticOrder(order: Record<string, unknown>) {
  const body = { fields: Object.fromEntries(Object.entries({ ...order, source: "cosmetics", status: "new", createdAt: new Date() }).map(([key, value]) => [key, toValue(value)])) };
  const response = await fetch(`${BASE}/orders?key=${API_KEY}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body)
  });
  if (!response.ok) throw new Error("La commande n'a pas pu être envoyée.");
}
