/**
 * The fare rules the booking page shows, worked out again on the server so a
 * stale page or an edited request is caught. Keep in step with the script in
 * src/pages/book/index.astro.
 */
import { packageBySlug } from '../data/packages';
import { routeBySlug } from '../data/routes';
import { POLICY } from '../data/site';
import { vehicleByKey, type VehicleKey } from '../data/vehicles';

export const isNightPickup = (time: string) =>
  Boolean(time) && (time >= POLICY.nightChargeFrom || time < POLICY.nightChargeTo);

export type FareInput =
  | { kind: 'taxi'; routeSlug: string; vehicle: string; time: string }
  | { kind: 'package'; packageSlug: string; vehicle: string; pax: number };

export type Fare = { total: number; advance: number; tripName: string };

/** Returns null when the route, package or car does not exist. */
export function computeFare(input: FareInput): Fare | null {
  const car = vehicleByKey(input.vehicle);
  if (!car) return null;
  if (input.kind === 'taxi') {
    const route = routeBySlug(input.routeSlug);
    if (!route) return null;
    const total = route.fares[input.vehicle as VehicleKey] + (isNightPickup(input.time) ? POLICY.nightCharge : 0);
    return { total, advance: advanceOf(total), tripName: `${route.from} to ${route.to} · ${car.name}` };
  }
  const pkg = packageBySlug(input.packageSlug);
  if (!pkg) return null;
  const total = pkg.fromPrice * Math.max(1, input.pax);
  return { total, advance: advanceOf(total), tripName: `${pkg.name} (${pkg.nights}N/${pkg.days}D) · ${car.name}` };
}

export const advanceOf = (total: number) => Math.round((total * POLICY.advancePercent) / 100);

/**
 * Whether the driver collects the balance from the guest after the trip
 * (the office takes the advance). True for taxi transfers, as the owner
 * decided on 21 Oct 2026. Tour packages still promise the balance before the
 * trip on the public package pages, so they stay with the office until the
 * owner says otherwise; change it here and every screen follows.
 */
export const driverCollectsBalance = (kind: 'taxi' | 'package') => kind === 'taxi';
