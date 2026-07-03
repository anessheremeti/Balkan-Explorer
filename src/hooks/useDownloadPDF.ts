import { useState } from 'react';
import { supabase } from '../../createClient';
import { getItineraryByTripId } from './itineraryService';
import { useToast } from './useToast';
import tripService from './tripService';

export interface UseDownloadPDF {
  download: () => Promise<void>;
  loading: boolean;
  showAuthModal: boolean;
  closeAuthModal: () => void;
}

export function useDownloadPDF(): UseDownloadPDF {
  const [loading, setLoading] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { showToast } = useToast();

  const download = async () => {
    try {
      // 1. Auth guard
      const { data: authData } = await supabase.auth.getUser();
      if (!authData?.user?.id) {
        setShowAuthModal(true);
        return;
      }

      // 2. Find the latest trip (fallback through guest_id as well)
      const guestId = localStorage.getItem('guest_id');
      const { getLatestTrip } = await tripService();
      const trip = await getLatestTrip(authData.user.id, guestId);

      if (!trip?.id) {
        showToast('No itinerary found. Plan a trip first!', 'error');
        return;
      }

      // 3. Fetch full itinerary and generate PDF
      setLoading(true);
      const [{ generateItineraryPDF }, result] = await Promise.all([
        import('../lib/generateItineraryPDF'),
        getItineraryByTripId(trip.id),
      ]);

      if (!result.trip || result.days.length === 0) {
        showToast('Itinerary is still generating — try again in a moment.', 'error');
        return;
      }

      await generateItineraryPDF(result.trip, result.days);
      showToast('PDF downloaded!', 'success');
    } catch (err) {
      console.error('[PDF] generation failed:', err);
      showToast('Could not generate PDF. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return {
    download,
    loading,
    showAuthModal,
    closeAuthModal: () => setShowAuthModal(false),
  };
}
