import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { requireManager } from '@/lib/permissions';
import { User, UserRole } from '@/types';

interface FirestoreUserProfile {
  uid?: string;
  email?: string;
  display_name?: string;
  role?: UserRole;
  is_active?: boolean;
}

const usersCollection = collection(db, 'users');

export async function getDashboardUsers(): Promise<User[]> {
  const snapshot = await getDocs(query(usersCollection, orderBy('email', 'asc')));

  return snapshot.docs.map((userDoc) => {
    const data = userDoc.data() as FirestoreUserProfile;
    return {
      id: data.uid ?? userDoc.id,
      name: data.display_name ?? data.email?.split('@')[0] ?? 'RoadVision User',
      email: data.email ?? '',
      role: data.role === 'manager' ? 'manager' : 'user',
    };
  });
}

export async function updateDashboardUserRole(
  targetUserId: string,
  role: UserRole,
  actor: Pick<User, 'id' | 'name' | 'role'>,
): Promise<void> {
  requireManager(actor);

  if (targetUserId === actor.id && role !== 'manager') {
    throw new Error('Managers cannot remove their own manager role.');
  }

  await updateDoc(doc(db, 'users', targetUserId), {
    role,
    updated_at: serverTimestamp(),
    updated_by: actor.id,
  });
}
