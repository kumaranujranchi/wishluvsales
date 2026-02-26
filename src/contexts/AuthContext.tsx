import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useUser, useAuth as useClerkAuth, useClerk } from '@clerk/clerk-react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Profile } from '../types/database';

interface AuthContextType {
  user: any | null; // Clerk user
  profile: Profile | null;
  session: any | null; // Clerk session (unused directly by old code format usually)
  loading: boolean;
  signIn: (email: string, password?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user, isLoaded: isUserLoaded } = useUser();
  const { isLoaded: isSessionLoaded, signOut: clerkSignOut } = useClerkAuth();
  const clerk = useClerk();
  
  // Get all emails from Clerk user, not just primary
  const email = user?.primaryEmailAddress?.emailAddress;
  const allEmails = user?.emailAddresses?.map((e: any) => e.emailAddress) ?? [];
  
  // Try primary email first for Convex lookup
  const primaryEmail = email ?? allEmails[0] ?? null;

  // Reactively fetch user profile from Convex
  const profileRaw = useQuery(
    api.profiles.getByEmail,
    primaryEmail ? { email: primaryEmail } : "skip"
  );
  
  const isProfileLoading = primaryEmail ? profileRaw === undefined : false;
  const loading = !isUserLoaded || !isSessionLoaded || isProfileLoading;
  
  console.log('Auth State:', { isUserLoaded, isSessionLoaded, email, allEmails, primaryEmail, isProfileLoading, loading, profileRaw: profileRaw === undefined ? 'loading...' : profileRaw });
  
  // Manage explicit state so it aligns with previous component expectations
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (profileRaw !== undefined) {
      if (profileRaw === null) {
          setProfile(null);
      } else if (profileRaw.is_active === false) {
          clerkSignOut(); // User is disabled mapping
          setProfile(null);
      } else {
          setProfile(prev => {
              if (prev && prev.id === profileRaw._id && prev.updated_at === profileRaw.updated_at) {
                  return prev; // Break the infinite render loop
              }
              return {
                  ...profileRaw,
                  id: profileRaw._id
              } as Profile;
          });
      }
    } else {
       if (!email) {
           setProfile(null);
       }
    }
  }, [profileRaw, email, clerkSignOut]);

  // Expose mock signIn if needed, though Clerk handles its own login forms, 
  // keeping the signature doesn't break dependent components immediately.
  const signIn = async () => {
    return { error: new Error('Please use Clerk Login components.') };
  };

  const signOut = async () => {
    await clerkSignOut();
  };

  const refreshProfile = async () => {
    // Convex useQuery auto-refreshes component on data change, 
    // so this is largely a no-op but we keep it for API compatibility.
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
