import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { User, UserRole } from '@/types';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface UserProfile {
  display_name?: string;
  role?: UserRole;
}

function toAppUser(firebaseUser: FirebaseUser, profile?: UserProfile, displayNameOverride?: string): User {
  const name =
    displayNameOverride ||
    profile?.display_name ||
    firebaseUser.displayName ||
    firebaseUser.email?.split('@')[0] ||
    'RoadVision User';

  return {
    id: firebaseUser.uid,
    name,
    email: firebaseUser.email ?? '',
    role: profile?.role === 'manager' ? 'manager' : 'user',
    avatar: firebaseUser.photoURL ?? undefined,
  };
}

async function loadAppUser(firebaseUser: FirebaseUser, displayNameOverride?: string): Promise<User> {
  const userRef = doc(db, 'users', firebaseUser.uid);
  const snapshot = await getDoc(userRef);

  if (snapshot.exists()) {
    return toAppUser(firebaseUser, snapshot.data() as UserProfile, displayNameOverride);
  }

  const displayName =
    displayNameOverride ||
    firebaseUser.displayName ||
    firebaseUser.email?.split('@')[0] ||
    'RoadVision User';

  await setDoc(userRef, {
    uid: firebaseUser.uid,
    email: firebaseUser.email ?? '',
    display_name: displayName,
    role: 'user',
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
    is_active: true,
  });

  return toAppUser(firebaseUser, { display_name: displayName, role: 'user' });
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        setUser(firebaseUser ? await loadAppUser(firebaseUser) : null);
      } finally {
        setIsLoading(false);
      }
    });
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    setUser(await loadAppUser(credential.user));
    return true;
  };

  const register = async (name: string, email: string, password: string): Promise<boolean> => {
    const cleanName = name.trim();
    const credential = await createUserWithEmailAndPassword(auth, email, password);

    if (cleanName) {
      await updateProfile(credential.user, { displayName: cleanName });
    }

    await setDoc(doc(db, 'users', credential.user.uid), {
      uid: credential.user.uid,
      email: credential.user.email ?? email,
      display_name: cleanName || credential.user.email?.split('@')[0] || 'RoadVision User',
      role: 'user',
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
      is_active: true,
    });

    setUser(await loadAppUser(credential.user, cleanName));
    return true;
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isAuthenticated: !!user, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
