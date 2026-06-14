import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleMap, useJsApiLoader } from '@react-google-maps/api';
import { MarkerClusterer } from '@googlemaps/markerclusterer';
import { MapPin } from 'lucide-react';
import { useItineraryForTrip } from '../../hooks/useItineraryForTrip';
import { loadMapState, saveMapState } from '../../hooks/useSessionMapState';

// ─── Constants ────────────────────────────────────────────────────────────────

const LIBRARIES: ('maps' | 'places')[] = ['maps', 'places'];
const MAP_CONTAINER = { width: '100%', height: '100%' };
const BALKAN_CENTER = { lat: 41.9, lng: 20.7 };

const ITEM_TYPE_COLORS: Record<string, string> = {
  activity:  '#22c55e',
  food:      '#f97316',
  stay:      '#f59e0b',
  transport: '#8b5cf6',
};

const DARK_MAP_STYLE = [
  { elementType: 'geometry',           stylers: [{ color: '#1e293b' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1e293b' }] },
  { elementType: 'labels.text.fill',   stylers: [{ color: '#94a3b8' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#cbd5e1' }] },
  { featureType: 'poi',            elementType: 'labels.text.fill',   stylers: [{ color: '#94a3b8' }] },
  { featureType: 'poi.park',       elementType: 'geometry',            stylers: [{ color: '#263c3f' }] },
  { featureType: 'road',           elementType: 'geometry',            stylers: [{ color: '#334155' }] },
  { featureType: 'road',           elementType: 'geometry.stroke',     stylers: [{ color: '#1e293b' }] },
  { featureType: 'road.highway',   elementType: 'geometry',            stylers: [{ color: '#475569' }] },
  { featureType: 'road.highway',   elementType: 'geometry.stroke',     stylers: [{ color: '#334155' }] },
  { featureType: 'road.highway',   elementType: 'labels.text.fill',    stylers: [{ color: '#cbd5e1' }] },
  { featureType: 'water',          elementType: 'geometry',            stylers: [{ color: '#0f172a' }] },
  { featureType: 'water',          elementType: 'labels.text.fill',    stylers: [{ color: '#515c6d' }] },
];

// ─── Scoped hook ──────────────────────────────────────────────────────────────

function useTripMapData(tripId: string | null) {
  const { days, isLoading, error, fetchTrip } = useItineraryForTrip();

  useEffect(() => {
    if (tripId) fetchTrip(tripId);
  }, [tripId, fetchTrip]);

  return { days, isLoading, error };
}

// ─── Utility ──────────────────────────────────────────────────────────────────

function formatTime(timeStr: string | null): string {
  if (!timeStr) return '';
  try {
    const [h, m] = timeStr.split(':');
    const hour = parseInt(h, 10);
    if (hour < 12) return `${h}:${m} AM`;
    if (hour === 12) return `12:${m} PM`;
    return `${String(hour - 12).padStart(2, '0')}:${m} PM`;
  } catch {
    return timeStr;
  }
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface InlineDayMapProps {
  tripId: string | null;
  activeDayNumber?: number | null;
  onDayChange?: (dayNumber: number) => void;
  isDark: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

const InlineDayMap: React.FC<InlineDayMapProps> = ({
  tripId,
  activeDayNumber,
  onDayChange,
  isDark,
}) => {
  const [activeIdx, setActiveIdx]   = useState(0);
  const [isMapReady, setIsMapReady] = useState(false);

  const mapRef      = useRef<google.maps.Map | null>(null);
  const markersRef  = useRef<google.maps.Marker[]>([]);
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const clusterRef  = useRef<MarkerClusterer | null>(null);
  const infoWinRef  = useRef<google.maps.InfoWindow | null>(null);
  const tripIdRef   = useRef(tripId);
  const sessionRestoredRef = useRef(false);

  const { days, isLoading } = useTripMapData(tripId);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '',
    libraries: LIBRARIES,
  });

  // Keep tripIdRef current for the stable map-idle listener
  useEffect(() => { tripIdRef.current = tripId; }, [tripId]);

  // Reset session-restored flag when tripId changes
  useEffect(() => { sessionRestoredRef.current = false; }, [tripId]);

  // Restore last-viewed day from session (only if parent doesn't control it)
  useEffect(() => {
    if (days.length === 0 || sessionRestoredRef.current) return;
    sessionRestoredRef.current = true;
    if (activeDayNumber != null) return;
    const saved = loadMapState('planSection');
    if (saved?.tripId === tripId && saved.dayIdx != null) {
      setActiveIdx(Math.min(saved.dayIdx, days.length - 1));
    }
  }, [days, tripId, activeDayNumber]);

  // Sync parent-controlled day selection
  useEffect(() => {
    if (activeDayNumber == null || days.length === 0) return;
    const idx = days.findIndex(d => d.day_number === activeDayNumber);
    if (idx >= 0) setActiveIdx(idx);
  }, [activeDayNumber, days]);

  // Persist day selection to session
  useEffect(() => {
    if (!tripId || days.length === 0) return;
    saveMapState('planSection', { tripId, dayIdx: activeIdx });
  }, [activeIdx, tripId, days.length]);

  // ── Map lifecycle ────────────────────────────────────────────────────────────

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current  = map;
    infoWinRef.current = new google.maps.InfoWindow();

    // Persist zoom + center on each map idle event
    map.addListener('idle', () => {
      const tId = tripIdRef.current;
      if (!tId) return;
      const center = map.getCenter()?.toJSON();
      const zoom   = map.getZoom();
      if (center && zoom != null) {
        saveMapState('planSection', { tripId: tId, center, zoom });
      }
    });

    setIsMapReady(true);
  }, []);

  const onMapUnmount = useCallback(() => {
    clusterRef.current?.clearMarkers();
    clusterRef.current = null;
    polylineRef.current?.setMap(null);
    polylineRef.current = null;
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];
    mapRef.current = null;
    setIsMapReady(false);
  }, []);

  // ── Rebuild markers + route + cluster on day / map change ────────────────────

  useEffect(() => {
    if (!isMapReady || !mapRef.current) return;

    // Clear previous
    clusterRef.current?.clearMarkers();
    clusterRef.current = null;
    polylineRef.current?.setMap(null);
    polylineRef.current = null;
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];
    infoWinRef.current?.close();

    const currentDay = days[activeIdx];
    if (!currentDay) {
      mapRef.current.setCenter(BALKAN_CENTER);
      mapRef.current.setZoom(7);
      return;
    }

    const mappable = currentDay.items.filter(i => i.coords !== null);
    if (mappable.length === 0) {
      mapRef.current.setCenter(BALKAN_CENTER);
      mapRef.current.setZoom(7);
      return;
    }

    const iw     = infoWinRef.current ?? new google.maps.InfoWindow();
    if (!infoWinRef.current) infoWinRef.current = iw;
    const bounds = new google.maps.LatLngBounds();
    const newMarkers: google.maps.Marker[] = [];

    mappable.forEach((item, i) => {
      const pos  = { lat: item.coords!.lat, lng: item.coords!.lon };
      const fill = ITEM_TYPE_COLORS[item.item_type?.toLowerCase()] ?? '#0ea5e9';

      // Marker without `map` — clusterer controls visibility
      const marker = new google.maps.Marker({
        position: pos,
        title: item.title,
        label: {
          text: String(i + 1),
          color: '#ffffff',
          fontWeight: 'bold',
          fontSize: '10px',
        },
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 11,
          fillColor: fill,
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
      });

      marker.addListener('click', () => {
        const html = `
          <div style="padding:6px 8px;max-width:200px;font-family:system-ui,sans-serif">
            <div style="font-weight:700;font-size:12px;color:#0f172a;margin-bottom:2px">${item.title}</div>
            ${item.description
              ? `<div style="font-size:11px;color:#64748b;line-height:1.45">
                   ${item.description.slice(0, 100)}${item.description.length > 100 ? '…' : ''}
                 </div>`
              : ''}
            ${item.start_time
              ? `<div style="font-size:11px;color:#94a3b8;margin-top:3px">${formatTime(item.start_time)}</div>`
              : ''}
          </div>`;
        iw.setContent(html);
        iw.open(mapRef.current!, marker);
      });

      newMarkers.push(marker);
      bounds.extend(pos);
    });

    // Clusterer manages map visibility of individual markers
    clusterRef.current = new MarkerClusterer({ map: mapRef.current!, markers: newMarkers });
    markersRef.current = newMarkers;

    // Route polyline connecting locations in itinerary order
    if (mappable.length > 1) {
      polylineRef.current = new google.maps.Polyline({
        path:          mappable.map(i => ({ lat: i.coords!.lat, lng: i.coords!.lon })),
        geodesic:      true,
        strokeColor:   '#0ea5e9',
        strokeOpacity: 0.55,
        strokeWeight:  2.5,
        map:           mapRef.current!,
      });
    }

    // Restore saved zoom/center if available for this trip + day
    const saved = loadMapState('planSection');
    if (
      saved?.tripId === tripIdRef.current &&
      saved.dayIdx === activeIdx &&
      saved.zoom != null &&
      saved.center
    ) {
      mapRef.current.setCenter(saved.center);
      mapRef.current.setZoom(saved.zoom);
    } else if (mappable.length === 1) {
      mapRef.current.setCenter(bounds.getCenter());
      mapRef.current.setZoom(14);
    } else {
      mapRef.current.fitBounds(bounds, 40);
    }

  }, [isMapReady, activeIdx, days]);

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const handleDayTab = (idx: number) => {
    setActiveIdx(idx);
    if (days[idx]) onDayChange?.(days[idx].day_number);
  };

  const activeDay      = days[activeIdx];
  const mappableCount  = activeDay?.items.filter(i => i.coords !== null).length ?? 0;
  const noCoords       = isMapReady && !!activeDay && mappableCount === 0;

  // ── Style helpers ─────────────────────────────────────────────────────────────

  const base      = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100';
  const divider   = isDark ? 'border-slate-700' : 'border-slate-100';
  const sub       = isDark ? 'text-slate-400' : 'text-slate-500';

  // ── Placeholder (no trip loaded yet) ─────────────────────────────────────────

  if (!tripId) {
    return (
      <div className={`rounded-2xl border ${base} h-120 flex flex-col items-center justify-center p-6 text-center`}>
        <MapPin size={30} className={`mb-3 ${sub}`} />
        <p className={`text-sm font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
          Map will appear here
        </p>
        <p className={`text-xs mt-1 ${sub}`}>
          Generate a trip to visualise locations on the map
        </p>
      </div>
    );
  }

  // ── Loading skeleton ──────────────────────────────────────────────────────────

  if (isLoading && days.length === 0) {
    return (
      <div className={`rounded-2xl border ${base} h-120 flex items-center justify-center`}>
        <div className="w-7 h-7 border-2 border-[#0ea5e9] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── Empty state ───────────────────────────────────────────────────────────────

  if (!isLoading && days.length === 0) {
    return (
      <div className={`rounded-2xl border ${base} h-120 flex flex-col items-center justify-center p-6 text-center`}>
        <MapPin size={24} className={`mb-2 ${sub}`} />
        <p className={`text-sm ${sub}`}>No itinerary data yet</p>
      </div>
    );
  }

  // ── Main map view ─────────────────────────────────────────────────────────────

  return (
    <div className={`rounded-2xl border overflow-hidden ${base} flex flex-col h-85 sm:h-120`}>

      {/* Day tabs */}
      <div className={`flex items-center gap-1 px-3 py-2 border-b shrink-0 overflow-x-auto ${divider}`}
           style={{ scrollbarWidth: 'none' }}>
        {days.map((day, idx) => (
          <button
            key={day.id}
            onClick={() => handleDayTab(idx)}
            className={`shrink-0 px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
              idx === activeIdx
                ? 'bg-[#0ea5e9] text-white shadow-sm'
                : isDark
                ? 'text-slate-400 hover:bg-slate-700'
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            Day {day.day_number}
          </button>
        ))}
      </div>

      {/* Map area */}
      <div className="flex-1 relative min-h-0">
        {!isLoaded && (
          <div className={`absolute inset-0 flex items-center justify-center ${isDark ? 'bg-slate-800' : 'bg-slate-50'}`}>
            <div className="w-7 h-7 border-2 border-[#0ea5e9] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {isLoaded && (
          <GoogleMap
            mapContainerStyle={MAP_CONTAINER}
            center={BALKAN_CENTER}
            zoom={7}
            onLoad={onMapLoad}
            onUnmount={onMapUnmount}
            options={{
              zoomControl:       true,
              streetViewControl: false,
              mapTypeControl:    false,
              fullscreenControl: false,
              styles:            isDark ? (DARK_MAP_STYLE as google.maps.MapTypeStyle[]) : undefined,
            }}
          />
        )}

        {/* No-coordinates overlay */}
        {noCoords && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className={`rounded-xl px-4 py-3 border text-center shadow-lg ${
              isDark ? 'bg-slate-700/95 border-slate-600' : 'bg-white/95 border-slate-200'
            }`}>
              <MapPin size={18} className={`mx-auto mb-1 ${sub}`} />
              <p className={`text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                No GPS data for Day {activeDay?.day_number}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Info strip */}
      {activeDay && (
        <div className={`px-4 py-2 shrink-0 border-t ${divider}`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs truncate ${sub}`}>{activeDay.title}</span>
            <span className={`text-xs font-semibold shrink-0 ml-2 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              {mappableCount} pin{mappableCount !== 1 ? 's' : ''}
              {activeDay.items.length > mappableCount && (
                <span className={`font-normal ml-1 ${sub}`}>
                  / {activeDay.items.length}
                </span>
              )}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default InlineDayMap;
