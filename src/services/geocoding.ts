interface NominatimSearchResult {
  name?: string;
  display_name?: string;
  lat?: string;
  lon?: string;
  type?: string;
  class?: string;
}

export interface NominatimLocation {
  name: string;
  displayName: string;
}

export interface LocationSearchResult {
  id: string;
  label: string;
  detail: string;
  lat: number;
  lng: number;
  category?: string;
}

const memoryCache = new Map<string, Promise<NominatimLocation>>();
const storagePrefix = 'roadvision:nominatim:';

function coordinateKey(lat: number, lon: number): string {
  return `${lat.toFixed(6)},${lon.toFixed(6)}`;
}

function fallbackCoordinateLabel(lat: number, lon: number): string {
  return `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
}

function buildFallbackLocation(lat: number, lon: number): NominatimLocation {
  const coordinateLabel = fallbackCoordinateLabel(lat, lon);
  return {
    name: coordinateLabel,
    displayName: coordinateLabel,
  };
}

function pickLocation(result: NominatimSearchResult | undefined, lat: number, lon: number): NominatimLocation {
  const name = result?.name?.trim();
  const displayName = result?.display_name?.trim();
  const fallback = buildFallbackLocation(lat, lon);

  return {
    name: name || displayName || fallback.name,
    displayName: displayName || name || fallback.displayName,
  };
}

export async function getNominatimLocationName(lat: number, lon: number): Promise<string> {
  const location = await getNominatimLocation(lat, lon);
  return location.name;
}

export async function getNominatimLocationDisplayName(lat: number, lon: number): Promise<string> {
  const location = await getNominatimLocation(lat, lon);
  return location.displayName;
}

export async function getNominatimLocation(lat: number, lon: number): Promise<NominatimLocation> {
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || (lat === 0 && lon === 0)) {
    return {
      name: 'Unknown location',
      displayName: 'Unknown location',
    };
  }

  const key = coordinateKey(lat, lon);
  const cached = memoryCache.get(key);
  if (cached) return cached;

  const stored = localStorage.getItem(`${storagePrefix}${key}`);
  if (stored) {
    let storedLocation: NominatimLocation;
    try {
      storedLocation = JSON.parse(stored) as NominatimLocation;
    } catch {
      storedLocation = {
        name: stored,
        displayName: stored,
      };
    }

    if (!storedLocation.displayName) {
      storedLocation.displayName = storedLocation.name;
    }

    const storedResult = Promise.resolve(storedLocation);
    memoryCache.set(key, storedResult);
    return storedResult;
  }

  const request = fetchNominatimLocation(lat, lon)
    .then((location) => {
      localStorage.setItem(`${storagePrefix}${key}`, JSON.stringify(location));
      return location;
    })
    .catch((error) => {
      console.warn('Nominatim lookup failed; using coordinates.', error);
      return buildFallbackLocation(lat, lon);
    });

  memoryCache.set(key, request);
  return request;
}

export async function searchNominatimLocations(query: string): Promise<LocationSearchResult[]> {
  const cleanQuery = query.trim();
  if (cleanQuery.length < 3) return [];

  const params = new URLSearchParams({
    q: cleanQuery,
    format: 'jsonv2',
    limit: '6',
    addressdetails: '1',
  });

  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Nominatim search failed with ${response.status}`);
  }

  const results = (await response.json()) as NominatimSearchResult[];

  return results
    .map((result, index) => {
      const lat = Number(result.lat);
      const lng = Number(result.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

      const displayName = result.display_name?.trim() || fallbackCoordinateLabel(lat, lng);
      const label = result.name?.trim() || displayName.split(',')[0]?.trim() || displayName;

      return {
        id: `${lat.toFixed(6)},${lng.toFixed(6)}-${index}`,
        label,
        detail: displayName,
        lat,
        lng,
        category: result.type || result.class,
      } satisfies LocationSearchResult;
    })
    .filter((result): result is LocationSearchResult => result !== null);
}

async function fetchNominatimLocation(lat: number, lon: number): Promise<NominatimLocation> {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
    format: 'jsonv2',
  });

  const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Nominatim request failed with ${response.status}`);
  }

  const result = (await response.json()) as NominatimSearchResult;
  return pickLocation(result, lat, lon);
}
