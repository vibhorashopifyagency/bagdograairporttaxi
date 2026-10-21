import type { APIRoute } from 'astro';
import { qrImageResponse } from '../../../server/payments';

export const prerender = false;

/** The office QR code picture when it is a PNG. See qrImageResponse. */
export const GET: APIRoute = ({ params }) => qrImageResponse(params.sha ?? '', 'image/png');
