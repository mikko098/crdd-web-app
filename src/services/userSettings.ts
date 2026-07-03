import { deleteField, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { UserSettings } from '@/types';

export const defaultUserSettings: UserSettings = {
  emailNotifications: true,
  language: 'en',
  theme: 'system',
};

export async function getUserSettings(userId: string): Promise<UserSettings> {
  const snapshot = await getDoc(doc(db, 'user_settings', userId));

  if (!snapshot.exists()) {
    return defaultUserSettings;
  }

  const data = snapshot.data() as Partial<UserSettings>;

  return {
    emailNotifications: data.emailNotifications ?? defaultUserSettings.emailNotifications,
    language: data.language ?? defaultUserSettings.language,
    theme: data.theme ?? defaultUserSettings.theme,
  };
}

export async function saveUserSettings(userId: string, settings: UserSettings): Promise<void> {
  await setDoc(
    doc(db, 'user_settings', userId),
    {
      ...settings,
      pushNotifications: deleteField(),
      mobileAlerts: deleteField(),
      user_id: userId,
      updated_at: serverTimestamp(),
    },
    { merge: true },
  );
}
