// ============================================================
// NASaAlaga VMS - Shared Types & Database Schema
// ============================================================

export type UserRole = 'superadmin' | 'admin' | 'bahw' | 'public';

export interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  role: UserRole;
  barangay?: string;
  status: 'active' | 'inactive' | 'pending';
  calacazenId?: string;       // Optional Calacazen ID
  householdNumber?: string;   // Optional Household Number
  tempId?: string;            // Temporary ID used to claim unregistered pets
  createdAt: string;
  lastLogin?: string;
  emailVerified: boolean;
}

export type PetStatus = 'pre-registered' | 'registered' | 'expired';

export interface Pet {
  id: string;
  name: string;
  species: string;
  breed: string;
  color: string;
  age: string;
  sex: 'Male' | 'Female';
  weight?: string;
  markings?: string;
  photo?: string;                  // Base64 or URL
  petTagId?: string;               // Assigned after validation by admin
  status: PetStatus;
  ownerId?: string;                // Tagged user ID (null if temp-owner)
  ownerTempId?: string;            // Temporary ID if owner not registered
  ownerName: string;               // Always stored
  ownerAddress: string;
  ownerContact: string;
  barangay: string;
  preRegId?: string;               // Temp pre-registration ID
  preRegExpiry?: string;           // 14-day expiry
  preRegDate?: string;
  registeredDate?: string;
  validatedBy?: string;            // Admin who validated
  validatedDate?: string;
  notes?: string;
}

export interface PreRegistration {
  id: string;                      // PREREG-YYYYMMDD-XXXX
  petData: Omit<Pet, 'id' | 'status' | 'petTagId' | 'preRegId'>;
  ownerId: string;
  ownerEmail: string;
  submittedAt: string;
  expiresAt: string;               // 14 days from submission
  emailSent: boolean;
  status: 'pending' | 'validated' | 'expired';
}

export interface TempOwner {
  tempId: string;                  // TEMP-XXXXXX
  name: string;
  contact: string;
  address: string;
  createdAt: string;
  claimedByUserId?: string;
}

// ============================================================
// Mock Database
// ============================================================

export const generateId = (prefix: string) => {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
};

export const generatePreRegId = () => {
  const date = new Date();
  const yyyymmdd = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  const rand = Math.floor(Math.random() * 9000 + 1000);
  return `PREREG-${yyyymmdd}-${rand}`;
};

export const generateTempId = () => {
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `TEMP-${rand}`;
};

// ---- Seed Data ----

export const MOCK_USERS: User[] = [
  {
    id: 'user-001',
    username: 'superadmin',
    name: 'City Veterinarian Dr. Jose Reyes',
    email: 'superadmin@calaca.gov.ph',
    role: 'superadmin',
    status: 'active',
    createdAt: '2024-01-01',
    lastLogin: '2025-01-15 08:00',
    emailVerified: true,
  },
  {
    id: 'user-002',
    username: 'admin01',
    name: 'Dr. Roberto Santos',
    email: 'r.santos@calaca.gov.ph',
    role: 'admin',
    barangay: 'All',
    status: 'active',
    createdAt: '2024-01-05',
    lastLogin: '2025-01-15 08:30',
    emailVerified: true,
  },
  {
    id: 'user-003',
    username: 'bahw_brgy1',
    name: 'Juan Dela Cruz',
    email: 'j.delacruz@calaca.gov.ph',
    role: 'bahw',
    barangay: 'Barangay 1',
    status: 'active',
    createdAt: '2024-01-10',
    lastLogin: '2025-01-15 07:15',
    emailVerified: true,
  },
  {
    id: 'user-004',
    username: 'mariasantos',
    name: 'Maria Santos',
    email: 'mariasantos@email.com',
    role: 'public',
    barangay: 'Barangay 2',
    status: 'active',
    calacazenId: 'CAL-2024-00123',
    householdNumber: 'HH-B2-045',
    createdAt: '2024-03-15',
    lastLogin: '2025-01-14 15:20',
    emailVerified: true,
  },
  {
    id: 'user-005',
    username: 'pedrogarcia',
    name: 'Pedro Garcia',
    email: 'pedrogarcia@email.com',
    role: 'public',
    barangay: 'Barangay 3',
    status: 'active',
    createdAt: '2024-05-20',
    emailVerified: true,
  },
];

export const MOCK_PETS: Pet[] = [
  {
    id: 'pet-001',
    name: 'Bantay',
    species: 'Dog',
    breed: 'Aspin',
    color: 'Brown and White',
    age: '3 years',
    sex: 'Male',
    weight: '12 kg',
    petTagId: 'TAG-2024-0001',
    status: 'registered',
    ownerId: 'user-004',
    ownerName: 'Maria Santos',
    ownerAddress: '123 Rizal St., Barangay 2',
    ownerContact: '09171234567',
    barangay: 'Barangay 2',
    registeredDate: '2024-04-01',
    validatedBy: 'user-002',
    validatedDate: '2024-04-01',
  },
  {
    id: 'pet-002',
    name: 'Pusa',
    species: 'Cat',
    breed: 'Puspin',
    color: 'Orange Tabby',
    age: '1 year',
    sex: 'Female',
    status: 'registered',
    petTagId: 'TAG-2024-0002',
    ownerId: 'user-004',
    ownerName: 'Maria Santos',
    ownerAddress: '123 Rizal St., Barangay 2',
    ownerContact: '09171234567',
    barangay: 'Barangay 2',
    registeredDate: '2024-04-01',
    validatedBy: 'user-002',
    validatedDate: '2024-04-01',
  },
  {
    id: 'pet-003',
    name: 'Rex',
    species: 'Dog',
    breed: 'German Shepherd',
    color: 'Black and Tan',
    age: '5 years',
    sex: 'Male',
    weight: '30 kg',
    petTagId: 'TAG-2024-0003',
    status: 'registered',
    ownerId: 'user-005',
    ownerName: 'Pedro Garcia',
    ownerAddress: '456 Mabini Ave., Barangay 3',
    ownerContact: '09281234567',
    barangay: 'Barangay 3',
    registeredDate: '2024-06-01',
    validatedBy: 'user-002',
    validatedDate: '2024-06-01',
  },
  {
    id: 'pet-004',
    name: 'Luna',
    species: 'Dog',
    breed: 'Shih Tzu',
    color: 'White',
    age: '2 years',
    sex: 'Female',
    status: 'pre-registered',
    preRegId: 'PREREG-20250110-4521',
    preRegDate: '2025-01-10',
    preRegExpiry: '2025-01-24',
    ownerId: 'user-004',
    ownerName: 'Maria Santos',
    ownerAddress: '123 Rizal St., Barangay 2',
    ownerContact: '09171234567',
    barangay: 'Barangay 2',
  },
  {
    id: 'pet-005',
    name: 'Blackie',
    species: 'Dog',
    breed: 'Aspin',
    color: 'Black',
    age: '4 years',
    sex: 'Male',
    status: 'registered',
    petTagId: 'TAG-2024-0004',
    ownerTempId: 'TEMP-AB12CD',
    ownerName: 'Carlo Reyes (Unregistered)',
    ownerAddress: 'Barangay 4, Calaca',
    ownerContact: '09301234567',
    barangay: 'Barangay 4',
    registeredDate: '2024-10-15',
    validatedBy: 'user-002',
    validatedDate: '2024-10-15',
  },
];

export const MOCK_TEMP_OWNERS: TempOwner[] = [
  {
    tempId: 'TEMP-AB12CD',
    name: 'Carlo Reyes',
    contact: '09301234567',
    address: 'Barangay 4, Calaca',
    createdAt: '2024-10-15',
  },
];
