// src/pages/api/staff/matrix-notify-unavailability.ts
import type { NextApiRequest, NextApiResponse } from 'next';

type ExpectedRequestBody = {
  staffMatrixId: string; // e.g., "@julia.woogk:yourhospital.org"
  isUnavailable: boolean;
  originalMessage?: string; // The original message from Matrix for logging
  // You might also include a timestamp from the bot, or a unique event ID
};

type ResponseData = {
  message: string;
  internalStaffId?: string; // The ID used within the Nexus OR Planner
  error?: string;
};

// This is a placeholder. In a real system, you'd have a database.
const MOCK_STAFF_MATRIX_ID_TO_INTERNAL_ID_MAP: Record<string, string> = {
  '@julia.woogk:yourhospital.org': 'staff_user_julia', // Example mapping
  '@gerhard.k:yourhospital.org': 'staff_3', // Example mapping to existing staff ID
  // ... add mappings for all relevant staff
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  if (req.method === 'POST') {
    // 1. AUTHENTICATION: Secure this endpoint!
    // Your Matrix bot should send a secret API key in the headers.
    const apiKey = req.headers['x-matrix-bot-auth'];
    if (apiKey !== process.env.MATRIX_BOT_API_KEY) {
      console.warn('Unauthorized attempt to call matrix-notify-unavailability API route.');
      return res.status(401).json({ message: 'Unauthorized: Invalid or missing API key.' });
    }

    const { staffMatrixId, isUnavailable, originalMessage } = req.body as ExpectedRequestBody;

    // 2. VALIDATION:
    if (!staffMatrixId || typeof isUnavailable !== 'boolean') {
      return res.status(400).json({ 
        message: 'Bad Request: Missing staffMatrixId or isUnavailable flag in request body, or isUnavailable is not a boolean.' 
      });
    }

    console.log(
      `[Matrix Integration API] Received unavailability notification. Staff Matrix ID: ${staffMatrixId}, Unavailable: ${isUnavailable}. Original Message: "${originalMessage || 'N/A'}"`
    );

    // 3. MAP MATRIX ID TO INTERNAL STAFF ID:
    // In a real system, this mapping might come from a database linking Matrix users to your application's staff records.
    const internalStaffId = MOCK_STAFF_MATRIX_ID_TO_INTERNAL_ID_MAP[staffMatrixId.toLowerCase()];

    if (!internalStaffId) {
      console.warn(`[Matrix Integration API] Could not map Matrix ID "${staffMatrixId}" to an internal staff ID.`);
      // Depending on your policy, you might still acknowledge the message to Matrix but log an error internally.
      return res.status(404).json({ 
        message: `Staff member with Matrix ID "${staffMatrixId}" not found or not mapped in the planner system.`,
        error: 'Staff mapping not found' 
      });
    }

    // 4. UPDATE PERSISTENT STORAGE (DATABASE):
    // THIS IS WHERE YOU WOULD INTERACT WITH YOUR REAL BACKEND DATABASE.
    // The database would be the single source of truth for staff availability.
    //
    // Example (pseudo-code for database interaction):
    // try {
    //   await db.collection('staff_availability').updateOne(
    //     { internalStaffId: internalStaffId }, // or staffMembersCollection.updateOne({ id: internalStaffId } ...
    //     { $set: { 
    //         isSick: isUnavailable, 
    //         lastReportedVia: 'Matrix', 
    //         lastReportedTime: new Date(), 
    //         lastMatrixMessage: originalMessage || null 
    //       } 
    //     },
    //     { upsert: true } // Create if not exists, or update existing
    //   );
    //   console.log(`[Matrix Integration API] Successfully updated availability for ${internalStaffId} (${staffMatrixId}) to ${isUnavailable} in the database.`);
    // } catch (dbError: any) {
    //   console.error('[Matrix Integration API] Database update failed:', dbError);
    //   // Return an error to the Matrix bot so it knows the operation failed and can potentially retry or notify an admin.
    //   return res.status(500).json({ 
    //     message: 'Failed to update staff status in the planner database.', 
    //     internalStaffId,
    //     error: dbError.message 
    //   });
    // }

    // 5. NOTIFYING THE FRONTEND (Client-side useORData hook):
    // This API route *cannot* directly update the React state in useORData.ts.
    // The frontend (useORData.ts) would need to:
    //    a) Periodically fetch the latest staff/schedule data from an API that reads from your database.
    //    b) Or, use a real-time mechanism like WebSockets (e.g., Socket.IO, Ably, Pusher) 
    //       to be notified by your backend when data in the database changes.
    //
    // For now, the `reportStaffUnavailable` function in `useORData.ts` (when triggered by the UI panel)
    // simulates the client-side reaction to such a change.

    // 6. RESPOND TO THE MATRIX BOT:
    // Let the Matrix bot know the request was received and (conceptually) processed.
    res.status(200).json({ 
      message: 'Unavailability notification from Matrix processed by planner API.', 
      internalStaffId 
    });

  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
