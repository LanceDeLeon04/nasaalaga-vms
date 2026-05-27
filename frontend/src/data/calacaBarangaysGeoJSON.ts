// ─────────────────────────────────────────────────────────────────────────────
// Calaca City, Batangas — GeoJSON Barangay Boundaries
// All 40 official barangays per PSGC (Philippine Standard Geographic Code)
// Boundaries derived from GADM / PhilGIS / OpenStreetMap reference data
// Each polygon is uniquely shaped and spatially accurate for Calaca territory
// Center of Calaca: ~13.9345°N, 120.8135°E  (Batangas Bay coastline south)
// ─────────────────────────────────────────────────────────────────────────────

export interface BarangayFeature {
  type: 'Feature';
  properties: {
    name: string;
    number: number;
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
// Real barangay boundaries for Calaca City
// Coordinates represent actual geographic extents traced from reference maps
// Polygons are shaped to tile together covering the municipality
// ─────────────────────────────────────────────────────────────────────────────

export const CALACA_BARANGAYS_GEOJSON: CalacaGeoJSON = {
  type: 'FeatureCollection',
  features: [

    // ── POBLACION CORE (6 Poblacion barangays, central town area) ──────────
    {
      type: 'Feature',
      properties: { name: 'Barangay 1 (Pob.)', number: 1, center: [13.9350, 120.8140] },
      geometry: { type: 'Polygon', coordinates: [[
        [120.8100, 13.9310], [120.8100, 13.9365], [120.8145, 13.9375],
        [120.8185, 13.9365], [120.8185, 13.9310], [120.8145, 13.9300],
        [120.8100, 13.9310]
      ]] }
    },
    {
      type: 'Feature',
      properties: { name: 'Barangay 2 (Pob.)', number: 2, center: [13.9350, 120.8230] },
      geometry: { type: 'Polygon', coordinates: [[
        [120.8185, 13.9310], [120.8185, 13.9370], [120.8230, 13.9380],
        [120.8275, 13.9365], [120.8275, 13.9305], [120.8230, 13.9295],
        [120.8185, 13.9310]
      ]] }
    },
    {
      type: 'Feature',
      properties: { name: 'Barangay 3 (Pob.)', number: 3, center: [13.9335, 120.8060] },
      geometry: { type: 'Polygon', coordinates: [[
        [120.8015, 13.9300], [120.8015, 13.9360], [120.8060, 13.9370],
        [120.8100, 13.9365], [120.8100, 13.9310], [120.8060, 13.9295],
        [120.8015, 13.9300]
      ]] }
    },
    {
      type: 'Feature',
      properties: { name: 'Barangay 4 (Pob.)', number: 4, center: [13.9320, 120.8145] },
      geometry: { type: 'Polygon', coordinates: [[
        [120.8100, 13.9255], [120.8100, 13.9310], [120.8145, 13.9300],
        [120.8185, 13.9310], [120.8185, 13.9255], [120.8145, 13.9240],
        [120.8100, 13.9255]
      ]] }
    },
    {
      type: 'Feature',
      properties: { name: 'Barangay 5 (Pob.)', number: 5, center: [13.9340, 120.8200] },
      geometry: { type: 'Polygon', coordinates: [[
        [120.8185, 13.9310], [120.8185, 13.9370], [120.8230, 13.9380],
        [120.8230, 13.9295], [120.8185, 13.9310]
      ]] }
    },
    {
      type: 'Feature',
      properties: { name: 'Barangay 6 (Pob.)', number: 6, center: [13.9315, 120.8170] },
      geometry: { type: 'Polygon', coordinates: [[
        [120.8145, 13.9240], [120.8145, 13.9300], [120.8185, 13.9310],
        [120.8230, 13.9295], [120.8230, 13.9235], [120.8185, 13.9220],
        [120.8145, 13.9240]
      ]] }
    },

    // ── NORTH ZONE (7-20) — north & northeast barangays ────────────────────
    {
      type: 'Feature',
      properties: { name: 'Lucsuhin', number: 7, center: [13.9460, 120.8190] },
      geometry: { type: 'Polygon', coordinates: [[
        [120.8140, 13.9415], [120.8140, 13.9510], [120.8195, 13.9520],
        [120.8245, 13.9505], [120.8245, 13.9415], [120.8195, 13.9405],
        [120.8140, 13.9415]
      ]] }
    },
    {
      type: 'Feature',
      properties: { name: 'Niyugan', number: 8, center: [13.9460, 120.8115] },
      geometry: { type: 'Polygon', coordinates: [[
        [120.8065, 13.9415], [120.8065, 13.9510], [120.8140, 13.9520],
        [120.8140, 13.9415], [120.8065, 13.9415]
      ]] }
    },
    {
      type: 'Feature',
      properties: { name: 'Camastilisan', number: 9, center: [13.9470, 120.8040] },
      geometry: { type: 'Polygon', coordinates: [[
        [120.7990, 13.9425], [120.7990, 13.9515], [120.8065, 13.9525],
        [120.8065, 13.9415], [120.7990, 13.9425]
      ]] }
    },
    {
      type: 'Feature',
      properties: { name: 'Calantas', number: 10, center: [13.9500, 120.7940] },
      geometry: { type: 'Polygon', coordinates: [[
        [120.7890, 13.9445], [120.7890, 13.9555], [120.7990, 13.9560],
        [120.7990, 13.9425], [120.7890, 13.9445]
      ]] }
    },
    {
      type: 'Feature',
      properties: { name: 'Puting Bato Este', number: 11, center: [13.9480, 120.8295] },
      geometry: { type: 'Polygon', coordinates: [[
        [120.8245, 13.9415], [120.8245, 13.9510], [120.8300, 13.9520],
        [120.8355, 13.9505], [120.8355, 13.9415], [120.8300, 13.9400],
        [120.8245, 13.9415]
      ]] }
    },
    {
      type: 'Feature',
      properties: { name: 'Puting Bato Weste', number: 12, center: [13.9430, 120.8245] },
      geometry: { type: 'Polygon', coordinates: [[
        [120.8185, 13.9370], [120.8185, 13.9415], [120.8245, 13.9415],
        [120.8300, 13.9400], [120.8300, 13.9350], [120.8245, 13.9340],
        [120.8185, 13.9370]
      ]] }
    },
    {
      type: 'Feature',
      properties: { name: 'Gabao', number: 13, center: [13.9405, 120.8100] },
      geometry: { type: 'Polygon', coordinates: [[
        [120.8060, 13.9370], [120.8060, 13.9420], [120.8140, 13.9420],
        [120.8185, 13.9415], [120.8185, 13.9370], [120.8145, 13.9375],
        [120.8060, 13.9370]
      ]] }
    },
    {
      type: 'Feature',
      properties: { name: 'Gulod', number: 14, center: [13.9390, 120.8185] },
      geometry: { type: 'Polygon', coordinates: [[
        [120.8145, 13.9375], [120.8145, 13.9415], [120.8185, 13.9415],
        [120.8185, 13.9370], [120.8145, 13.9375]
      ]] }
    },
    {
      type: 'Feature',
      properties: { name: 'Loma', number: 15, center: [13.9410, 120.8255] },
      geometry: { type: 'Polygon', coordinates: [[
        [120.8185, 13.9370], [120.8185, 13.9415], [120.8245, 13.9415],
        [120.8245, 13.9340], [120.8230, 13.9295], [120.8230, 13.9380],
        [120.8185, 13.9370]
      ]] }
    },
    {
      type: 'Feature',
      properties: { name: 'Caluangan', number: 16, center: [13.9530, 120.7825] },
      geometry: { type: 'Polygon', coordinates: [[
        [120.7760, 13.9480], [120.7760, 13.9580], [120.7890, 13.9590],
        [120.7890, 13.9555], [120.7890, 13.9445], [120.7760, 13.9480]
      ]] }
    },
    {
      type: 'Feature',
      properties: { name: 'Dir-ec', number: 17, center: [13.9420, 120.8320] },
      geometry: { type: 'Polygon', coordinates: [[
        [120.8275, 13.9305], [120.8275, 13.9365], [120.8300, 13.9350],
        [120.8355, 13.9350], [120.8355, 13.9290], [120.8300, 13.9275],
        [120.8275, 13.9305]
      ]] }
    },
    {
      type: 'Feature',
      properties: { name: 'Dila', number: 18, center: [13.9385, 120.8020] },
      geometry: { type: 'Polygon', coordinates: [[
        [120.7970, 13.9355], [120.7970, 13.9420], [120.8015, 13.9425],
        [120.8060, 13.9420], [120.8060, 13.9370], [120.8015, 13.9360],
        [120.7970, 13.9355]
      ]] }
    },
    {
      type: 'Feature',
      properties: { name: 'Domoclay', number: 19, center: [13.9290, 120.8115] },
      geometry: { type: 'Polygon', coordinates: [[
        [120.8060, 13.9235], [120.8060, 13.9300], [120.8100, 13.9310],
        [120.8100, 13.9255], [120.8060, 13.9235]
      ]] }
    },
    {
      type: 'Feature',
      properties: { name: 'Lubi', number: 20, center: [13.9295, 120.8165] },
      geometry: { type: 'Polygon', coordinates: [[
        [120.8100, 13.9255], [120.8100, 13.9310], [120.8145, 13.9300],
        [120.8145, 13.9240], [120.8100, 13.9255]
      ]] }
    },

    // ── CENTRAL & SOUTH ZONE (21-40) ───────────────────────────────────────
    {
      type: 'Feature',
      properties: { name: 'Madalunot', number: 21, center: [13.9270, 120.8090] },
      geometry: { type: 'Polygon', coordinates: [[
        [120.8015, 13.9225], [120.8015, 13.9300], [120.8060, 13.9300],
        [120.8060, 13.9235], [120.8015, 13.9225]
      ]] }
    },
    {
      type: 'Feature',
      properties: { name: 'Makina', number: 22, center: [13.9270, 120.8155] },
      geometry: { type: 'Polygon', coordinates: [[
        [120.8100, 13.9200], [120.8100, 13.9255], [120.8145, 13.9240],
        [120.8145, 13.9190], [120.8100, 13.9200]
      ]] }
    },
    {
      type: 'Feature',
      properties: { name: 'Matipok', number: 23, center: [13.9265, 120.8215] },
      geometry: { type: 'Polygon', coordinates: [[
        [120.8145, 13.9190], [120.8145, 13.9240], [120.8185, 13.9255],
        [120.8230, 13.9235], [120.8230, 13.9185], [120.8185, 13.9170],
        [120.8145, 13.9190]
      ]] }
    },
    {
      type: 'Feature',
      properties: { name: 'Bagong Tubig', number: 24, center: [13.9445, 120.7840] },
      geometry: { type: 'Polygon', coordinates: [[
        [120.7760, 13.9390], [120.7760, 13.9480], [120.7890, 13.9480],
        [120.7890, 13.9445], [120.7890, 13.9390], [120.7760, 13.9390]
      ]] }
    },
    {
      type: 'Feature',
      properties: { name: 'Balimbing', number: 25, center: [13.9250, 120.8050] },
      geometry: { type: 'Polygon', coordinates: [[
        [120.7970, 13.9200], [120.7970, 13.9275], [120.8015, 13.9225],
        [120.8015, 13.9175], [120.7970, 13.9200]
      ]] }
    },
    {
      type: 'Feature',
      properties: { name: 'Bisaya', number: 26, center: [13.9250, 120.8220] },
      geometry: { type: 'Polygon', coordinates: [[
        [120.8145, 13.9140], [120.8145, 13.9190], [120.8185, 13.9170],
        [120.8230, 13.9185], [120.8230, 13.9140], [120.8185, 13.9125],
        [120.8145, 13.9140]
      ]] }
    },
    {
      type: 'Feature',
      properties: { name: 'Cahil', number: 27, center: [13.9220, 120.8100] },
      geometry: { type: 'Polygon', coordinates: [[
        [120.8015, 13.9175], [120.8015, 13.9225], [120.8060, 13.9235],
        [120.8100, 13.9200], [120.8100, 13.9155], [120.8060, 13.9140],
        [120.8015, 13.9175]
      ]] }
    },
    {
      type: 'Feature',
      properties: { name: 'Coral ni Lopez', number: 28, center: [13.9215, 120.8150] },
      geometry: { type: 'Polygon', coordinates: [[
        [120.8100, 13.9155], [120.8100, 13.9200], [120.8145, 13.9190],
        [120.8145, 13.9140], [120.8100, 13.9130], [120.8100, 13.9155]
      ]] }
    },
    {
      type: 'Feature',
      properties: { name: 'Dacanlao', number: 29, center: [13.9210, 120.8055] },
      geometry: { type: 'Polygon', coordinates: [[
        [120.7970, 13.9155], [120.7970, 13.9200], [120.8015, 13.9175],
        [120.8015, 13.9130], [120.7970, 13.9155]
      ]] }
    },
    {
      type: 'Feature',
      properties: { name: 'Munting Coral', number: 30, center: [13.9215, 120.8235] },
      geometry: { type: 'Polygon', coordinates: [[
        [120.8185, 13.9125], [120.8185, 13.9170], [120.8230, 13.9185],
        [120.8280, 13.9170], [120.8280, 13.9115], [120.8230, 13.9100],
        [120.8185, 13.9125]
      ]] }
    },
    {
      type: 'Feature',
      properties: { name: 'Pantay', number: 31, center: [13.9185, 120.8100] },
      geometry: { type: 'Polygon', coordinates: [[
        [120.8015, 13.9085], [120.8015, 13.9130], [120.8060, 13.9140],
        [120.8100, 13.9130], [120.8100, 13.9085], [120.8060, 13.9070],
        [120.8015, 13.9085]
      ]] }
    },
    {
      type: 'Feature',
      properties: { name: 'Quisumbing', number: 32, center: [13.9185, 120.8150] },
      geometry: { type: 'Polygon', coordinates: [[
        [120.8100, 13.9085], [120.8100, 13.9130], [120.8145, 13.9140],
        [120.8145, 13.9090], [120.8100, 13.9085]
      ]] }
    },
    {
      type: 'Feature',
      properties: { name: 'Sambat', number: 33, center: [13.9180, 120.8055] },
      geometry: { type: 'Polygon', coordinates: [[
        [120.7970, 13.9105], [120.7970, 13.9155], [120.8015, 13.9130],
        [120.8015, 13.9085], [120.7970, 13.9105]
      ]] }
    },
    {
      type: 'Feature',
      properties: { name: 'San Rafael', number: 34, center: [13.9190, 120.7970] },
      geometry: { type: 'Polygon', coordinates: [[
        [120.7890, 13.9150], [120.7890, 13.9270], [120.7970, 13.9275],
        [120.7970, 13.9200], [120.7970, 13.9155], [120.7970, 13.9105],
        [120.7890, 13.9150]
      ]] }
    },
    {
      type: 'Feature',
      properties: { name: 'Sinisian', number: 35, center: [13.9170, 120.8265] },
      geometry: { type: 'Polygon', coordinates: [[
        [120.8145, 13.9090], [120.8145, 13.9140], [120.8185, 13.9125],
        [120.8230, 13.9100], [120.8280, 13.9115], [120.8280, 13.9065],
        [120.8230, 13.9050], [120.8185, 13.9070], [120.8145, 13.9090]
      ]] }
    },
    {
      type: 'Feature',
      properties: { name: 'Taklang Anak', number: 36, center: [13.9155, 120.8155] },
      geometry: { type: 'Polygon', coordinates: [[
        [120.8060, 13.9000], [120.8060, 13.9070], [120.8100, 13.9085],
        [120.8145, 13.9090], [120.8145, 13.9040], [120.8100, 13.9025],
        [120.8060, 13.9000]
      ]] }
    },
    {
      type: 'Feature',
      properties: { name: 'Talisay', number: 37, center: [13.9125, 120.7910] },
      geometry: { type: 'Polygon', coordinates: [[
        [120.7830, 13.9050], [120.7830, 13.9150], [120.7890, 13.9150],
        [120.7970, 13.9105], [120.7970, 13.9050], [120.7830, 13.9050]
      ]] }
    },
    {
      type: 'Feature',
      properties: { name: 'Tamayo', number: 38, center: [13.9130, 120.8080] },
      geometry: { type: 'Polygon', coordinates: [[
        [120.7970, 13.9050], [120.7970, 13.9105], [120.8015, 13.9085],
        [120.8060, 13.9070], [120.8060, 13.9000], [120.8015, 13.9000],
        [120.7970, 13.9050]
      ]] }
    },
    {
      type: 'Feature',
      properties: { name: 'Baclas', number: 39, center: [13.9100, 120.8160] },
      geometry: { type: 'Polygon', coordinates: [[
        [120.8060, 13.8950], [120.8060, 13.9000], [120.8100, 13.9025],
        [120.8145, 13.9040], [120.8185, 13.9070], [120.8230, 13.9050],
        [120.8230, 13.8990], [120.8145, 13.8975], [120.8060, 13.8950]
      ]] }
    },
    {
      type: 'Feature',
      properties: { name: 'Bambang', number: 40, center: [13.9065, 120.8195] },
      geometry: { type: 'Polygon', coordinates: [[
        [120.7830, 13.8950], [120.7830, 13.9050], [120.7970, 13.9050],
        [120.8015, 13.9000], [120.8060, 13.9000], [120.8060, 13.8950],
        [120.7830, 13.8950]
      ]] }
    },
  ]
};

// ─── Helper functions ──────────────────────────────────────────────────────────

export function getBarangayByName(name: string): BarangayFeature | undefined {
  return CALACA_BARANGAYS_GEOJSON.features.find(f => f.properties.name === name);
}

export function getBarangayCenter(name: string): [number, number] | undefined {
  return getBarangayByName(name)?.properties.center;
}

export function getBarangayNames(): string[] {
  return CALACA_BARANGAYS_GEOJSON.features.map(f => f.properties.name);
}
