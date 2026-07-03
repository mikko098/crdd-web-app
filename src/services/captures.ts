import {
  addDoc,
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
  arrayUnion,
  onSnapshot,
  QuerySnapshot,
  DocumentData,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { requireManager } from '@/lib/permissions';
import { DamageSeverity, DamageStatus, DamageType, InferenceDetection, MaintenanceComment, RoadDamage, User, WorkflowEvent } from '@/types';
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
  repair_status?: string;
  after_repair_image_url?: string;
  assigned_team?: string;
  maintenance_comments?: Array<{
    author_id?: string;
    author_name?: string;
    text?: string;
    created_at?: Timestamp | number | string;
  }>;
}

type WorkflowActor = Pick<User, 'id' | 'name' | 'role'>;

interface FirestoreWorkflowEvent {
  action?: string;
  actor_id?: string;
  actor_name?: string;
  created_at?: Timestamp | string;
  details?: string;
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

const repairStatuses: DamageStatus[] = ['urgent', 'pending', 'in-progress', 'completed'];

function isRepairStatus(value?: string): value is DamageStatus {
  return repairStatuses.includes(value as DamageStatus);
}

function inferStatus(capture: FirebaseCapture, severity: DamageSeverity, trafficStatus: RoadDamage['trafficStatus']): DamageStatus {
  if (isRepairStatus(capture.repair_status)) return capture.repair_status;
  if (capture.assigned_team && isRepairStatus(capture.status)) return capture.status;
  if (capture.assigned_team) return 'in-progress';
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
    id,
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
    afterRepairImageUrl: capture.after_repair_image_url
      ? await resolveImageUrl(capture.after_repair_image_url)
      : undefined,
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

async function mapCaptureSnapshot(snapshot: QuerySnapshot<DocumentData>): Promise<RoadDamage[]> {
  return Promise.all(snapshot.docs.map((captureDoc) => mapCaptureDocument(captureDoc.id, captureDoc.data() as FirebaseCapture)));
}

export function subscribeCaptures(
  onData: (captures: RoadDamage[]) => void,
  onError: (error: Error) => void,
): () => void {
  return onSnapshot(
    query(captureCollection, orderBy('created_at', 'desc'), limit(250)),
    (snapshot) => {
      mapCaptureSnapshot(snapshot).then(onData).catch(onError);
    },
    onError,
  );
}

export function subscribeCaptureById(
  id: string,
  onData: (capture: RoadDamage | null) => void,
  onError: (error: Error) => void,
): () => void {
  return onSnapshot(
    doc(db, 'captures', id),
    (snapshot) => {
      if (!snapshot.exists()) {
        onData(null);
        return;
      }

      mapCaptureDocument(snapshot.id, snapshot.data() as FirebaseCapture).then(onData).catch(onError);
    },
    onError,
  );
}

async function recordWorkflowEvent(
  id: string,
  event: {
    action: string;
    actor?: WorkflowActor;
    details?: string;
  },
): Promise<void> {
  try {
    await addDoc(collection(doc(db, 'captures', id), 'workflow_events'), {
      action: event.action,
      actor_id: event.actor?.id ?? 'system',
      actor_name: event.actor?.name ?? 'System',
      details: event.details ?? '',
      created_at: serverTimestamp(),
    });
  } catch (error) {
    console.warn('Failed to write workflow event.', error);
  }
}

export async function getCaptureWorkflowEvents(id: string): Promise<WorkflowEvent[]> {
  const snapshot = await getDocs(query(collection(doc(db, 'captures', id), 'workflow_events'), orderBy('created_at', 'desc'), limit(25)));

  return snapshot.docs.map((eventDoc) => {
    const data = eventDoc.data() as FirestoreWorkflowEvent;
    return {
      id: eventDoc.id,
      action: data.action ?? 'updated',
      actorId: data.actor_id ?? 'unknown',
      actorName: data.actor_name ?? 'Unknown user',
      details: data.details,
      createdAt:
        typeof data.created_at === 'string'
          ? data.created_at
          : timestampToIso(data.created_at) ?? new Date().toISOString(),
    };
  });
}

export async function updateCaptureStatus(id: string, status: DamageStatus, actor: WorkflowActor): Promise<void> {
  requireManager(actor);

  await updateDoc(doc(db, 'captures', id), {
    repair_status: status,
    updated_at: serverTimestamp(),
  });
  await recordWorkflowEvent(id, {
    action: 'status-updated',
    actor,
    details: `Status changed to ${status.replace('-', ' ')}.`,
  });
}

export async function assignCaptureTeam(id: string, assignedTeam: string, actor: WorkflowActor): Promise<void> {
  requireManager(actor);

  await updateDoc(doc(db, 'captures', id), {
    assigned_team: assignedTeam,
    repair_status: 'in-progress',
    updated_at: serverTimestamp(),
  });
  await recordWorkflowEvent(id, {
    action: 'team-assigned',
    actor,
    details: `${assignedTeam} assigned to this report.`,
  });
}

export async function uploadCaptureAfterRepairPhoto(id: string, file: File, actor: WorkflowActor): Promise<string> {
  requireManager(actor);

  const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const storagePath = `after-repair/${id}/${Date.now()}.${extension}`;
  const storageRef = ref(storage, storagePath);

  await uploadBytes(storageRef, file, {
    contentType: file.type || 'image/jpeg',
  });

  await updateDoc(doc(db, 'captures', id), {
    after_repair_image_url: storagePath,
    repair_status: 'completed',
    updated_at: serverTimestamp(),
  });
  await recordWorkflowEvent(id, {
    action: 'after-photo-uploaded',
    actor,
    details: 'After-repair photo uploaded and report marked completed.',
  });

  return getDownloadURL(storageRef);
}

export async function addCaptureComment(
  id: string,
  comment: {
    authorId: string;
    authorName: string;
    authorRole: User['role'];
    text: string;
  },
): Promise<void> {
  requireManager({
    id: comment.authorId,
    name: comment.authorName,
    role: comment.authorRole,
  });

  await updateDoc(doc(db, 'captures', id), {
    maintenance_comments: arrayUnion({
      author_id: comment.authorId,
      author_name: comment.authorName,
      text: comment.text,
      created_at: new Date().toISOString(),
    }),
    updated_at: serverTimestamp(),
  });
  await recordWorkflowEvent(id, {
    action: 'comment-added',
    actor: {
      id: comment.authorId,
      name: comment.authorName,
      role: comment.authorRole,
    },
    details: comment.text,
  });
}
