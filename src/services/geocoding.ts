interface NominatimSearchResult {
  name?: string;
  display_name?: string;
}

export interface NominatimLocation {
  name: string;
  displayName: string;
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

function pickLocation(results: NominatimSearchResult[], lat: number, lon: number): NominatimLocation {
  const first = results[0];
  const name = first?.name?.trim();
  const displayName = first?.display_name?.trim();
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

async function fetchNominatimLocation(lat: number, lon: number): Promise<NominatimLocation> {
  const params = new URLSearchParams({
    q: `${lat}, ${lon}`,
    format: 'jsonv2',
    limit: '1',
  });

  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Nominatim request failed with ${response.status}`);
  }

  const results = (await response.json()) as NominatimSearchResult[];
  return pickLocation(results, lat, lon);
}
