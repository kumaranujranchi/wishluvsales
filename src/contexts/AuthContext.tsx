import { createContext, useContext, useMemo, useState, useEffect, ReactNode } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Profile } from '../types/database';

interface AuthContextType {
  user: any | null;
  profile: Profile | null;
  session: any | null;
  loading: boolean;
  signIn: (email: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [userEmail, setUserEmail] = useState<string | null>(() => {
    return localStorage.getItem('wishpro_user_email');
  });

  const [loading, setLoading] = useState(true);

  // Reactively fetch user profile from Convex by email
  const profileRaw = useQuery(
    api.profiles.getByEmail,
    userEmail ? { email: userEmail } : "skip"
  );

  // loading is true until Convex has finished loading (if logged in)
  useEffect(() => {
    if (!userEmail) {
      setLoading(false);
    } else if (profileRaw !== undefined) {
      setLoading(false);
    } else {
      setLoading(true);
    }
  }, [userEmail, profileRaw]);

  const profile = useMemo<Profile | null>(() => {
    if (!profileRaw) return null;
    if (profileRaw.is_active === false) return null;
    return { ...profileRaw, id: profileRaw._id, force_password_change: false } as Profile;
  }, [profileRaw]);

  // Mock Clerk user object for compatibility with pages that reference clerk's user
  const user = useMemo(() => {
    if (!profile) return null;
    return {
      id: profile.employee_id,
      primaryEmailAddress: {
        emailAddress: profile.email
      },
      emailAddresses: [{ emailAddress: profile.email }],
      fullName: profile.full_name,
    };
  }, [profile]);

  console.log('Auth State (Custom):', { 
    userEmail, loading, 
    profile: profile ? { email: profile.email, role: profile.role } : null 
  });

  const signIn = async (email: string) => {
    setUserEmail(email);
    localStorage.setItem('wishpro_user_email', email);
    setLoading(true);
    return { error: null };
  };

  const signOut = async () => {
    setUserEmail(null);
    localStorage.removeItem('wishpro_user_email');
  };

  const refreshProfile = async () => {
    // Convex useQuery auto-refreshes on data changes
  };

  return (
    <AuthContext.Provider value={{ 
        user, 
        profile, 
        session: null, 
        loading, 
        signIn, 
        signOut, 
        refreshProfile 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
