/**
 * DTOs for Store Operating Hours
 */

export enum DayOfWeek {
  MONDAY = 'MONDAY',
  TUESDAY = 'TUESDAY',
  WEDNESDAY = 'WEDNESDAY',
  THURSDAY = 'THURSDAY',
  FRIDAY = 'FRIDAY',
  SATURDAY = 'SATURDAY',
  SUNDAY = 'SUNDAY',
}

export interface TimeSlot {
  open: string; // "08:00"
  close: string; // "17:00"
}

export interface DayHoursDTO {
  day: DayOfWeek;
  isClosed: boolean;
  slots: TimeSlot[]; // Peut avoir plusieurs créneaux: matin + soir
}

export interface CreateStoreHoursDTO {
  storeId: string;
  hours: DayHoursDTO[];
  timezone?: string; // "Africa/Abidjan"
  specialNotes?: string; // "Fermé les jours fériés"
}

export interface UpdateStoreHoursDTO {
  hours?: DayHoursDTO[];
  timezone?: string;
  specialNotes?: string;
}

export interface StoreHoursResponseDTO {
  id: string;
  storeId: string;
  hours: DayHoursDTO[];
  timezone: string;
  specialNotes?: string;
  isCurrentlyOpen: boolean; // Calculé en temps réel
  nextOpenTime?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SpecialClosureDTO {
  storeId: string;
  date: Date; // Date de fermeture exceptionnelle
  reason: string; // "Jour férié", "Congés"
  allDay: boolean;
  from?: string; // Si pas allDay: "10:00"
  to?: string; // "14:00"
}

export interface SpecialClosureResponseDTO {
  id: string;
  storeId: string;
  date: Date;
  reason: string;
  allDay: boolean;
  from?: string;
  to?: string;
  createdAt: Date;
}
