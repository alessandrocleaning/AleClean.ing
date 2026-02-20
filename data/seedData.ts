import { Employee, Site } from '../types';

export const SEED_SITES: Site[] = [
  { id: 'site-1', name: 'Uffici Alpha (Milano)', address: 'Via Dante 1', city: 'Milano' },
  { id: 'site-2', name: 'Condominio I Giardini', address: 'Corso Francia 10', city: 'Torino' },
  { id: 'site-3', name: 'Centro Comm. Le Corti', address: 'Viale Europa 5', city: 'Varese' },
  { id: 'site-4', name: 'Banca Intesa Sede', address: 'Piazza Affari 2', city: 'Milano' },
  { id: 'site-5', name: 'Showroom Mobili', address: 'Via Como 8', city: 'Como' },
];

export const SEED_EMPLOYEES: Employee[] = [
  {
    id: 'emp-1',
    firstName: 'Mario',
    lastName: 'Rossi',
    hourlyRate: 12.50,
    contractHours: { mon: 8, tue: 8, wed: 8, thu: 8, fri: 8, sat: 0, sun: 0 },
    defaultAssignments: [
      {
        siteId: 'site-1',
        type: 'HOURLY',
        startDate: '2024-01-01',
        schedule: { mon: 4, tue: 4, wed: 4, thu: 4, fri: 4, sat: 0, sun: 0 }
      },
      {
        siteId: 'site-4',
        type: 'HOURLY',
        startDate: '2024-01-01',
        schedule: { mon: 4, tue: 4, wed: 4, thu: 4, fri: 4, sat: 0, sun: 0 }
      }
    ]
  },
  {
    id: 'emp-2',
    firstName: 'Luigi',
    lastName: 'Verdi',
    hourlyRate: 11.00,
    contractHours: { mon: 4, tue: 4, wed: 4, thu: 4, fri: 4, sat: 0, sun: 0 },
    defaultAssignments: [
      {
        siteId: 'site-2',
        type: 'FORFAIT',
        forfaitAmount: 500,
        startDate: '2024-01-01',
        schedule: { mon: 2, tue: 2, wed: 2, thu: 2, fri: 2, sat: 0, sun: 0 }
      },
      {
        siteId: 'site-5',
        type: 'HOURLY',
        startDate: '2024-01-01',
        schedule: { mon: 2, tue: 2, wed: 2, thu: 2, fri: 2, sat: 0, sun: 0 }
      }
    ]
  },
  {
    id: 'emp-3',
    firstName: 'Giovanna',
    lastName: 'Bianchi',
    hourlyRate: 13.00,
    contractHours: { mon: 5, tue: 5, wed: 5, thu: 5, fri: 5, sat: 5, sun: 0 },
    defaultAssignments: [
      {
        siteId: 'site-3',
        type: 'HOURLY',
        startDate: '2024-01-01',
        schedule: { mon: 5, tue: 5, wed: 5, thu: 5, fri: 5, sat: 5, sun: 0 }
      }
    ]
  }
];