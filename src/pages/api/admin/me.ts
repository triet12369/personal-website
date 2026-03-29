import type { NextApiRequest, NextApiResponse } from 'next';

import { verifyAdminRequest } from '../../../lib/cfAccess';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end();

  const admin = await verifyAdminRequest(req);
  return res.json({
    admin,
    name: admin ? (process.env.ADMIN_DISPLAY_NAME ?? null) : null,
  });
}
