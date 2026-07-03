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

vi.mock('firebase/firestore', () => firestoreMocks);
vi.mock('firebase/storage', () => storageMocks);
vi.mock('@/lib/firebase', () => ({
  db: { name: 'mock-db' },
  storage: { name: 'mock-storage' },
}));
vi.mock('@/services/traffic', () => trafficMocks);

import {
  addCaptureComment,
  assignCaptureTeam,
  getCaptureById,
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
