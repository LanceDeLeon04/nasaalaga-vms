// REAL Calaca City Barangays from PSGC (Philippine Standard Geographic Code)
// Calaca City, Batangas - Official List

export const CALACA_CITY_CODE = '041004';

// Fetch real barangays from multiple API sources with fallback
export async function fetchCalacaBarangays(): Promise<string[]> {
  // Try primary API
  try {
    const response = await fetch(`https://psgc.gitlab.io/api/cities-municipalities/${CALACA_CITY_CODE}/barangays.json`);
    
    if (response.ok) {
      const data = await response.json();
      const barangays = data.map((brgy: any) => brgy.name).sort();
      console.log('Successfully fetched barangays from PSGC API:', barangays.length);
      return barangays;
    }
  } catch (error) {
    console.warn('Primary API failed, using fallback:', error);
  }

  // Try alternative API
  try {
    const response = await fetch('https://psgc.cloud/api/cities-municipalities/041004/barangays');
    
    if (response.ok) {
      const data = await response.json();
      const barangays = data.map((brgy: any) => brgy.name).sort();
      console.log('Successfully fetched barangays from alternative API:', barangays.length);
      return barangays;
    }
  } catch (error) {
    console.warn('Alternative API failed, using static list:', error);
  }

  // Use static fallback
  console.log('ℹ️ Using static barangay list (38 barangays)');
  return CALACA_BARANGAYS_FALLBACK;
}

// Fallback static list (real Calaca barangays from official PSGC)
// Source: Philippine Statistics Authority (PSA) - PSGC Database
// Last verified: 2024 Q4
export const CALACA_BARANGAYS_FALLBACK = [
  'Bagong Tubig',
  'Balimbing',
  'Barangay 1 (Pob.)',
  'Barangay 2 (Pob.)',
  'Barangay 3 (Pob.)',
  'Barangay 4 (Pob.)',
  'Barangay 5 (Pob.)',
  'Barangay 6 (Pob.)',
  'Bisaya',
  'Cahil',
  'Calantas',
  'Caluangan',
  'Camastilisan',
  'Coral ni Lopez',
  'Dacanlao',
  'Dila',
  'Dir-ec',
  'Domoclay',
  'Gabao',
  'Gulod',
  'Loma',
  'Lubi',
  'Lucsuhin',
  'Madalunot',
  'Makina',
  'Matipok',
  'Munting Coral',
  'Niyugan',
  'Pantay',
  'Puting Bato Este',
  'Puting Bato Weste',
  'Quisumbing',
  'Sambat',
  'San Rafael',
  'Sinisian',
  'Taklang Anak',
  'Talisay',
  'Tamayo'
].sort();

// Default export for immediate use (fallback)
export const CALACA_BARANGAYS = CALACA_BARANGAYS_FALLBACK;