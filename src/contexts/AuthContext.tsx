import { createContext, useContext, useMemo, ReactNode } from 'react';
import { useUser, useAuth as useClerkAuth, useClerk } from '@clerk/clerk-react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Profile } from '../types/database';

interface AuthContextType {
  user: any | null;
  profile: Profile | null;
  session: any | null;
  loading: boolean;
  signIn: (email: string, password?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user, isLoaded: isUserLoaded } = useUser();
  const { isLoaded: isSessionLoaded, signOut: clerkSignOut } = useClerkAuth();
  useClerk(); // keep Clerk initialized
  
  // Get primary email from Clerk user (fallback to first email if primary not set)
  const primaryEmail = user?.primaryEmailAddress?.emailAddress 
    ?? user?.emailAddresses?.[0]?.emailAddress 
    ?? null;

  // Reactively fetch user profile from Convex by email
  const profileRaw = useQuery(
    api.profiles.getByEmail,
    primaryEmail ? { email: primaryEmail } : "skip"
  );
  
  // loading is true until both Clerk AND Convex have finished loading
  const isProfileLoading = primaryEmail ? profileRaw === undefined : false;
  const loading = !isUserLoaded || !isSessionLoaded || isProfileLoading;
  
  // Compute profile DIRECTLY from profileRaw in same render cycle.
  // IMPORTANT: Do NOT use useState + useEffect here — that causes a race condition
  // where loading=false but profile=null for one render, causing ProtectedRoute to
  // redirect to /unauthorized prematurely.
  const profile = useMemo<Profile | null>(() => {
    if (!profileRaw) return null;
    if (profileRaw.is_active === false) return null;
    return { ...profileRaw, id: profileRaw._id } as Profile;
  }, [profileRaw]);

  console.log('Auth State:', { 
    isUserLoaded, isSessionLoaded, primaryEmail, 
    isProfileLoading, loading, 
    profile: profile ? { email: profile.email, role: profile.role } : null 
  });

  const signIn = async () => {
    return { error: new Error('Please use Clerk Login components.') };
  };

  const signOut = async () => {
    await clerkSignOut();
  };

  const refreshProfile = async () => {
    // Convex useQuery auto-refreshes on data changes — no-op kept for API compatibility
  };

  return (
    <AuthContext.Provider value={{ 
        user: user || null, 
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
