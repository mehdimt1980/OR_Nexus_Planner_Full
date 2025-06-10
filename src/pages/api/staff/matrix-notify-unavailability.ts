// src/pages/api/staff/matrix-notify-unavailability.ts
import type { NextApiRequest, NextApiResponse } from 'next';

type Data = {
  message: string;
  staffId?: string;
  error?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  if (req.method === 'POST') {
    const { staffId, isUnavailable, matrixUserId, originalMessage } = req.body;

    // 1. AUTHENTICATION/AUTHORIZATION:
    // In a real system, you MUST secure this endpoint.
    // This could be via a secret API key/token that your Matrix bot sends,
    // matching a value stored in your environment variables.
    // Example:
    // const apiKey = req.headers['x-matrix-bot-auth'];
    // if (apiKey !== process.env.MATRIX_BOT_API_KEY) {
    //   console.warn('Unauthorized attempt to call matrix-notify-unavailability');
    //   return res.status(401).json({ message: 'Unauthorized' });
    // }

    if (!staffId || typeof isUnavailable !== 'boolean') {
      return res.status(400).json({ message: 'Missing staffId or isUnavailable flag in request body' });
    }

    console.log(
      `Received unavailability notification via Matrix. Staff ID: ${staffId}, Matrix User: ${matrixUserId || 'N/A'}, Unavailable: ${isUnavailable}. Original Message: "${originalMessage || 'N/A'}"`
    );

    // 2. UPDATE PERSISTENT STORAGE (DATABASE):
    // In a real application, you would now update the staff member's status
    // in your backend database (e.g., PostgreSQL, MongoDB, Azure Cosmos DB).
    // This database would be the single source of truth for staff availability.
    //
    // Example (pseudo-code):
    // try {
    //   // Potentially map matrixUserId to internal staffId if needed
    //   await db.collection('staff').updateOne(
    //     { id: staffId },
    //     { $set: { isSick: isUnavailable, lastReportedVia: 'Matrix', lastReportedTime: new Date(), lastMatrixMessage: originalMessage } }
    //   );
    // } catch (dbError: any) {
    //   console.error('Database update failed:', dbError);
    //   return res.status(500).json({ message: 'Failed to update staff status in database', error: dbError.message });
    // }

    // 3. NOTIFYING THE FRONTEND (Client-side useORData hook):
    // This API route *cannot* directly update the React state in useORData.ts.
    // The frontend (useORData.ts) would need to:
    //    a) Periodically fetch the latest staff/schedule data from an API that reads from the database.
    //    b) Or, use a real-time mechanism like WebSockets to be notified by the backend
    //       when data in the database changes.
    //
    // The logic similar to `reportStaffUnavailable` in `useORData.ts` (which updates local React state
    // and triggers AI re-planning based on that local state) would run on the client-side *after*
    // it receives the updated data from the backend (from the database).

    // For this placeholder, we just acknowledge receipt.
    // In a real scenario, after successful DB update, you'd inform the client
    // (perhaps through a websocket or by the client polling).
    res.status(200).json({ message: 'Unavailability notification from Matrix processed conceptually.', staffId });
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
