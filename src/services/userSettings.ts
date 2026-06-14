import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { UserSettings } from '@/types';

export const defaultUserSettings: UserSettings = {
  emailNotifications: true,
  pushNotifications: false,
  language: 'en',
  twoFactor: false,
  mobileAlerts: true,
  theme: 'system',
};

export async function getUserSettings(userId: string): Promise<UserSettings> {
  const snapshot = await getDoc(doc(db, 'user_settings', userId));

  if (!snapshot.exists()) {
    return defaultUserSettings;
  }

  return {
    ...defaultUserSettings,
    ...(snapshot.data() as Partial<UserSettings>),
  };
}

export async function saveUserSettings(userId: string, settings: UserSettings): Promise<void> {
  await setDoc(
    doc(db, 'user_settings', userId),
    {
      ...settings,
      user_id: userId,
      updated_at: serverTimestamp(),
    },
    { merge: true },
  );
}
