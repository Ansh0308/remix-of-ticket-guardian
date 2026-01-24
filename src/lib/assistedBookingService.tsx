import { supabase } from '@/integrations/supabase/client';
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
 * Queues an assisted booking email notification
 * Called when auto_book.status transitions to 'success'
 */
export const queueAssistedBookingEmail = async (
  payload: AssistedBookingEmailPayload
): Promise<{ success: boolean; messageId?: string; error?: string }> => {
  try {
    // Build URL with tracking parameters
    const urlWithTracking = `${payload.eventUrl}${payload.eventUrl.includes('?') ? '&' : '?'}source=bookit_ai&assisted_booking=true`;

    // Create email record in assisted_booking_emails table
    const { data, error } = await supabase
      .from('assisted_booking_emails')
      .insert({
        auto_book_id: payload.autoBookId,
        user_id: payload.userId,
        user_email: payload.userEmail,
        user_name: payload.userName,
        event_name: payload.eventName,
        event_url: urlWithTracking,
        seat_type: payload.seatType,
        quantity: payload.quantity,
        status: 'pending',
        attempt_count: 0,
      })
      .select('id')
      .single();

    if (error) {
      console.error('[Assisted Booking] Email queue error:', error);
      return {
        success: false,
        error: `Failed to queue email: ${error.message}`,
      };
    }

    console.log('[Assisted Booking] Email queued successfully:', data?.id);

    // In a production system, you'd trigger an email service here
    // For now, this is queued and would be processed by a background job
    // Example: await triggerEmailService(data.id);

    return {
      success: true,
      messageId: data?.id,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Assisted Booking] Exception in queueAssistedBookingEmail:', errorMessage);
    return {
      success: false,
      error: errorMessage,
    };
  }
};

/**
 * Triggers assisted booking email when auto_book status changes to success
 * This should be called by real-time listeners or background jobs
 */
export const triggerAssistedBookingOnSuccess = async (
  autoBook: AutoBook,
  event: Event,
  userProfile: { name: string; email: string }
): Promise<void> => {
  // Safety check: only trigger for success status
  if (autoBook.status !== 'success') {
    console.log('[Assisted Booking] Skipping email trigger - status is not success:', autoBook.status);
    return;
  }

  // Safety check: ensure we have required data
  if (!event?.event_url || !userProfile?.email) {
    console.warn('[Assisted Booking] Missing required data for email trigger:', {
      hasEventUrl: !!event?.event_url,
      hasEmail: !!userProfile?.email,
    });
    return;
  }

  const seatLabels = {
    general: 'General',
    premium: 'Premium',
    vip: 'VIP',
  };

  await queueAssistedBookingEmail({
    autoBookId: autoBook.id,
    userId: autoBook.user_id,
    userEmail: userProfile.email,
    userName: userProfile.name || 'Valued Customer',
    eventName: event.name,
    eventUrl: event.event_url,
    seatType: seatLabels[autoBook.seat_type] || autoBook.seat_type,
    quantity: autoBook.quantity,
  });
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
 * Prevents duplicate emails
 */
export const hasAssistedBookingEmailBeenSent = async (
  autoBookId: string
): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('assisted_booking_emails')
      .select('id')
      .eq('auto_book_id', autoBookId)
      .eq('status', 'sent')
      .maybeSingle();

    if (error) {
      console.error('[Assisted Booking] Error checking sent email status:', error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error('[Assisted Booking] Exception in hasAssistedBookingEmailBeenSent:', error);
    return false;
  }
};
