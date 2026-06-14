import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../createClient';

export interface TripSummary {
  id: string;
  title: string;
  destination: string | null;
  travel_style: string | null;
  starting_date: string | null;
  returning_date: string | null;
  budget_total: number | null;
  currency: string | null;
  travelers: number | null;
}

const PAGE_SIZE = 3;

interface UseMyTripsResult {
  trips: TripSummary[];
  page: number;
  totalPages: number;
  totalCount: number;
  isLoading: boolean;
  authLoading: boolean;
  error: string | null;
  isLoggedOut: boolean;
  goToPage: (p: number) => void;
}

export function useMyTrips(): UseMyTripsResult {
  const [userId, setUserId] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [trips, setTrips] = useState<TripSummary[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Resolve the authenticated user once on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user.id ?? null);
      setAuthLoading(false);
    });
  }, []);

  const fetchPage = useCallback(async (uid: string, p: number) => {
    setIsLoading(true);
    setError(null);

    const from = (p - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, error: err, count } = await supabase
      .from('trips')
      .select(
        'id, title, destination, travel_style, starting_date, returning_date, budget_total, currency, travelers',
        { count: 'exact' }
      )
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (err) {
      setError(err.message);
    } else {
      setTrips((data as TripSummary[]) ?? []);
      setTotalCount(count ?? 0);
    }

    setIsLoading(false);
  }, []);

  // Re-fetch whenever userId or page changes (but only after auth is resolved)
  useEffect(() => {
    if (authLoading) return;
    if (!userId) return;
    fetchPage(userId, page);
  }, [authLoading, userId, page, fetchPage]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const goToPage = (p: number) => {
    if (p >= 1 && p <= totalPages) setPage(p);
  };

  return {
    trips,
    page,
    totalPages,
    totalCount,
    isLoading,
    authLoading,
    error,
    isLoggedOut: !authLoading && userId === null,
    goToPage,
  };
}
