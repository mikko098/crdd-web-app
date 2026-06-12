import { RoadDamage } from '@/types';

export interface TrafficCongestion {
  level: string;
  percent: number;
  speed: number;
  impact: string;
  source: 'tomtom' | 'estimated' | 'firebase';
}

interface TomTomFlowSegmentData {
  flowSegmentData?: {
    currentSpeed?: number;
    freeFlowSpeed?: number;
    currentTravelTime?: number;
    freeFlowTravelTime?: number;
  };
}

const trafficCache = new Map<string, Promise<TrafficCongestion>>();

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function congestionLevel(percent: number): string {
  if (percent < 20) return 'Very Light';
  if (percent < 40) return 'Light';
  if (percent < 60) return 'Moderate';
  if (percent < 80) return 'Heavy';
  return 'Severe';
}

function congestionStatus(percent: number): RoadDamage['trafficStatus'] {
  if (percent >= 60) return 'high';
  if (percent >= 30) return 'medium';
  return 'low';
}

function travelImpact(percent: number): string {
  if (percent > 50) return 'High - Consider alternate route';
  if (percent > 30) return 'Moderate - Allow extra time';
  return 'Low - Normal travel';
}

function buildCongestion(percent: number, speed: number, source: TrafficCongestion['source']): TrafficCongestion {
  const roundedPercent = Math.round(clamp(percent, 5, 95));

  return {
    percent: roundedPercent,
    level: congestionLevel(roundedPercent),
    speed: Math.max(0, Math.round(speed)),
    impact: travelImpact(roundedPercent),
    source,
  };
}

function estimateTrafficCongestion(datetime?: string): TrafficCongestion {
  const time = datetime ? new Date(datetime) : new Date();
  const hour = time.getHours();
  const day = time.getDay();

  let baseCongestion: number;

  if ((hour >= 7 && hour <= 9) || (hour >= 16 && hour <= 18)) {
    baseCongestion = 65;
  } else if (hour >= 10 && hour <= 15) {
    baseCongestion = 35;
  } else {
    baseCongestion = 15;
  }

  if (day === 0 || day === 6) {
    baseCongestion *= 0.7;
  }

  return buildCongestion(baseCongestion, 60 * (1 - baseCongestion / 100), 'estimated');
}

export function trafficStatusFromCongestion(congestion: TrafficCongestion): RoadDamage['trafficStatus'] {
  return congestionStatus(congestion.percent);
}

export function trafficStatusFromStoredLevel(level?: number): RoadDamage['trafficStatus'] {
  if (level === 2) return 'high';
  if (level === 1) return 'medium';
  return 'low';
}

export function congestionFromStoredLevel(level?: number): TrafficCongestion {
  const status = trafficStatusFromStoredLevel(level);
  const percent = status === 'high' ? 70 : status === 'medium' ? 45 : 15;

  return buildCongestion(percent, 60 * (1 - percent / 100), 'firebase');
}

export async function getTrafficCongestion(
  lat: number,
  lon: number,
  datetime?: string,
): Promise<TrafficCongestion> {
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || (lat === 0 && lon === 0)) {
    return estimateTrafficCongestion(datetime);
  }

  const cacheKey = `${lat.toFixed(5)},${lon.toFixed(5)},${datetime ?? 'now'}`;
  const cached = trafficCache.get(cacheKey);
  if (cached) return cached;

  const request = fetchTrafficCongestion(lat, lon, datetime);
  trafficCache.set(cacheKey, request);

  return request;
}

async function fetchTrafficCongestion(
  lat: number,
  lon: number,
  datetime?: string,
): Promise<TrafficCongestion> {
  const apiKey = import.meta.env.VITE_TOMTOM_API_KEY;

  if (!apiKey) {
    return estimateTrafficCongestion(datetime);
  }

  try {
    const params = new URLSearchParams({
      key: apiKey,
      point: `${lat},${lon}`,
      unit: 'KMPH',
    });
    const response = await fetch(
      `https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json?${params.toString()}`,
    );

    if (!response.ok) {
      throw new Error(`TomTom traffic request failed with ${response.status}`);
    }

    const data = (await response.json()) as TomTomFlowSegmentData;
    const flow = data.flowSegmentData;

    if (!flow?.currentSpeed || !flow.freeFlowSpeed) {
      return estimateTrafficCongestion(datetime);
    }

    const speedCongestion = ((flow.freeFlowSpeed - flow.currentSpeed) / flow.freeFlowSpeed) * 100;
    const travelTimeCongestion =
      flow.currentTravelTime && flow.freeFlowTravelTime
        ? ((flow.currentTravelTime - flow.freeFlowTravelTime) / flow.currentTravelTime) * 100
        : speedCongestion;

    return buildCongestion(Math.max(speedCongestion, travelTimeCongestion), flow.currentSpeed, 'tomtom');
  } catch (error) {
    console.warn('TomTom traffic lookup failed; using estimated congestion.', error);
    return estimateTrafficCongestion(datetime);
  }
}
