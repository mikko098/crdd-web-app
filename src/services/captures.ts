import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';
import { getDownloadURL, ref } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { DamageSeverity, DamageStatus, DamageType, InferenceDetection, MaintenanceComment, RoadDamage } from '@/types';
import {
  congestionFromStoredLevel,
  getTrafficCongestion,
  trafficStatusFromCongestion,
} from '@/services/traffic';

interface FirebaseCapture {
  capture_id?: string;
  user_id?: string;
  file_url?: string;
  lat?: number;
  long?: number;
  accuracy?: number | null;
  captured_at?: number;
  created_at?: Timestamp;
  processed_at?: Timestamp;
  processing_started_at?: Timestamp;
  has_inferenced?: boolean;
  inference_model?: string;
  inference_results?: InferenceDetection[] | null;
  inference_time_ms?: number;
  image_hash?: string;
  retry_count?: number;
  traffic_level?: number;
  worker_id?: string;
  error_message?: string | null;
  status?: string;
  assigned_team?: string;
  maintenance_comments?: Array<{
    author_id?: string;
    author_name?: string;
    text?: string;
    created_at?: Timestamp | number | string;
  }>;
}

const captureCollection = collection(db, 'captures');

function timestampToIso(value?: Timestamp | number | null): string | undefined {
  if (!value) return undefined;
  if (typeof value === 'number') return new Date(value).toISOString();
  return value.toDate().toISOString();
}

async function resolveImageUrl(fileUrl?: string): Promise<string> {
  if (!fileUrl) return `${import.meta.env.BASE_URL}placeholder.svg`;
  if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) return fileUrl;
  if (fileUrl.startsWith('gs://')) return getDownloadURL(ref(storage, fileUrl));
  return getDownloadURL(ref(storage, fileUrl));
}

function normalizeClassName(name?: string): DamageType {
  const normalized = (name ?? '').toLowerCase();

  if (normalized.includes('pothole') || normalized.includes('d40')) return 'pothole';
  if (normalized.includes('transverse') || normalized.includes('d10')) return 'transverse-crack';
  if (normalized.includes('alligator') || normalized.includes('d20')) return 'alligator';
  if (normalized.includes('longitudinal') || normalized.includes('d00')) return 'longitudinal-crack';

  return 'other';
}

function pickDamageType(detections: InferenceDetection[] | null | undefined): DamageType {
  if (!detections?.length) return 'other';

  const highestConfidenceDetection = [...detections].sort(
    (a, b) => (b.confidence ?? 0) - (a.confidence ?? 0),
  )[0];

  if (!highestConfidenceDetection.class_name && typeof highestConfidenceDetection.class_id === 'number') {
    const rddClassTypes: Record<number, DamageType> = {
      0: 'longitudinal-crack',
      1: 'transverse-crack',
      2: 'alligator',
      3: 'pothole',
    };

    return rddClassTypes[highestConfidenceDetection.class_id] ?? 'other';
  }

  return normalizeClassName(highestConfidenceDetection.class_name);
}

function inferSeverity(detections: InferenceDetection[] | null | undefined): DamageSeverity {
  if (!detections?.length) return 'low';

  const topConfidence = Math.max(...detections.map((d) => d.confidence ?? 0));
  if (detections.length >= 4 || topConfidence >= 0.75) return 'critical';
  if (detections.length >= 2 || topConfidence >= 0.55) return 'high';
  if (topConfidence >= 0.35) return 'medium';
  return 'low';
}

function inferStatus(capture: FirebaseCapture, severity: DamageSeverity, trafficStatus: RoadDamage['trafficStatus']): DamageStatus {
  if (capture.status === 'completed') return 'completed';
  if (capture.status === 'in-progress') return 'in-progress';
  if (capture.processing_started_at && !capture.processed_at) return 'in-progress';
  if (severity === 'critical' || severity === 'high' || trafficStatus === 'high') return 'urgent';
  return 'pending';
}

function buildDescription(capture: FirebaseCapture, detections: InferenceDetection[]): string {
  if (!capture.has_inferenced) return 'Capture is waiting for model inference.';
  if (!detections.length) return 'Model inference completed with no road damage detections.';

  const detectionSummary = detections
    .map((d) => `${d.class_name ?? 'damage'}${d.confidence ? ` (${Math.round(d.confidence * 100)}%)` : ''}`)
    .join(', ');

  return `Model inference detected ${detections.length} issue${detections.length === 1 ? '' : 's'}: ${detectionSummary}.`;
}

function mapMaintenanceComments(capture: FirebaseCapture): MaintenanceComment[] {
  return (capture.maintenance_comments ?? [])
    .filter((comment) => typeof comment.text === 'string' && comment.text.trim().length > 0)
    .map((comment) => ({
      authorId: comment.author_id ?? 'unknown',
      authorName: comment.author_name ?? 'Unknown user',
      text: comment.text ?? '',
      createdAt:
        typeof comment.created_at === 'string'
          ? comment.created_at
          : timestampToIso(comment.created_at) ?? new Date().toISOString(),
    }));
}

async function mapCaptureDocument(id: string, capture: FirebaseCapture): Promise<RoadDamage> {
  const detections = capture.inference_results ?? [];
  const severity = inferSeverity(detections);
  const dateReported = timestampToIso(capture.captured_at) ?? timestampToIso(capture.created_at) ?? new Date().toISOString();
  const trafficCongestion = capture.traffic_level === undefined
    ? await getTrafficCongestion(capture.lat ?? 0, capture.long ?? 0, dateReported)
    : congestionFromStoredLevel(capture.traffic_level);
  const trafficStatus = trafficStatusFromCongestion(trafficCongestion);

  return {
    id: capture.capture_id ?? id,
    captureId: capture.capture_id ?? id,
    type: pickDamageType(detections),
    severity,
    status: inferStatus(capture, severity, trafficStatus),
    location: {
      lat: capture.lat ?? 0,
      lng: capture.long ?? 0,
      address: capture.lat && capture.long ? `${capture.lat.toFixed(6)}, ${capture.long.toFixed(6)}` : 'Unknown location',
    },
    dateReported,
    contributor: {
      id: capture.user_id ?? 'unknown',
      name: capture.user_id ? `User ${capture.user_id.slice(0, 8)}` : 'Unknown user',
    },
    comment: capture.error_message ?? undefined,
    imageUrl: await resolveImageUrl(capture.file_url),
    trafficStatus,
    trafficCongestion,
    assignedTeam: capture.assigned_team,
    maintenanceComments: mapMaintenanceComments(capture),
    description: buildDescription(capture, detections),
    accuracy: capture.accuracy ?? null,
    capturedAt: capture.captured_at,
    createdAt: timestampToIso(capture.created_at),
    processedAt: timestampToIso(capture.processed_at),
    hasInferenced: capture.has_inferenced ?? false,
    inferenceModel: capture.inference_model,
    inferenceTimeMs: capture.inference_time_ms,
    inferenceResults: detections,
    imageHash: capture.image_hash,
    workerId: capture.worker_id,
    errorMessage: capture.error_message ?? null,
  };
}

export async function getCaptures(): Promise<RoadDamage[]> {
  const snapshot = await getDocs(query(captureCollection, orderBy('created_at', 'desc'), limit(250)));
  return Promise.all(snapshot.docs.map((captureDoc) => mapCaptureDocument(captureDoc.id, captureDoc.data() as FirebaseCapture)));
}

export async function getCaptureById(id: string): Promise<RoadDamage | null> {
  const snapshot = await getDoc(doc(db, 'captures', id));
  if (!snapshot.exists()) return null;
  return mapCaptureDocument(snapshot.id, snapshot.data() as FirebaseCapture);
}

export async function updateCaptureStatus(id: string, status: DamageStatus): Promise<void> {
  await updateDoc(doc(db, 'captures', id), {
    status,
    updated_at: serverTimestamp(),
  });
}

export async function assignCaptureTeam(id: string, assignedTeam: string): Promise<void> {
  await updateDoc(doc(db, 'captures', id), {
    assigned_team: assignedTeam,
    updated_at: serverTimestamp(),
  });
}

export async function addCaptureComment(
  id: string,
  comment: {
    authorId: string;
    authorName: string;
    text: string;
  },
): Promise<void> {
  const current = await getDoc(doc(db, 'captures', id));
  const existing = current.exists()
    ? ((current.data() as FirebaseCapture).maintenance_comments ?? [])
    : [];

  await updateDoc(doc(db, 'captures', id), {
    maintenance_comments: [
      ...existing,
      {
        author_id: comment.authorId,
        author_name: comment.authorName,
        text: comment.text,
        created_at: new Date().toISOString(),
      },
    ],
    updated_at: serverTimestamp(),
  });
}
