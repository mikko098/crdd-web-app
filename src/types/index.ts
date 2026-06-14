export type UserRole = 'user' | 'manager';

export type DamageStatus = 'urgent' | 'pending' | 'in-progress' | 'completed';
export type ThemePreference = 'light' | 'dark' | 'system';

export type DamageSeverity = 'critical' | 'high' | 'medium' | 'low';

export type DamageType = 'pothole' | 'transverse-crack' | 'alligator' | 'longitudinal-crack' | 'other';

export interface InferenceDetection {
  class_id?: number;
  class_name?: string;
  confidence?: number;
  bbox?: number[];
  bbox_normalized?: boolean;
}

export interface MaintenanceComment {
  authorId: string;
  authorName: string;
  text: string;
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

export interface UserSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  language: string;
  twoFactor: boolean;
  mobileAlerts: boolean;
  theme: ThemePreference;
}

export interface RoadDamage {
  id: string;
  captureId?: string;
  type: DamageType;
  severity: DamageSeverity;
  status: DamageStatus;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  dateReported: string;
  contributor: {
    id: string;
    name: string;
  };
  comment?: string;
  imageUrl: string;
  afterRepairImageUrl?: string;
  trafficStatus: 'high' | 'medium' | 'low';
  trafficCongestion?: {
    level: string;
    percent: number;
    speed: number;
    impact: string;
    source: 'tomtom' | 'estimated' | 'firebase';
  };
  assignedTeam?: string;
  maintenanceComments?: MaintenanceComment[];
  description?: string;
  accuracy?: number | null;
  capturedAt?: number;
  createdAt?: string;
  processedAt?: string;
  hasInferenced?: boolean;
  inferenceModel?: string;
  inferenceTimeMs?: number;
  inferenceResults?: InferenceDetection[];
  imageHash?: string;
  workerId?: string;
  errorMessage?: string | null;
}

export interface DashboardStats {
  total: number;
  urgent: number;
  pending: number;
  inProgress: number;
  completed: number;
}
