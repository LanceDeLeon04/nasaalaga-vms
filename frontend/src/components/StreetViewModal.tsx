import { useEffect, useRef, useState } from 'react';
import { X, Camera, MapPin, AlertTriangle } from 'lucide-react';

// ── GOOGLE MAPS LOADER (loaded once, cached) ────────────────────────────────

declare global {
  interface Window { google?: any; }
}

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

let googleMapsLoadPromise: Promise<void> | null = null;

function loadGoogleMaps(): Promise<void> {
  if (window.google?.maps?.StreetViewService) return Promise.resolve();
  if (googleMapsLoadPromise) return googleMapsLoadPromise;
  googleMapsLoadPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById('google-maps-sdk');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Failed to load Google Maps')));
      return;
    }
    const script = document.createElement('script');
    script.id = 'google-maps-sdk';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=streetView`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Maps'));
    document.head.appendChild(script);
  });
  return googleMapsLoadPromise;
}

// Haversine distance between two lat/lng points, in meters
function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

type Status = 'loading' | 'ready' | 'unavailable' | 'error';

interface StreetViewModalProps {
  lat: number;
  lng: number;
  title: string;
  subtitle?: string;
  onClose: () => void;
  /** Max meters between the actual site and the found panorama before we
   *  label it "nearest" instead of treating it as an exact match. */
  nearestThresholdMeters?: number;
  /** Max search radius (meters) to look for a nearby panorama. */
  searchRadiusMeters?: number;
}

export function StreetViewModal({
  lat,
  lng,
  title,
  subtitle,
  onClose,
  nearestThresholdMeters = 15,
  searchRadiusMeters = 50000,
}: StreetViewModalProps) {
  const panoRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [distance, setDistance] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    setDistance(null);

    if (!GOOGLE_MAPS_API_KEY) {
      setStatus('error');
      return;
    }

    loadGoogleMaps()
      .then(() => {
        if (cancelled) return;
        const g = window.google;
        const svService = new g.maps.StreetViewService();
        svService.getPanorama(
          {
            location: { lat, lng },
            radius: searchRadiusMeters,
            source: g.maps.StreetViewSource.OUTDOOR,
          },
          (data: any, resultStatus: string) => {
            if (cancelled) return;
            if (resultStatus === 'OK' && data?.location?.latLng && panoRef.current) {
              const foundLat = data.location.latLng.lat();
              const foundLng = data.location.latLng.lng();
              setDistance(Math.round(distanceMeters(lat, lng, foundLat, foundLng)));
              new g.maps.StreetViewPanorama(panoRef.current, {
                position: { lat: foundLat, lng: foundLng },
                pov: { heading: 0, pitch: 0 },
                zoom: 1,
                addressControl: false,
                fullscreenControl: true,
                motionTracking: false,
                motionTrackingControl: false,
              });
              setStatus('ready');
            } else {
              setStatus('unavailable');
            }
          }
        );
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, [lat, lng, searchRadiusMeters]);

  const showNearestBanner = status === 'ready' && distance !== null && distance > nearestThresholdMeters;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(15,23,42,.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: 16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 16, width: '100%', maxWidth: 720,
          overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,.3)',
        }}
      >
        {/* Header */}
        <div style={{ padding: '14px 18px', background: 'linear-gradient(135deg,#1e4080,#2B5EA6)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ color: '#fff', fontWeight: 800, fontSize: 14, margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Camera size={16} />Street View
            </p>
            <p style={{ color: 'rgba(255,255,255,.75)', fontSize: 12, margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {title}{subtitle ? ` · ${subtitle}` : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'rgba(255,255,255,.15)', border: 'none', borderRadius: '50%', width: 32, height: 32, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Nearest-site banner */}
        {showNearestBanner && (
          <div style={{ background: '#fffbeb', borderBottom: '1px solid #fde68a', padding: '8px 18px', fontSize: 12.5, color: '#92400e', display: 'flex', alignItems: 'center', gap: 6 }}>
            <MapPin size={13} style={{ flexShrink: 0 }} />
            This is the nearest streetview, {distance}m away from actual site.
          </div>
        )}

        {/* Body */}
        <div style={{ height: 420, background: '#f1f5f9', position: 'relative' }}>
          {status === 'loading' && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#9ca3af' }}>
              <div style={{ width: 32, height: 32, border: '3px solid #e5e7eb', borderTopColor: '#2B5EA6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              <p style={{ fontSize: 12.5 }}>Loading street view…</p>
            </div>
          )}
          {status === 'unavailable' && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#9ca3af', padding: 20, textAlign: 'center' }}>
              <AlertTriangle size={28} />
              <p style={{ fontSize: 13, fontWeight: 700, color: '#6b7280', margin: 0 }}>No Street View imagery found near this location.</p>
              <p style={{ fontSize: 11.5, color: '#9ca3af', margin: 0 }}>Searched within {(searchRadiusMeters / 1000).toFixed(0)}km of the pin.</p>
            </div>
          )}
          {status === 'error' && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#9ca3af', padding: 20, textAlign: 'center' }}>
              <AlertTriangle size={28} />
              <p style={{ fontSize: 13, fontWeight: 700, color: '#6b7280', margin: 0 }}>Street View couldn't be loaded.</p>
              <p style={{ fontSize: 11.5, color: '#9ca3af', margin: 0 }}>Check that VITE_GOOGLE_MAPS_API_KEY is configured.</p>
            </div>
          )}
          <div ref={panoRef} style={{ width: '100%', height: '100%', display: status === 'ready' ? 'block' : 'none' }} />
        </div>
      </div>
    </div>
  );
}
