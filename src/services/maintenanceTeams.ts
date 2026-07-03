import {
  addDoc,
  collection,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { requireManager } from '@/lib/permissions';
import { MaintenanceTeam, User } from '@/types';

interface FirestoreMaintenanceTeam {
  name?: string;
  is_active?: boolean;
}

const teamsCollection = collection(db, 'maintenance_teams');

export const fallbackMaintenanceTeams: MaintenanceTeam[] = [
  { id: 'team-alpha', name: 'Team Alpha', isActive: true },
  { id: 'team-beta', name: 'Team Beta', isActive: true },
  { id: 'team-gamma', name: 'Team Gamma', isActive: true },
  { id: 'team-delta', name: 'Team Delta', isActive: true },
];

export async function getMaintenanceTeams(): Promise<MaintenanceTeam[]> {
  const snapshot = await getDocs(query(teamsCollection, orderBy('name', 'asc')));
  const teams = snapshot.docs
    .map((teamDoc) => {
      const data = teamDoc.data() as FirestoreMaintenanceTeam;
      return {
        id: teamDoc.id,
        name: data.name?.trim() || teamDoc.id,
        isActive: data.is_active !== false,
      };
    })
    .filter((team) => team.isActive);

  return teams.length ? teams : fallbackMaintenanceTeams;
}

export async function createMaintenanceTeam(name: string, actor: Pick<User, 'id' | 'name' | 'role'>): Promise<void> {
  requireManager(actor);

  const cleanName = name.trim();
  if (!cleanName) {
    throw new Error('Team name is required.');
  }

  await addDoc(teamsCollection, {
    name: cleanName,
    is_active: true,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });
}
