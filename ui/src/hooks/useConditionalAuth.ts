'use client'

import { useAuth, useUser } from "@clerk/nextjs";
import { useAuthMode } from "./useAuthMode";

/**
 * Hook that conditionally uses Clerk auth hooks only when not in SQLite mode
 * This prevents React hooks from being called when ClerkProvider is not available
 */
export function useConditionalAuth() {
  const { isSQLite } = useAuthMode();
  
  // Always call the hooks, but ignore results in SQLite mode
  const clerkAuth = useAuth();
  const clerkUser = useUser();
  
  if (isSQLite) {
    return {
      // Auth hook results
      userId: null,
      isLoaded: true,
      isSignedIn: false,
      // User hook results  
      user: null,
      // Effective values for SQLite mode
      effectiveUserId: 'sqlite-default-user',
      effectiveIsSignedIn: true,
      effectiveIsLoaded: true,
    };
  }
  
  return {
    // Auth hook results
    userId: clerkAuth.userId,
    isLoaded: clerkAuth.isLoaded,
    isSignedIn: clerkAuth.isSignedIn,
    // User hook results
    user: clerkUser.user,
    // Effective values (same as Clerk values in non-SQLite mode)
    effectiveUserId: clerkAuth.userId,
    effectiveIsSignedIn: clerkAuth.isSignedIn,
    effectiveIsLoaded: clerkAuth.isLoaded,
  };
}