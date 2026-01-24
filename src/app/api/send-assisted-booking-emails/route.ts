import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * API Route to send pending assisted booking emails
 * This should be called by a scheduled job or trigger
 * 
 * IMPORTANT: This is a helper endpoint for manual/scheduled email delivery.
 * In production, integrate with your email service (SendGrid, AWS SES, Resend, etc.)
 */

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function POST(request: NextRequest) {
  try {
    // Verify authorization (optional - add your own auth logic)
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch pending emails (limit to 50 per request)
    const { data: pendingEmails, error: fetchError } = await supabase
      .from('assisted_booking_emails')
      .select('*')
      .eq('status', 'pending')
      .lt('attempt_count', 3) // Only retry up to 3 times
      .order('created_at', { ascending: true })
      .limit(50);

    if (fetchError) {
      console.error('[Email Service] Error fetching pending emails:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch pending emails' },
        { status: 500 }
      );
    }

    console.log(`[Email Service] Found ${pendingEmails?.length || 0} pending emails`);

    if (!pendingEmails || pendingEmails.length === 0) {
      return NextResponse.json({
        success: true,
        sent: 0,
        failed: 0,
        message: 'No pending emails',
      });
    }

    const results = {
      sent: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Process each email
    for (const email of pendingEmails) {
      try {
        // Build email template
        const subject = `Tickets are live for ${email.event_name}`;
        const htmlBody = buildEmailTemplate(email);

        // TODO: Send email through your email service
        // Example using SendGrid:
        // await sendgrid.send({ to: email.user_email, subject, html: htmlBody });
        
        // For now, we'll just log and mark as sent
        console.log(`[Email Service] Would send email to ${email.user_email}`);

        // Update email status to 'sent'
        const { error: updateError } = await supabase
          .from('assisted_booking_emails')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
          })
          .eq('id', email.id);

        if (updateError) {
          throw updateError;
        }

        results.sent++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[Email Service] Failed to send email ${email.id}:`, errorMessage);

        // Increment attempt count
        const { error: updateError } = await supabase
          .from('assisted_booking_emails')
          .update({
            attempt_count: (email.attempt_count || 0) + 1,
            last_error: errorMessage,
          })
          .eq('id', email.id);

        if (updateError) {
          console.error('[Email Service] Failed to update attempt count:', updateError);
        }

        results.failed++;
        results.errors.push(`${email.id}: ${errorMessage}`);
      }
    }

    return NextResponse.json({
      success: true,
      sent: results.sent,
      failed: results.failed,
      errors: results.errors.length > 0 ? results.errors : undefined,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Email Service] Fatal error:', errorMessage);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * Build HTML email template for assisted booking notification
 */
function buildEmailTemplate(email: {
  user_name: string;
  event_name: string;
  event_url: string;
  seat_type: string;
  quantity: number;
}): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; 
      line-height: 1.6; 
      color: #333; 
      margin: 0; 
      padding: 0; 
    }
    .container { 
      max-width: 600px; 
      margin: 0 auto; 
      background: #ffffff; 
    }
    .header { 
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
      color: white; 
      padding: 40px 20px; 
      text-align: center; 
    }
    .header h1 { 
      margin: 0; 
      font-size: 28px; 
      font-weight: bold; 
    }
    .content { 
      padding: 40px 20px; 
    }
    .greeting { 
      font-size: 16px; 
      margin-bottom: 20px; 
    }
    .message { 
      font-size: 16px; 
      margin-bottom: 30px; 
      line-height: 1.6; 
    }
    .cta-section { 
      text-align: center; 
      margin: 30px 0; 
    }
    .cta-button { 
      display: inline-block; 
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
      color: white; 
      padding: 14px 40px; 
      text-decoration: none; 
      border-radius: 6px; 
      font-weight: bold; 
      font-size: 16px; 
    }
    .cta-button:hover { 
      opacity: 0.9; 
    }
    .details { 
      background: #f5f5f5; 
      padding: 20px; 
      border-radius: 6px; 
      margin: 20px 0; 
      border-left: 4px solid #667eea; 
    }
    .detail-row { 
      margin: 8px 0; 
    }
    .detail-label { 
      color: #666; 
      font-size: 14px; 
    }
    .detail-value { 
      font-weight: bold; 
      color: #333; 
    }
    .warning { 
      color: #d32f2f; 
      font-weight: bold; 
      margin: 20px 0; 
    }
    .footer { 
      background: #f9f9f9; 
      padding: 20px; 
      text-align: center; 
      color: #999; 
      font-size: 12px; 
      border-top: 1px solid #eee; 
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Tickets are Live!</h1>
    </div>
    
    <div class="content">
      <div class="greeting">
        Hi ${escapeHtml(email.user_name)},
      </div>
      
      <div class="message">
        Tickets for <strong>${escapeHtml(email.event_name)}</strong> are available right now.
      </div>
      
      <div class="message">
        Click below to continue booking on the official platform before they sell out.
      </div>
      
      <div class="cta-section">
        <a href="${escapeHtml(email.event_url)}" class="cta-button" target="_blank" rel="noopener noreferrer">
          Book Now on Official Platform →
        </a>
      </div>
      
      <div class="details">
        <div class="detail-row">
          <div class="detail-label">Seat Type:</div>
          <div class="detail-value">${escapeHtml(email.seat_type)}</div>
        </div>
        <div class="detail-row">
          <div class="detail-label">Quantity:</div>
          <div class="detail-value">${email.quantity} tickets</div>
        </div>
      </div>
      
      <div class="warning">
        ⚡ Hurry, tickets are selling fast!
      </div>
      
      <div style="margin-top: 30px;">
        Best regards,<br>
        <strong>BookIt.ai Team</strong>
      </div>
    </div>
    
    <div class="footer">
      <p>This email was sent because tickets matching your preferences became available.</p>
      <p>© 2024 BookIt.ai - Intelligent Ticket Booking Assistant</p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Escape HTML to prevent injection
 */
function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
}
