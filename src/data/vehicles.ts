export type VehicleKey = 'sedan' | 'suv' | 'innova' | 'traveller';

export interface Vehicle {
  key: VehicleKey;
  name: string;
  models: string;
  seats: number;
  bags: string;
  bestFor: string;
}

export const VEHICLES: Vehicle[] = [
  {
    key: 'sedan',
    name: 'Sedan',
    models: 'Swift Dzire, Toyota Etios or similar',
    seats: 4,
    bags: '2 large + 2 small',
    bestFor: 'Couples and small families on plains or short hill routes',
  },
  {
    key: 'suv',
    name: 'SUV',
    models: 'Maruti Ertiga, Kia Carens or similar',
    seats: 6,
    bags: '3 large + 2 small',
    bestFor: 'Families of up to six with moderate luggage',
  },
  {
    key: 'innova',
    name: 'Innova Crysta',
    models: 'Toyota Innova Crysta',
    seats: 6,
    bags: '4 large + 3 small',
    bestFor: 'The most comfortable ride on long mountain roads to Gangtok and Pelling',
  },
  {
    key: 'traveller',
    name: 'Tempo Traveller',
    models: 'Force Tempo Traveller (12 seat)',
    seats: 12,
    bags: '10 large',
    bestFor: 'Groups, office trips and large families',
  },
];

export const vehicleByKey = (key: string) => VEHICLES.find((v) => v.key === key);
