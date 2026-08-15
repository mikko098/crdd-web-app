import { beforeEach, describe, expect, it, vi } from 'vitest';

const firestoreMocks = vi.hoisted(() => ({
  addDoc: vi.fn(),
  collection: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  limit: vi.fn(),
  orderBy: vi.fn(),
  query: vi.fn(),
  serverTimestamp: vi.fn(),
  updateDoc: vi.fn(),
  arrayUnion: vi.fn((value) => ({ __arrayUnion: value })),
  onSnapshot: vi.fn(),
}));

const storageMocks = vi.hoisted(() => ({
  getDownloadURL: vi.fn(),
  ref: vi.fn(),
  uploadBytes: vi.fn(),
}));

const trafficMocks = vi.hoisted(() => ({
  congestionFromStoredLevel: vi.fn(),
  getTrafficCongestion: vi.fn(),
  trafficStatusFromCongestion: vi.fn(),
}));

const geocodingMocks = vi.hoisted(() => ({
  getNominatimLocationDisplayName: vi.fn(),
}));

vi.mock('firebase/firestore', () => firestoreMocks);
vi.mock('firebase/storage', () => storageMocks);
vi.mock('@/lib/firebase', () => ({
  db: { name: 'mock-db' },
  storage: { name: 'mock-storage' },
}));
vi.mock('@/services/traffic', () => trafficMocks);
vi.mock('@/services/geocoding', () => geocodingMocks);

import {
  addCaptureComment,
  assignCaptureTeam,
  getCaptureById,
  getCaptures,
  markCaptureNoDamage,
  updateCaptureStatus,
  uploadCaptureAfterRepairPhoto,
} from '@/services/captures';

describe('captures service', () => {
  const managerActor = {
    id: 'manager-1',
    name: 'Manager',
    role: 'manager' as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    firestoreMocks.collection.mockReturnValue({ path: 'captures' });
    firestoreMocks.doc.mockImplementation((db, collectionName, id) => ({
      db,
      collectionName,
      id,
      path: `${collectionName}/${id}`,
    }));
    firestoreMocks.serverTimestamp.mockReturnValue('server-now');
    firestoreMocks.updateDoc.mockResolvedValue(undefined);
    storageMocks.ref.mockImplementation((storage, path) => ({ storage, path }));
    storageMocks.getDownloadURL.mockImplementation(async (storageRef) => `download://${storageRef.path}`);
    trafficMocks.congestionFromStoredLevel.mockReturnValue({
      level: 'Moderate',
      percent: 55,
      speed: 35,
      impact: 'Traffic may slow repair response.',
      source: 'firebase',
    });
    trafficMocks.trafficStatusFromCongestion.mockReturnValue('medium');
    geocodingMocks.getNominatimLocationDisplayName.mockResolvedValue('Jalan Bestari, Cyberjaya');
  });

  it('uses repair_status instead of inference status when mapping dashboard status', async () => {
    firestoreMocks.getDoc.mockResolvedValue({
      exists: () => true,
      id: 'capture-1',
      data: () => ({
        capture_id: 'capture-1',
        user_id: 'user-12345678',
        file_url: 'road-captures/capture-1.jpg',
        lat: 3.139,
        long: 101.6869,
        captured_at: 1710000000000,
        has_inferenced: true,
        status: 'completed',
        repair_status: 'pending',
        traffic_level: 2,
        inference_results: [
          {
            class_id: 3,
            class_name: 'D40 pothole',
            confidence: 0.81,
          },
        ],
      }),
    });

    const capture = await getCaptureById('capture-1');

    expect(capture?.status).toBe('pending');
    expect(capture?.id).toBe('capture-1');
    expect(capture?.captureId).toBe('capture-1');
    expect(capture?.type).toBe('pothole');
    expect(capture?.severity).toBe('critical');
    expect(capture?.imageUrl).toBe('download://road-captures/capture-1.jpg');
    expect(capture?.location.address).toBe('Jalan Bestari, Cyberjaya');
  });

  it('keeps the Firestore document id for routes when capture_id differs', async () => {
    firestoreMocks.getDoc.mockResolvedValue({
      exists: () => true,
      id: 'firestore-doc-1',
      data: () => ({
        capture_id: 'mobile-capture-1',
        file_url: 'road-captures/mobile-capture-1.jpg',
        lat: 3.139,
        long: 101.6869,
        captured_at: 1710000000000,
        has_inferenced: true,
        traffic_level: 1,
        inference_results: [
          {
            class_id: 0,
            confidence: 0.45,
          },
        ],
      }),
    });

    const capture = await getCaptureById('firestore-doc-1');

    expect(capture?.id).toBe('firestore-doc-1');
    expect(capture?.captureId).toBe('mobile-capture-1');
  });

  it('maps empty inference results to the no-damage type', async () => {
    firestoreMocks.getDoc.mockResolvedValue({
      exists: () => true,
      id: 'capture-no-damage',
      data: () => ({
        capture_id: 'capture-no-damage',
        file_url: 'road-captures/capture-no-damage.jpg',
        lat: 3.139,
        long: 101.6869,
        captured_at: 1710000000000,
        has_inferenced: true,
        status: 'pending',
        repair_status: 'pending',
        traffic_level: 1,
        inference_results: [],
      }),
    });

    const capture = await getCaptureById('capture-no-damage');

    expect(capture?.type).toBe('no-damage');
    expect(capture?.status).toBe('completed');
    expect(capture?.description).toBe('Model inference completed with no road damage detections.');
  });

  it('uses the contributor display_name from the users collection', async () => {
    firestoreMocks.getDoc
      .mockResolvedValueOnce({
        exists: () => true,
        id: 'capture-username',
        data: () => ({
          capture_id: 'capture-username',
          user_id: 'user-with-name',
          file_url: 'road-captures/capture-username.jpg',
          lat: 3.139,
          long: 101.6869,
          captured_at: 1710000000000,
          has_inferenced: true,
          traffic_level: 1,
          inference_results: [],
        }),
      })
      .mockResolvedValueOnce({
        exists: () => true,
        id: 'user-with-name',
        data: () => ({
          display_name: 'Road Reporter',
        }),
      });

    const capture = await getCaptureById('capture-username');

    expect(capture?.contributor).toEqual({
      id: 'user-with-name',
      name: 'Road Reporter',
    });
  });

  it('stores a resolved location_address on the capture document', async () => {
    geocodingMocks.getNominatimLocationDisplayName.mockResolvedValue('Persiaran Bestari, Cyberjaya');
    firestoreMocks.getDoc
      .mockResolvedValueOnce({
        exists: () => true,
        id: 'capture-location-write',
        data: () => ({
          capture_id: 'capture-location-write',
          user_id: 'user-location',
          file_url: 'road-captures/capture-location-write.jpg',
          lat: 2.924214,
          long: 101.636707,
          captured_at: 1710000000000,
          has_inferenced: true,
          traffic_level: 1,
          inference_results: [],
        }),
      })
      .mockResolvedValueOnce({
        exists: () => false,
        data: () => undefined,
      });

    const capture = await getCaptureById('capture-location-write');

    expect(capture?.location.address).toBe('Persiaran Bestari, Cyberjaya');
    expect(firestoreMocks.updateDoc).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'captures/capture-location-write' }),
      { location_address: 'Persiaran Bestari, Cyberjaya' },
    );
  });

  it('uses stored location_address without resolving it again', async () => {
    firestoreMocks.getDoc
      .mockResolvedValueOnce({
        exists: () => true,
        id: 'capture-location-cached',
        data: () => ({
          capture_id: 'capture-location-cached',
          user_id: 'user-location-cached',
          file_url: 'road-captures/capture-location-cached.jpg',
          lat: 2.924214,
          long: 101.636707,
          location_address: 'Stored Road Name, Cyberjaya',
          captured_at: 1710000000000,
          has_inferenced: true,
          traffic_level: 1,
          inference_results: [],
        }),
      })
      .mockResolvedValueOnce({
        exists: () => false,
        data: () => undefined,
      });

    const capture = await getCaptureById('capture-location-cached');

    expect(capture?.location.address).toBe('Stored Road Name, Cyberjaya');
    expect(geocodingMocks.getNominatimLocationDisplayName).not.toHaveBeenCalled();
    expect(firestoreMocks.updateDoc).not.toHaveBeenCalled();
  });

  it('does not store coordinate fallback addresses after failed resolution', async () => {
    geocodingMocks.getNominatimLocationDisplayName.mockResolvedValue('2.924214, 101.636707');
    firestoreMocks.getDoc
      .mockResolvedValueOnce({
        exists: () => true,
        id: 'capture-location-failed',
        data: () => ({
          capture_id: 'capture-location-failed',
          user_id: 'user-location-failed',
          file_url: 'road-captures/capture-location-failed.jpg',
          lat: 2.924214,
          long: 101.636707,
          captured_at: 1710000000000,
          has_inferenced: true,
          traffic_level: 1,
          inference_results: [],
        }),
      })
      .mockResolvedValueOnce({
        exists: () => false,
        data: () => undefined,
      });

    const capture = await getCaptureById('capture-location-failed');

    expect(capture?.location.address).toBe('2.924214, 101.636707');
    expect(firestoreMocks.updateDoc).not.toHaveBeenCalled();
  });

  it('keeps all-captures loading light by not resolving images or missing addresses in bulk', async () => {
    firestoreMocks.getDocs.mockResolvedValue({
      docs: [
        {
          id: 'capture-summary',
          data: () => ({
            capture_id: 'capture-summary',
            file_url: 'road-captures/capture-summary.jpg',
            lat: 2.924214,
            long: 101.636707,
            captured_at: 1710000000000,
            has_inferenced: true,
            traffic_level: 1,
            inference_results: [],
          }),
        },
      ],
    });

    const captures = await getCaptures();

    expect(captures[0].imageUrl).toBe('road-captures/capture-summary.jpg');
    expect(captures[0].location.address).toBe('2.924214, 101.636707');
    expect(storageMocks.getDownloadURL).not.toHaveBeenCalled();
    expect(geocodingMocks.getNominatimLocationDisplayName).not.toHaveBeenCalled();
    expect(firestoreMocks.updateDoc).not.toHaveBeenCalled();
  });

  it('writes repair_status when updating the maintenance lifecycle', async () => {
    await updateCaptureStatus('capture-2', 'completed', managerActor);

    expect(firestoreMocks.updateDoc).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'captures/capture-2' }),
      {
        repair_status: 'completed',
        updated_at: 'server-now',
      },
    );
  });

  it('clears detections and stores manager review when marking a false report as no damage', async () => {
    await markCaptureNoDamage('capture-false-report', managerActor);

    expect(firestoreMocks.updateDoc).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'captures/capture-false-report' }),
      {
        inference_results: [],
        has_inferenced: true,
        status: 'completed',
        repair_status: 'completed',
        error_message: null,
        manager_review: {
          status: 'no-damage',
          marked_false_report: true,
          reviewed_by: 'manager-1',
          reviewed_by_name: 'Manager',
          reviewed_at: 'server-now',
        },
        updated_at: 'server-now',
      },
    );
  });

  it('assigns a team and moves the repair workflow to in-progress', async () => {
    await assignCaptureTeam('capture-3', 'Road Crew A', managerActor);

    expect(firestoreMocks.updateDoc).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'captures/capture-3' }),
      {
        assigned_team: 'Road Crew A',
        repair_status: 'in-progress',
        updated_at: 'server-now',
      },
    );
  });

  it('uploads an after-repair photo and marks the repair completed', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(1710000000123);
    storageMocks.uploadBytes.mockResolvedValue({});

    const result = await uploadCaptureAfterRepairPhoto(
      'capture-4',
      new File(['after'], 'repair.png', { type: 'image/png' }),
      managerActor,
    );

    expect(storageMocks.uploadBytes).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'after-repair/capture-4/1710000000123.png' }),
      expect.any(File),
      { contentType: 'image/png' },
    );
    expect(firestoreMocks.updateDoc).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'captures/capture-4' }),
      {
        after_repair_image_url: 'after-repair/capture-4/1710000000123.png',
        repair_status: 'completed',
        updated_at: 'server-now',
      },
    );
    expect(result).toBe('download://after-repair/capture-4/1710000000123.png');
  });

  it('appends maintenance comments atomically', async () => {
    await addCaptureComment('capture-5', {
      authorId: 'manager-2',
      authorName: 'Supervisor',
      authorRole: 'manager',
      text: 'Repair verified.',
    });

    expect(firestoreMocks.updateDoc).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'captures/capture-5' }),
      {
        maintenance_comments: {
          __arrayUnion: {
            author_id: 'manager-2',
            author_name: 'Supervisor',
            text: 'Repair verified.',
            created_at: expect.any(String),
          },
        },
        updated_at: 'server-now',
      },
    );
  });

  it('blocks regular users from maintenance writes', async () => {
    await expect(updateCaptureStatus('capture-6', 'completed', {
      id: 'user-1',
      name: 'Reporter',
      role: 'user',
    })).rejects.toThrow('Manager role is required');

    expect(firestoreMocks.updateDoc).not.toHaveBeenCalled();
  });
});
