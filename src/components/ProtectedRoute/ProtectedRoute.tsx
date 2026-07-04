import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { supabase } from '../../../createClient';

type AuthState = 'loading' | 'authenticated' | 'unauthenticated';

export default function ProtectedRoute() {
  const location = useLocation();
  const [authState, setAuthState] = useState<AuthState>('loading');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setAuthState(data.session ? 'authenticated' : 'unauthenticated');
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setAuthState(session ? 'authenticated' : 'unauthenticated');
    });

    return () => subscription.unsubscribe();
  }, []);

  if (authState === 'loading') return null;

  if (authState === 'unauthenticated') {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
