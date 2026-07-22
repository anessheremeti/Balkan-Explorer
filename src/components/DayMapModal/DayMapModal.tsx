import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, MapPin, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { GoogleMap, useJsApiLoader } from '@react-google-maps/api';
import { MarkerClusterer } from '@googlemaps/markerclusterer';
import type { ItineraryDayView } from '../../hooks/useItineraryForTrip';
import { saveMapState } from '../../hooks/useSessionMapState';

// ─── Constants ────────────────────────────────────────────────────────────────

const LIBRARIES: ('maps' | 'places')[] = ['maps', 'places'];

const MAP_CONTAINER_STYLE = { width: '100%', height: '100%' };

// Balkan region center — fallback when no coords exist
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
  { featureType: 'poi',                elementType: 'labels.text.fill',   stylers: [{ color: '#94a3b8' }] },
  { featureType: 'poi.park',           elementType: 'geometry',            stylers: [{ color: '#263c3f' }] },
  { featureType: 'road',               elementType: 'geometry',            stylers: [{ color: '#334155' }] },
  { featureType: 'road',               elementType: 'geometry.stroke',     stylers: [{ color: '#1e293b' }] },
  { featureType: 'road.highway',       elementType: 'geometry',            stylers: [{ color: '#475569' }] },
  { featureType: 'road.highway',       elementType: 'geometry.stroke',     stylers: [{ color: '#334155' }] },
  { featureType: 'road.highway',       elementType: 'labels.text.fill',    stylers: [{ color: '#cbd5e1' }] },
  { featureType: 'water',              elementType: 'geometry',            stylers: [{ color: '#0f172a' }] },
  { featureType: 'water',              elementType: 'labels.text.fill',    stylers: [{ color: '#515c6d' }] },
];

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

interface DayMapModalProps {
  tripId?: string;
  days: ItineraryDayView[];
  initialDayIndex: number;
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
  /** Session-state scope to persist trip/day under (defaults to MyTravels behaviour) */
  stateScope?: 'planSection' | 'myTravels';
  /** Notifies the parent when the user switches day inside the modal */
  onDayChange?: (dayIndex: number) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

const DayMapModal: React.FC<DayMapModalProps> = ({
  tripId,
  days,
  initialDayIndex,
  isOpen,
  onClose,
  isDark,
  stateScope = 'myTravels',
  onDayChange,
}) => {
  const [activeIdx, setActiveIdx]   = useState(initialDayIndex);

  const changeDay = (idx: number) => {
    setActiveIdx(idx);
    onDayChange?.(idx);
  };
  const [isMapReady, setIsMapReady] = useState(false);

  // Encode selection as { dayIdx, id } so it auto-clears when the day changes
  // without needing setState inside an effect.
  const [selectedEntry, setSelectedEntry] = useState<{ dayIdx: number; id: string } | null>(null);
  const selectedItemId = selectedEntry?.dayIdx === activeIdx ? selectedEntry.id : null;

  const mapRef      = useRef<google.maps.Map | null>(null);
  const markersRef  = useRef<google.maps.Marker[]>([]);
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const clusterRef  = useRef<MarkerClusterer | null>(null);
  const infoWinRef  = useRef<google.maps.InfoWindow | null>(null);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '',
    libraries: LIBRARIES,
  });

  // Re-sync to the requested day each time the modal opens (state persists across closes)
  useEffect(() => {
    if (isOpen) setActiveIdx(initialDayIndex);
  }, [isOpen, initialDayIndex]);

  // Persist which trip / day the modal is open for (session restore in MyTravels)
  useEffect(() => {
    if (!isOpen || !tripId) return;
    saveMapState(stateScope, { tripId, dayIdx: activeIdx });
  }, [isOpen, tripId, activeIdx, stateScope]);

  // ── Map lifecycle ──────────────────────────────────────────────────────────

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    infoWinRef.current = new google.maps.InfoWindow();
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

  // ── Rebuild markers + route + cluster whenever the active day changes ───────

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
    if (!currentDay) return;

    const mappable = currentDay.items.filter(item => item.coords !== null);

    if (mappable.length === 0) {
      mapRef.current.setCenter(BALKAN_CENTER);
      mapRef.current.setZoom(7);
      return;
    }

    const bounds = new google.maps.LatLngBounds();
    const iw     = infoWinRef.current ?? new google.maps.InfoWindow();
    if (!infoWinRef.current) infoWinRef.current = iw;

    const newMarkers: google.maps.Marker[] = [];

    mappable.forEach((item, i) => {
      const pos  = { lat: item.coords!.lat, lng: item.coords!.lon };
      const fill = ITEM_TYPE_COLORS[item.item_type?.toLowerCase()] ?? '#0ea5e9';

      // No `map` property — clusterer controls visibility
      const marker = new google.maps.Marker({
        position: pos,
        title: item.title,
        label: {
          text: String(i + 1),
          color: '#ffffff',
          fontWeight: 'bold',
          fontSize: '11px',
        },
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 13,
          fillColor: fill,
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
      });

      marker.addListener('click', () => {
        setSelectedEntry({ dayIdx: activeIdx, id: item.id });
        const html = `
          <div style="padding:8px 10px;max-width:220px;font-family:system-ui,sans-serif">
            <div style="font-weight:700;font-size:13px;color:#0f172a;margin-bottom:4px">${item.title}</div>
            ${item.description
              ? `<div style="font-size:12px;color:#64748b;line-height:1.5">
                   ${item.description.slice(0, 120)}${item.description.length > 120 ? '…' : ''}
                 </div>`
              : ''}
            ${item.start_time
              ? `<div style="font-size:11px;color:#94a3b8;margin-top:4px">${formatTime(item.start_time)}</div>`
              : ''}
          </div>`;
        iw.setContent(html);
        iw.open(mapRef.current!, marker);
      });

      newMarkers.push(marker);
      bounds.extend(pos);
    });

    // Clusterer manages individual marker visibility based on zoom
    clusterRef.current = new MarkerClusterer({ map: mapRef.current!, markers: newMarkers });
    markersRef.current = newMarkers;

    // Route polyline — connects locations in itinerary order
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

    if (mappable.length === 1) {
      mapRef.current.setCenter(bounds.getCenter());
      mapRef.current.setZoom(14);
    } else {
      mapRef.current.fitBounds(bounds, 55);
    }
  }, [isMapReady, activeIdx, days]);

  // ── Derived state ──────────────────────────────────────────────────────────

  const activeDay = days[activeIdx];
  const mappable  = activeDay?.items.filter(i => i.coords !== null) ?? [];
  const noCoords  = isMapReady && mappable.length === 0;

  // Clicking a list item → zoom in (to break cluster), pan, open info window
  const handleListItemClick = (itemId: string) => {
    const day = days[activeIdx];
    if (!day) return;
    const mappableItems = day.items.filter(i => i.coords !== null);
    const idx = mappableItems.findIndex(i => i.id === itemId);
    if (idx < 0) return;
    const marker = markersRef.current[idx];
    if (marker && mapRef.current) {
      const pos = marker.getPosition();
      if (pos) {
        const currentZoom = mapRef.current.getZoom() ?? 10;
        if (currentZoom < 13) mapRef.current.setZoom(13);
        mapRef.current.panTo(pos);
        google.maps.event.trigger(marker, 'click');
      }
    }
  };

  // ── Layout helpers ─────────────────────────────────────────────────────────

  const base   = isDark ? 'bg-slate-800 text-white' : 'bg-white text-slate-900';
  const border = isDark ? 'border-slate-700' : 'border-slate-100';
  const sub    = isDark ? 'text-slate-400' : 'text-slate-500';
  const hover  = isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-50';

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-200 flex items-end sm:items-center justify-center sm:p-4">

          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/75 backdrop-blur-sm"
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, y: 48 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 48 }}
            transition={{ type: 'spring', damping: 26, stiffness: 280 }}
            className={`relative w-full sm:max-w-4xl sm:rounded-2xl overflow-hidden shadow-2xl flex flex-col ${base}`}
            style={{ height: '92dvh', maxHeight: '720px' }}
          >

            {/* ── Header: day tabs + close ───────────────────────────────── */}
            <div className={`flex items-center gap-2 px-4 py-3 border-b shrink-0 ${border}`}>
              <div className="flex items-center gap-1 overflow-x-auto flex-1 pb-px">
                {days.map((day, idx) => (
                  <button
                    key={day.id}
                    onClick={() => changeDay(idx)}
                    className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                      idx === activeIdx
                        ? 'bg-[#0ea5e9] text-white shadow-sm'
                        : `${sub} ${hover}`
                    }`}
                  >
                    Day {day.day_number}
                  </button>
                ))}
              </div>
              <button
                onClick={onClose}
                aria-label="Close map"
                className={`shrink-0 p-1.5 rounded-lg transition-colors ${sub} ${hover}`}
              >
                <X size={18} />
              </button>
            </div>

            {/* ── Day title bar ──────────────────────────────────────────── */}
            {activeDay && (
              <div className={`px-5 py-2.5 border-b shrink-0 ${border}`}>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {activeDay.title}
                  </h3>
                  {/* Only set for country-wide trips ("Albania" — all cities) */}
                  {activeDay.city && (
                    <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded ${
                      isDark ? 'bg-sky-900/40 text-sky-400' : 'bg-sky-50 text-sky-700'
                    }`}>
                      {activeDay.city}
                    </span>
                  )}
                </div>
                <p className={`text-xs mt-0.5 ${sub}`}>
                  {activeDay.date &&
                    new Date(activeDay.date).toLocaleDateString('en-US', {
                      weekday: 'long', month: 'long', day: 'numeric',
                    })
                  }
                  {activeDay.date && (mappable.length > 0) && '  ·  '}
                  {mappable.length > 0 &&
                    `${mappable.length} of ${activeDay.items.length} location${activeDay.items.length !== 1 ? 's' : ''} on map`
                  }
                </p>
              </div>
            )}

            {/* ── Body: map (left) + list (right) ───────────────────────── */}
            <div className="flex-1 flex flex-col sm:flex-row overflow-hidden">

              {/* Map */}
              <div className="flex-1 min-h-60 sm:min-h-0 relative">
                {!isLoaded && (
                  <div className={`absolute inset-0 flex items-center justify-center ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
                    <div className="w-7 h-7 border-2 border-[#0ea5e9] border-t-transparent rounded-full animate-spin" />
                  </div>
                )}

                {isLoaded && (
                  <GoogleMap
                    mapContainerStyle={MAP_CONTAINER_STYLE}
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

                {/* No-coords overlay */}
                {noCoords && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className={`rounded-2xl px-5 py-4 text-center shadow-xl border ${
                      isDark ? 'bg-slate-700/95 border-slate-600' : 'bg-white/95 border-slate-200'
                    }`}>
                      <MapPin size={22} className={`mx-auto mb-1.5 ${sub}`} />
                      <p className={`text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        No GPS coordinates for this day
                      </p>
                      <p className={`text-[11px] mt-1 ${sub}`}>
                        Locations appear here when coordinates are saved
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Location list sidebar */}
              <div className={`w-full sm:w-72 shrink-0 overflow-y-auto border-t sm:border-t-0 sm:border-l ${border}`}>
                <div className="p-3 space-y-1">
                  {(activeDay?.items ?? []).length === 0 && (
                    <p className={`text-xs text-center py-8 ${sub}`}>
                      No activities for this day
                    </p>
                  )}

                  {(activeDay?.items ?? []).map(item => {
                    const mappableItems = activeDay?.items.filter(i => i.coords !== null) ?? [];
                    const mapIdx    = mappableItems.findIndex(m => m.id === item.id);
                    const hasCoords = item.coords !== null;
                    const isSelected = item.id === selectedItemId;

                    return (
                      <button
                        key={item.id}
                        onClick={() => hasCoords && handleListItemClick(item.id)}
                        disabled={!hasCoords}
                        className={`w-full text-left rounded-xl px-3 py-2.5 transition-colors ${
                          isSelected
                            ? isDark
                              ? 'bg-sky-900/50 ring-1 ring-sky-500/60'
                              : 'bg-sky-50 ring-1 ring-sky-200'
                            : `${hover}`
                        } ${!hasCoords ? 'opacity-45 cursor-default' : 'cursor-pointer'}`}
                      >
                        <div className="flex items-start gap-2.5">
                          {/* Numbered badge */}
                          <div
                            className={`w-5 h-5 rounded-full shrink-0 flex items-center justify-center mt-0.5 text-[10px] font-bold text-white ${
                              hasCoords ? '' : isDark ? 'bg-slate-600' : 'bg-slate-300'
                            }`}
                            style={hasCoords
                              ? { backgroundColor: ITEM_TYPE_COLORS[item.item_type?.toLowerCase()] ?? '#0ea5e9' }
                              : undefined
                            }
                          >
                            {hasCoords ? mapIdx + 1 : '—'}
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className={`text-xs font-semibold truncate ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                              {item.title}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {item.start_time && (
                                <span className={`flex items-center gap-1 text-[10px] ${sub}`}>
                                  <Clock size={9} />
                                  {formatTime(item.start_time)}
                                </span>
                              )}
                              {!hasCoords && (
                                <span className={`text-[10px] ${sub}`}>no pin</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ── Mobile-only bottom day navigation ─────────────────────── */}
            <div className={`sm:hidden flex items-center justify-between px-4 py-2.5 border-t shrink-0 ${border}`}>
              <button
                onClick={() => changeDay(Math.max(0, activeIdx - 1))}
                disabled={activeIdx === 0}
                className={`flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40 ${sub} ${hover}`}
              >
                <ChevronLeft size={14} />
                Prev day
              </button>
              <span className={`text-xs ${sub}`}>
                Day {activeDay?.day_number ?? '—'} of {days.length}
              </span>
              <button
                onClick={() => changeDay(Math.min(days.length - 1, activeIdx + 1))}
                disabled={activeIdx === days.length - 1}
                className={`flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40 ${sub} ${hover}`}
              >
                Next day
                <ChevronRight size={14} />
              </button>
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default DayMapModal;
