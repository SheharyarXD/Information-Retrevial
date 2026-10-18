export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  clinic_id: string;
  clinic_name: string;
}
export interface Category {
  id: string;
  name: string;
  description: string;
  count: number;
}
export interface Catalog {
  counts: { patients: number; encounters: number; records: number };
  categories: Category[];
}
export interface Patient {
  id: string;
  clinic_id: string;
  name: string;
  birth_year: number;
  sex: string;
  encounter_count: number;
  last_encounter: string | null;
  encounters?: Encounter[];
}
export interface Encounter {
  id: string;
  patient_id: string;
  patient_name?: string;
  occurred_at: string;
  reason: string;
  clinician: string;
  status: string;
  record_count?: number;
  categories: Category[];
}
export interface ClinicalRecord {
  id: number;
  title: string;
  category_id: string;
  category_name: string;
  patient_id: string;
  patient_name: string;
  encounter_id: string;
  created_at: string;
  excerpt: string;
  content?: string;
  encounter?: Encounter;
  relationship?: string;
}
export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  query?: string;
}
