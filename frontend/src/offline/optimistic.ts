/**
 * Builds the "it worked" response a component gets when a write is queued, and patches the cached lists so the
 * new/changed record is visible immediately (marked _pending) instead of appearing only after upload.
 * Field maps mirror backend/src/routes/{pets,livestock}.ts.
 */
import type { QueueKind } from './config';
import { patchCached } from './cache';

type Row = Record<string, any>;
const today = () => new Date().toISOString().slice(0, 10);

const PET_FIELDS: Record<string, string> = {
  petName: 'pet_name', species: 'species', breed: 'breed', age: 'age', color: 'color', gender: 'gender',
  ownerName: 'owner_name', contactNumber: 'contact_number', barangay: 'barangay', address: 'address',
  vaccinationStatus: 'vaccination_status', lastVaccinationDate: 'last_vaccination_date',
  nextVaccinationDate: 'next_vaccination_date', status: 'status', photo: 'photo', photoUrl: 'photo',
  isSpayed: 'is_spayed', isNeutered: 'is_neutered', impoundStatus: 'impound_status', impoundDate: 'impound_date',
  impoundReason: 'impound_reason', releaseDate: 'release_date',
};
const LIVESTOCK_FIELDS: Record<string, string> = {
  animalType: 'animal_type', breed: 'breed', quantity: 'quantity', gender: 'gender', age: 'age',
  colorMarkings: 'color_markings', purpose: 'purpose', source: 'source', tagNumber: 'tag_number',
  ownerName: 'owner_name', contactNumber: 'contact_number', barangay: 'barangay', farmAddress: 'farm_address',
  healthStatus: 'health_status', farmType: 'farm_type', lastCheckupDate: 'last_checkup_date', notes: 'notes',
  quarantineDate: 'quarantine_date', quarantineReason: 'quarantine_reason',
};

function mapFields(body: Row, map: Record<string, string>): Row {
  const out: Row = {};
  for (const [k, col] of Object.entries(map)) if (k in body) out[col] = body[k];
  return out;
}

const petRow = (b: Row, id: string): Row => ({
  id, owner_id: b.ownerId ?? null, status: 'Active', registration_date: today(), pet_tag_id: null,
  vaccination_status: 'Not Vaccinated', is_spayed: false, is_neutered: false, impound_status: 'None',
  ...mapFields({ ...b, contactNumber: b.contactNumber ?? b.ownerContact, address: b.address ?? b.ownerAddress }, PET_FIELDS),
  _pending: true,
});

const livestockRow = (b: Row, id: string): Row => ({
  id, owner_id: b.ownerId ?? null, quantity: 1, purpose: 'Mixed', health_status: 'Healthy', farm_type: 'Backyard',
  registration_date: today(), ...mapFields(b, LIVESTOCK_FIELDS), _pending: true,
});

/** Does a cached list variant (identified by its query string) plausibly include this row? */
function listAccepts(search: string, row: Row): boolean {
  const q = new URLSearchParams(search);
  if (q.get('archived') === 'only') return false;
  const owner = q.get('ownerId');   if (owner && row.owner_id !== owner) return false;
  const brgy = q.get('barangay');   if (brgy && String(row.barangay || '').toLowerCase() !== brgy.toLowerCase()) return false;
  const type = q.get('type');       if (type && row.animal_type !== type) return false;
  const st = q.get('status');       if (st && row.health_status !== st) return false;
  return true;
}

const listOf = (json: any, key: string): Row[] | null => (json && Array.isArray(json[key]) ? json[key] : null);

export interface OptimisticInput {
  kind: QueueKind;
  method: string;
  pathname: string;
  body: Row;
  tempId?: string;
  userKey: string;
}

/** Returns the JSON body for the synthetic 202 response. */
export async function applyOptimistic(i: OptimisticInput): Promise<Row> {
  const base = { success: true, queued: true, offline: true };
  const { kind, body, tempId, userKey } = i;

  switch (kind) {
    case 'pet-create': {
      const pet = petRow(body, tempId!);
      await patchCached(userKey, '/api/pets', (json, search) => {
        const list = listOf(json, 'pets'); if (list && listAccepts(search, pet)) list.unshift(pet);
      });
      return { ...base, pet, tempId: null, petTagId: null };
    }
    case 'livestock-create': {
      const livestock = livestockRow(body, tempId!);
      await patchCached(userKey, '/api/livestock', (json, search) => {
        const list = listOf(json, 'livestock'); if (list && listAccepts(search, livestock)) list.unshift(livestock);
      });
      return { ...base, livestock, tempId: null };
    }
    case 'pet-update':
    case 'livestock-update': {
      const isPet = kind === 'pet-update';
      const id = decodeURIComponent(i.pathname.split('/').pop() || '');
      const changes = { ...mapFields(body, isPet ? PET_FIELDS : LIVESTOCK_FIELDS), _pending: true };
      let merged: Row = { id, ...changes };
      await patchCached(userKey, isPet ? '/api/pets' : '/api/livestock', (json) => {
        const list = listOf(json, isPet ? 'pets' : 'livestock');
        const row = list?.find(r => r.id === id);
        if (row) { Object.assign(row, changes); merged = { ...row }; }
      });
      return { ...base, [isPet ? 'pet' : 'livestock']: merged };
    }
    case 'vaccination': {
      const date = body.dateOfVaccination || today();
      const record = {
        id: tempId, pet_id: body.petId, date_of_vaccination: date, vaccine_name: body.vaccineName ?? '',
        lot_number: body.lotNumber ?? '', batch_number: body.batchNumber ?? '', vaccine_barcode: body.vaccineBarcode ?? null,
        veterinarian: body.veterinarian ?? '', vet_license: body.vetLicense ?? '', notes: body.notes ?? null, _pending: true,
      };
      await patchCached(userKey, '/api/pets', (json) => {
        const row = listOf(json, 'pets')?.find(r => r.id === body.petId);
        if (row) { row.vaccination_status = 'Vaccinated'; row.last_vaccination_date = date; }
      });
      await patchCached(userKey, `/api/vaccination-history/${body.petId}`, (json) => {
        const list = listOf(json, 'history'); if (list) list.unshift(record);
      });
      return { ...base, record, vetName: record.veterinarian, vetLicense: record.vet_license };
    }
    default:
      return { ...base, id: tempId ?? null, record: { id: tempId ?? null, ...body, _pending: true } };
  }
}

/** Pull the server-assigned id out of a create response (pet / livestock / record / plain id). */
export function extractRealId(json: any): string | null {
  const id = json?.pet?.id ?? json?.livestock?.id ?? json?.record?.id ?? json?.id;
  return typeof id === 'string' || typeof id === 'number' ? String(id) : null;
}
