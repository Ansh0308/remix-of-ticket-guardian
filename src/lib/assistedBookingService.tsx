import { AutoBook, Event } from '@/types';

/**
 * Assisted Booking Email Service
 * 
 * Handles sending email notifications for successful auto-book availability checks.
 * IMPORTANT: This does NOT perform any booking, payment, or automation beyond redirection.
 */

export interface AssistedBookingEmailPayload {
  autoBookId: string;
  userId: string;
  userEmail: string;
  userName: string;
  eventName: string;
  eventUrl: string;
  seatType: string;
  quantity: number;
}

/**
 * Triggers assisted booking notification when auto_book status changes to success
 * This should be called by real-time listeners
 */
export const triggerAssistedBookingOnSuccess = async (
  autoBook: AutoBook,
  event: Event,
  userProfile: { name: string; email: string }
): Promise<void> => {
  // Safety check: only trigger for success status
  if (autoBook.status !== 'success') {
    console.log('[Assisted Booking] Skipping trigger - status is not success:', autoBook.status);
    return;
  }

  // Safety check: ensure we have required data
  if (!event?.event_url || !userProfile?.email) {
    console.warn('[Assisted Booking] Missing required data for trigger:', {
      hasEventUrl: !!event?.event_url,
      hasEmail: !!userProfile?.email,
    });
    return;
  }

  console.log('[Assisted Booking] Notification triggered for auto-book:', autoBook.id);
  // In production, this would queue an email via an edge function
};

/**
 * Get email template content for assisted booking
 * Used for preview or email service integration
 */
export const getAssistedBookingEmailTemplate = (
  payload: AssistedBookingEmailPayload
): { subject: string; body: string; htmlBody: string } => {
  const subject = `Tickets are live for ${payload.eventName}`;

  const body = `Hi ${payload.userName},

Tickets for ${payload.eventName} are available right now.

Click below to continue booking on the official platform before they sell out.

Book Now: ${payload.eventUrl}

Details:
- Seat Type: ${payload.seatType}
- Quantity: ${payload.quantity}

Hurry, tickets are selling fast!

Best regards,
BookIt.ai Team`;

  const htmlBody = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.5; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
    .cta-button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
    .details { background: white; padding: 15px; border-radius: 4px; margin: 20px 0; border-left: 4px solid #667eea; }
    .footer { color: #999; font-size: 12px; margin-top: 20px; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Tickets are Live!</h1>
    </div>
    <div class="content">
      <p>Hi ${payload.userName},</p>
      
      <p>Tickets for <strong>${payload.eventName}</strong> are available right now.</p>
      
      <p>Click below to continue booking on the official platform before they sell out.</p>
      
      <center>
        <a href="${payload.eventUrl}" class="cta-button" target="_blank" rel="noopener noreferrer">
          Book Now on Official Platform →
        </a>
      </center>
      
      <div class="details">
        <p><strong>Booking Details:</strong></p>
        <p>
          Seat Type: <strong>${payload.seatType}</strong><br>
          Quantity: <strong>${payload.quantity}</strong>
        </p>
      </div>
      
      <p style="color: #d32f2f; font-weight: bold;">⚡ Hurry, tickets are selling fast!</p>
      
      <p>Best regards,<br><strong>BookIt.ai Team</strong></p>
    </div>
    <div class="footer">
      <p>This email was sent because tickets matching your preferences became available. Need help? Contact us.</p>
      <p>© BookIt.ai - Intelligent ticket booking assistant</p>
    </div>
  </div>
</body>
</html>`;

  return { subject, body, htmlBody };
};

/**
 * Check if an email has already been sent for this auto-book
 * Prevents duplicate emails - simplified version that uses local tracking
 */
export const hasAssistedBookingEmailBeenSent = async (
  autoBookId: string
): Promise<boolean> => {
  // For now, return false - in production this would check the database
  console.log('[Assisted Booking] Checking if email sent for:', autoBookId);
  return false;
};
