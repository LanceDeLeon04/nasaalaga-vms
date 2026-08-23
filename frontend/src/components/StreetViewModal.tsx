import { useEffect, useRef, useState } from 'react';
import { X, Camera, MapPin, AlertTriangle, ZoomIn, ZoomOut, Move } from 'lucide-react';

// ── MAPILLARY STREET-LEVEL IMAGERY ──────────────────────────────────────────
// Free alternative to Google Street View: Mapillary's API is free to use
// with a personal access token (no billing account / credit card required).
// Get one at https://www.mapillary.com/dashboard/developers — create an app,
// copy its "Client Token" (starts with "MLY|"), and set it as
// VITE_MAPILLARY_ACCESS_TOKEN in your .env file.
const MAPILLARY_TOKEN = import.meta.env.VITE_MAPILLARY_ACCESS_TOKEN;
const GRAPH_URL = 'https://graph.mapillary.com/images';

interface MapillaryImage {
  id: string;
  lat: number;
  lng: number;
  thumbUrl: string;
  isPano: boolean;
  capturedAt?: number;
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

// Build a bounding box (minLon,minLat,maxLon,maxLat) around a center point
// for a given half-width radius in meters.
function bboxAround(lat: number, lng: number, radiusMeters: number) {
  const latDelta = radiusMeters / 111320;
  const lngDelta = radiusMeters / (111320 * Math.cos((lat * Math.PI) / 180) || 1);
  return [lng - lngDelta, lat - latDelta, lng + lngDelta, lat + latDelta].join(',');
}

// Search expanding radii until imagery is found nearby, so dense urban pins
// resolve fast while rural pins still get a "nearest available" result.
async function findNearestImage(lat: number, lng: number, maxRadiusMeters: number): Promise<MapillaryImage | null> {
  const radiiSteps = [150, 500, 1500, 5000, 15000, maxRadiusMeters].filter((r, i, arr) => arr.indexOf(r) === i && r <= maxRadiusMeters);

  for (const radius of radiiSteps) {
    const bbox = bboxAround(lat, lng, radius);
    const url = `${GRAPH_URL}?access_token=${MAPILLARY_TOKEN}&fields=id,computed_geometry,geometry,thumb_2048_url,is_pano,captured_at&bbox=${bbox}&limit=50`;
    const res = await fetch(url);
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) throw new Error('unauthorized');
      continue;
    }
    const json = await res.json();
    const features: any[] = json?.data || [];
    if (!features.length) continue;

    let nearest: MapillaryImage | null = null;
    let nearestDist = Infinity;
    for (const f of features) {
      const coords = f.computed_geometry?.coordinates || f.geometry?.coordinates;
      if (!coords) continue;
      const [imgLng, imgLat] = coords;
      const d = distanceMeters(lat, lng, imgLat, imgLng);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = {
          id: f.id,
          lat: imgLat,
          lng: imgLng,
          thumbUrl: f.thumb_2048_url,
          isPano: !!f.is_pano,
          capturedAt: f.captured_at,
        };
      }
    }
    if (nearest) return nearest;
  }
  return null;
}

type Status = 'loading' | 'ready' | 'unavailable' | 'error' | 'unauthorized';

interface StreetViewModalProps {
  lat: number;
  lng: number;
  title: string;
  subtitle?: string;
  onClose: () => void;
  /** Max meters between the actual site and the found image before we
   *  label it "nearest" instead of treating it as an exact match. */
  nearestThresholdMeters?: number;
  /** Max search radius (meters) to look for nearby imagery. */
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
  const [status, setStatus] = useState<Status>('loading');
  const [image, setImage] = useState<MapillaryImage | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);

  // Drag-to-pan state for 360 panoramas
  const dragRef = useRef<{ dragging: boolean; startX: number; startPan: number }>({ dragging: false, startX: 0, startPan: 0 });
  const [panX, setPanX] = useState(50); // percent, for panorama background-position

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    setImage(null);
    setDistance(null);
    setZoom(1);
    setPanX(50);

    if (!MAPILLARY_TOKEN) {
      setStatus('error');
      return;
    }

    findNearestImage(lat, lng, searchRadiusMeters)
      .then(found => {
        if (cancelled) return;
        if (found) {
          setImage(found);
          setDistance(Math.round(distanceMeters(lat, lng, found.lat, found.lng)));
          setStatus('ready');
        } else {
          setStatus('unavailable');
        }
      })
      .catch(err => {
        if (cancelled) return;
        setStatus(err?.message === 'unauthorized' ? 'unauthorized' : 'error');
      });

    return () => {
      cancelled = true;
    };
  }, [lat, lng, searchRadiusMeters]);

  const onDragStart = (clientX: number) => {
    if (!image?.isPano) return;
    dragRef.current = { dragging: true, startX: clientX, startPan: panX };
  };
  const onDragMove = (clientX: number) => {
    if (!dragRef.current.dragging) return;
    const dx = clientX - dragRef.current.startX;
    setPanX(p => {
      let next = dragRef.current.startPan - (dx / 6);
      if (next < 0) next += 100;
      if (next > 100) next -= 100;
      return next;
    });
  };
  const onDragEnd = () => { dragRef.current.dragging = false; };

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
          background: '#fff', borderRadius: 16, width: '100%', maxWidth: 760,
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
        <div
          style={{ height: 440, background: '#111827', position: 'relative', overflow: 'hidden', cursor: image?.isPano ? 'grab' : 'default', userSelect: 'none' }}
          onMouseDown={e => onDragStart(e.clientX)}
          onMouseMove={e => onDragMove(e.clientX)}
          onMouseUp={onDragEnd}
          onMouseLeave={onDragEnd}
          onTouchStart={e => onDragStart(e.touches[0].clientX)}
          onTouchMove={e => onDragMove(e.touches[0].clientX)}
          onTouchEnd={onDragEnd}
        >
          {status === 'loading' && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#9ca3af' }}>
              <div style={{ width: 32, height: 32, border: '3px solid #374151', borderTopColor: '#60A85C', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              <p style={{ fontSize: 12.5 }}>Loading street view…</p>
            </div>
          )}
          {status === 'unavailable' && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#9ca3af', padding: 20, textAlign: 'center' }}>
              <AlertTriangle size={28} />
              <p style={{ fontSize: 13, fontWeight: 700, color: '#e5e7eb', margin: 0 }}>No street-level imagery found near this location.</p>
              <p style={{ fontSize: 11.5, color: '#9ca3af', margin: 0 }}>Searched within {(searchRadiusMeters / 1000).toFixed(0)}km of the pin.</p>
            </div>
          )}
          {status === 'unauthorized' && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#9ca3af', padding: 20, textAlign: 'center' }}>
              <AlertTriangle size={28} />
              <p style={{ fontSize: 13, fontWeight: 700, color: '#e5e7eb', margin: 0 }}>Street View access token was rejected.</p>
              <p style={{ fontSize: 11.5, color: '#9ca3af', margin: 0 }}>Double-check VITE_MAPILLARY_ACCESS_TOKEN is a valid Mapillary client token.</p>
            </div>
          )}
          {status === 'error' && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#9ca3af', padding: 20, textAlign: 'center' }}>
              <AlertTriangle size={28} />
              <p style={{ fontSize: 13, fontWeight: 700, color: '#e5e7eb', margin: 0 }}>Street View couldn't be loaded.</p>
              <p style={{ fontSize: 11.5, color: '#9ca3af', margin: 0 }}>
                {MAPILLARY_TOKEN
                  ? 'Please check your connection and try again.'
                  : 'Set VITE_MAPILLARY_ACCESS_TOKEN in your .env — get a free token at mapillary.com/dashboard/developers.'}
              </p>
            </div>
          )}

          {status === 'ready' && image && (
            image.isPano ? (
              <div
                style={{
                  position: 'absolute', inset: 0,
                  backgroundImage: `url(${image.thumbUrl})`,
                  backgroundRepeat: 'repeat-x',
                  backgroundSize: `${220 * zoom}% 100%`,
                  backgroundPosition: `${panX}% center`,
                }}
              />
            ) : (
              <img
                src={image.thumbUrl}
                alt="Nearest street-level view"
                draggable={false}
                style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${zoom})`, transformOrigin: 'center' }}
              />
            )
          )}

          {status === 'ready' && image && (
            <>
              <div style={{ position: 'absolute', bottom: 12, right: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <button onClick={() => setZoom(z => Math.min(2.5, z + 0.25))} style={zoomBtnStyle}><ZoomIn size={15} /></button>
                <button onClick={() => setZoom(z => Math.max(1, z - 0.25))} style={zoomBtnStyle}><ZoomOut size={15} /></button>
              </div>
              {image.isPano && (
                <div style={{ position: 'absolute', bottom: 12, left: 12, display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(0,0,0,.55)', color: '#fff', fontSize: 10.5, fontWeight: 600, padding: '5px 9px', borderRadius: 999 }}>
                  <Move size={11} />Drag to look around
                </div>
              )}
              <div style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(0,0,0,.5)', color: '#e5e7eb', fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 999 }}>
                via Mapillary{image.capturedAt ? ` · ${new Date(image.capturedAt).getFullYear()}` : ''}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const zoomBtnStyle: React.CSSProperties = {
  width: 30, height: 30, borderRadius: 8, border: 'none',
  background: 'rgba(0,0,0,.55)', color: '#fff', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};
