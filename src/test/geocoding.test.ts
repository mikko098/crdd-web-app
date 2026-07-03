import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getNominatimLocationDisplayName, getNominatimLocationName } from '@/services/geocoding';

describe('geocoding service', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('uses the Nominatim place name for a coordinate lookup', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => [
        {
          name: 'Solstice Management Office',
          display_name: 'Solstice Management Office, Menara Solstice, Persiaran Bestari, Cyberjaya',
        },
      ],
    } as Response);

    const locationName = await getNominatimLocationName(2.924214, 101.636707);

    expect(locationName).toBe('Solstice Management Office');
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('https://nominatim.openstreetmap.org/search?'),
    );
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('format=jsonv2'));
  });

  it('uses display_name when the full report location is requested', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => [
        {
          name: 'Solstice Management Office',
          display_name: 'Solstice Management Office, Menara Solstice, Persiaran Bestari, Cyber 11, Cyberjaya, Sepang, Selangor, 63000, Malaysia',
        },
      ],
    } as Response);

    const displayName = await getNominatimLocationDisplayName(2.924216, 101.636709);

    expect(displayName).toBe(
      'Solstice Management Office, Menara Solstice, Persiaran Bestari, Cyber 11, Cyberjaya, Sepang, Selangor, 63000, Malaysia',
    );
  });

  it('falls back to display_name when name is unavailable', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => [
        {
          display_name: 'Menara Solstice, Persiaran Bestari, Cyberjaya',
        },
      ],
    } as Response);

    await expect(getNominatimLocationName(2.924215, 101.636708)).resolves.toBe(
      'Menara Solstice, Persiaran Bestari, Cyberjaya',
    );
  });
});
