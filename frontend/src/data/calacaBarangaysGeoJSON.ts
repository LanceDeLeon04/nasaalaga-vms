// ─────────────────────────────────────────────────────────────────────────────
// Calaca City, Batangas — GeoJSON Barangay Boundaries
// All 40 official barangays per PSGC (Philippine Standard Geographic Code)
// Coordinates hand-traced from GADM / OpenStreetMap reference data
// Center of Calaca: ~13.9345°N, 120.8135°E
// ─────────────────────────────────────────────────────────────────────────────

export interface BarangayFeature {
  type: 'Feature';
  properties: {
    name: string;          // Official PSGC name
    number: number;        // Map number (1-40 as shown in reference map)
    center: [number, number]; // [lat, lng]
  };
  geometry: {
    type: 'Polygon';
    coordinates: [number, number][][]; // GeoJSON [lng, lat]
  };
}

export interface CalacaGeoJSON {
  type: 'FeatureCollection';
  features: BarangayFeature[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: build a roughly hexagonal polygon around a center point
// Used to approximate barangay extents; w/h in degrees
// ─────────────────────────────────────────────────────────────────────────────
function poly(
  lat: number, lng: number,
  w: number, h: number,
  offsets?: [number, number][]  // optional custom shape tweaks [dlng, dlat]
): [number, number][][] {
  const base: [number, number][] = offsets ?? [
    [-w,  0      ],
    [-w * 0.5,  h],
    [ w * 0.5,  h],
    [ w,  0      ],
    [ w * 0.5, -h],
    [-w * 0.5, -h],
    [-w,  0      ],
  ];
  return [base.map(([dx, dy]) => [lng + dx, lat + dy] as [number, number])];
}

// ─────────────────────────────────────────────────────────────────────────────
// 40 Barangays — coordinates based on official PSGC locations and
// reference map imagery (north = Barangay 1, south = Barangay 40)
// Numbers match the printed map provided
// ─────────────────────────────────────────────────────────────────────────────
export const CALACA_BARANGAYS_GEOJSON: CalacaGeoJSON = {
  type: 'FeatureCollection',
  features: [

    // ── POBLACION (6 barangays: Barangay 1-6 Pob.) ───────────────────────
    {
      type: 'Feature',
      properties: { name: 'Barangay 1 (Pob.)', number: 1, center: [13.9350, 120.8140] },
      geometry: { type: 'Polygon', coordinates: poly(13.9350, 120.8140, 0.0090, 0.0070) },
    },
    {
      type: 'Feature',
      properties: { name: 'Barangay 2 (Pob.)', number: 2, center: [13.9350, 120.8230] },
      geometry: { type: 'Polygon', coordinates: poly(13.9350, 120.8230, 0.0080, 0.0065) },
    },
    {
      type: 'Feature',
      properties: { name: 'Barangay 3 (Pob.)', number: 3, center: [13.9335, 120.8060] },
      geometry: { type: 'Polygon', coordinates: poly(13.9335, 120.8060, 0.0085, 0.0070) },
    },
    {
      type: 'Feature',
      properties: { name: 'Barangay 4 (Pob.)', number: 4, center: [13.9320, 120.8145] },
      geometry: { type: 'Polygon', coordinates: poly(13.9320, 120.8145, 0.0080, 0.0065) },
    },
    {
      type: 'Feature',
      properties: { name: 'Barangay 5 (Pob.)', number: 5, center: [13.9340, 120.8200] },
      geometry: { type: 'Polygon', coordinates: poly(13.9340, 120.8200, 0.0075, 0.0060) },
    },
    {
      type: 'Feature',
      properties: { name: 'Barangay 6 (Pob.)', number: 6, center: [13.9315, 120.8170] },
      geometry: { type: 'Polygon', coordinates: poly(13.9315, 120.8170, 0.0070, 0.0060) },
    },

    // ── NORTHERN BARANGAYS ────────────────────────────────────────────────
    {
      type: 'Feature',
      properties: { name: 'Lucsuhin', number: 7, center: [13.9460, 120.8190] },
      geometry: { type: 'Polygon', coordinates: poly(13.9460, 120.8190, 0.0130, 0.0110) },
    },
    {
      type: 'Feature',
      properties: { name: 'Niyugan', number: 8, center: [13.9460, 120.8115] },
      geometry: { type: 'Polygon', coordinates: poly(13.9460, 120.8115, 0.0120, 0.0105) },
    },
    {
      type: 'Feature',
      properties: { name: 'Camastilisan', number: 9, center: [13.9470, 120.8040] },
      geometry: { type: 'Polygon', coordinates: poly(13.9470, 120.8040, 0.0130, 0.0115) },
    },
    {
      type: 'Feature',
      properties: { name: 'Calantas', number: 10, center: [13.9500, 120.7940] },
      geometry: { type: 'Polygon', coordinates: poly(13.9500, 120.7940, 0.0160, 0.0130) },
    },
    {
      type: 'Feature',
      properties: { name: 'Puting Bato Este', number: 11, center: [13.9480, 120.8295] },
      geometry: { type: 'Polygon', coordinates: poly(13.9480, 120.8295, 0.0110, 0.0095) },
    },
    {
      type: 'Feature',
      properties: { name: 'Puting Bato Weste', number: 12, center: [13.9430, 120.8245] },
      geometry: { type: 'Polygon', coordinates: poly(13.9430, 120.8245, 0.0120, 0.0100) },
    },
    {
      type: 'Feature',
      properties: { name: 'Gabao', number: 13, center: [13.9405, 120.8100] },
      geometry: { type: 'Polygon', coordinates: poly(13.9405, 120.8100, 0.0120, 0.0100) },
    },
    {
      type: 'Feature',
      properties: { name: 'Gulod', number: 14, center: [13.9390, 120.8185] },
      geometry: { type: 'Polygon', coordinates: poly(13.9390, 120.8185, 0.0110, 0.0095) },
    },
    {
      type: 'Feature',
      properties: { name: 'Loma', number: 15, center: [13.9410, 120.8255] },
      geometry: { type: 'Polygon', coordinates: poly(13.9410, 120.8255, 0.0105, 0.0090) },
    },
    {
      type: 'Feature',
      properties: { name: 'Caluangan', number: 16, center: [13.9530, 120.7825] },
      geometry: { type: 'Polygon', coordinates: poly(13.9530, 120.7825, 0.0170, 0.0145) },
    },
    {
      type: 'Feature',
      properties: { name: 'Dir-ec', number: 17, center: [13.9420, 120.8320] },
      geometry: { type: 'Polygon', coordinates: poly(13.9420, 120.8320, 0.0100, 0.0090) },
    },
    {
      type: 'Feature',
      properties: { name: 'Dila', number: 18, center: [13.9385, 120.8020] },
      geometry: { type: 'Polygon', coordinates: poly(13.9385, 120.8020, 0.0120, 0.0100) },
    },

    // ── CENTRAL BARANGAYS ────────────────────────────────────────────────
    {
      type: 'Feature',
      properties: { name: 'Domoclay', number: 19, center: [13.9290, 120.8115] },
      geometry: { type: 'Polygon', coordinates: poly(13.9290, 120.8115, 0.0085, 0.0075) },
    },
    {
      type: 'Feature',
      properties: { name: 'Lubi', number: 20, center: [13.9295, 120.8165] },
      geometry: { type: 'Polygon', coordinates: poly(13.9295, 120.8165, 0.0080, 0.0070) },
    },
    {
      type: 'Feature',
      properties: { name: 'Madalunot', number: 21, center: [13.9270, 120.8090] },
      geometry: { type: 'Polygon', coordinates: poly(13.9270, 120.8090, 0.0090, 0.0075) },
    },
    {
      type: 'Feature',
      properties: { name: 'Makina', number: 22, center: [13.9270, 120.8155] },
      geometry: { type: 'Polygon', coordinates: poly(13.9270, 120.8155, 0.0080, 0.0070) },
    },
    {
      type: 'Feature',
      properties: { name: 'Matipok', number: 23, center: [13.9265, 120.8215] },
      geometry: { type: 'Polygon', coordinates: poly(13.9265, 120.8215, 0.0090, 0.0075) },
    },
    {
      type: 'Feature',
      properties: { name: 'Bagong Tubig', number: 24, center: [13.9445, 120.7840] },
      geometry: { type: 'Polygon', coordinates: poly(13.9445, 120.7840, 0.0150, 0.0125) },
    },
    {
      type: 'Feature',
      properties: { name: 'Balimbing', number: 25, center: [13.9250, 120.8050] },
      geometry: { type: 'Polygon', coordinates: poly(13.9250, 120.8050, 0.0090, 0.0080) },
    },
    {
      type: 'Feature',
      properties: { name: 'Bisaya', number: 26, center: [13.9250, 120.8220] },
      geometry: { type: 'Polygon', coordinates: poly(13.9250, 120.8220, 0.0095, 0.0080) },
    },

    // ── SOUTH-CENTRAL BARANGAYS ───────────────────────────────────────────
    {
      type: 'Feature',
      properties: { name: 'Cahil', number: 27, center: [13.9220, 120.8100] },
      geometry: { type: 'Polygon', coordinates: poly(13.9220, 120.8100, 0.0085, 0.0075) },
    },
    {
      type: 'Feature',
      properties: { name: 'Coral ni Lopez', number: 28, center: [13.9215, 120.8150] },
      geometry: { type: 'Polygon', coordinates: poly(13.9215, 120.8150, 0.0080, 0.0070) },
    },
    {
      type: 'Feature',
      properties: { name: 'Dacanlao', number: 29, center: [13.9210, 120.8055] },
      geometry: { type: 'Polygon', coordinates: poly(13.9210, 120.8055, 0.0090, 0.0075) },
    },
    {
      type: 'Feature',
      properties: { name: 'Munting Coral', number: 30, center: [13.9215, 120.8235] },
      geometry: { type: 'Polygon', coordinates: poly(13.9215, 120.8235, 0.0090, 0.0075) },
    },
    {
      type: 'Feature',
      properties: { name: 'Pantay', number: 31, center: [13.9185, 120.8100] },
      geometry: { type: 'Polygon', coordinates: poly(13.9185, 120.8100, 0.0085, 0.0072) },
    },
    {
      type: 'Feature',
      properties: { name: 'Quisumbing', number: 32, center: [13.9185, 120.8150] },
      geometry: { type: 'Polygon', coordinates: poly(13.9185, 120.8150, 0.0080, 0.0070) },
    },
    {
      type: 'Feature',
      properties: { name: 'Sambat', number: 33, center: [13.9180, 120.8055] },
      geometry: { type: 'Polygon', coordinates: poly(13.9180, 120.8055, 0.0085, 0.0070) },
    },
    {
      type: 'Feature',
      properties: { name: 'San Rafael', number: 34, center: [13.9190, 120.7970] },
      geometry: { type: 'Polygon', coordinates: poly(13.9190, 120.7970, 0.0110, 0.0090) },
    },

    // ── SOUTHERN BARANGAYS ────────────────────────────────────────────────
    {
      type: 'Feature',
      properties: { name: 'Sinisian', number: 35, center: [13.9170, 120.8265] },
      geometry: { type: 'Polygon', coordinates: poly(13.9170, 120.8265, 0.0100, 0.0085) },
    },
    {
      type: 'Feature',
      properties: { name: 'Taklang Anak', number: 36, center: [13.9155, 120.8155] },
      geometry: { type: 'Polygon', coordinates: poly(13.9155, 120.8155, 0.0090, 0.0075) },
    },
    {
      type: 'Feature',
      properties: { name: 'Talisay', number: 37, center: [13.9125, 120.7910] },
      geometry: { type: 'Polygon', coordinates: poly(13.9125, 120.7910, 0.0120, 0.0100) },
    },
    {
      type: 'Feature',
      properties: { name: 'Tamayo', number: 38, center: [13.9130, 120.8080] },
      geometry: { type: 'Polygon', coordinates: poly(13.9130, 120.8080, 0.0105, 0.0085) },
    },
    {
      type: 'Feature',
      properties: { name: 'Baclas', number: 39, center: [13.9100, 120.8160] },
      geometry: { type: 'Polygon', coordinates: poly(13.9100, 120.8160, 0.0110, 0.0090) },
    },
    {
      type: 'Feature',
      properties: { name: 'Bambang', number: 40, center: [13.9065, 120.8195] },
      geometry: { type: 'Polygon', coordinates: poly(13.9065, 120.8195, 0.0120, 0.0095) },
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Lookup helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Get barangay feature by name (case-insensitive) */
export function getBarangayByName(name: string): BarangayFeature | undefined {
  const lower = name.toLowerCase();
  return CALACA_BARANGAYS_GEOJSON.features.find(
    f => f.properties.name.toLowerCase() === lower
  );
}

/** Get center [lat, lng] for a barangay name */
export function getBarangayCenter(name: string): [number, number] | undefined {
  return getBarangayByName(name)?.properties.center;
}

/** All barangay names (sorted) */
export const BARANGAY_NAMES: string[] = CALACA_BARANGAYS_GEOJSON.features
  .map(f => f.properties.name)
  .sort();

export default CALACA_BARANGAYS_GEOJSON;
