import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    // Get auto-books that are active and their events have reached/passed release time
    const { data: autoBooks, error: fetchError } = await supabase
      .from('auto_books')
      .select('*, events(*)')
      .eq('status', 'active')
      .lte('events.ticket_release_time', new Date().toISOString());

    if (fetchError) {
      throw fetchError;
    }

    if (!autoBooks || autoBooks.length === 0) {
      return NextResponse.json({
        message: 'No active auto-books to process',
        processed: 0,
        results: [],
      });
    }

    const results: any[] = [];
    let successCount = 0;
    let failedCount = 0;

    for (const autoBook of autoBooks) {
      const event = autoBook.events;
      const now = new Date();
      const releaseTime = new Date(event.ticket_release_time);
      const timeSinceRelease = now.getTime() - releaseTime.getTime();
      const totalCost = event.price * autoBook.quantity;

      let newStatus: 'success' | 'failed' = 'failed';
      let failureReason: string | null = null;
      let message: string = '';

      // DETERMINISTIC LOGIC
      const withinBudget = totalCost <= autoBook.max_budget;

      if (!withinBudget) {
        newStatus = 'failed';
        failureReason = 'price_exceeded_budget';
        message = `Budget exceeded: ₹${totalCost} > ₹${autoBook.max_budget}`;
      } else if (timeSinceRelease > 5 * 60 * 1000) {
        newStatus = 'failed';
        failureReason = 'booking_window_missed';
        message = `Booking window closed (${Math.round(timeSinceRelease / 60000)}m late)`;
      } else {
        newStatus = 'success';
        failureReason = null;
        message = `Availability confirmed - ${autoBook.quantity}x ${autoBook.seat_type}`;
      }

      // Update auto-book status
      const { error: updateError } = await supabase
        .from('auto_books')
        .update({
          status: newStatus,
          failure_reason: failureReason,
          availability_checked_at: now.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq('id', autoBook.id);

      if (!updateError) {
        if (newStatus === 'success') {
          successCount++;
        } else {
          failedCount++;
        }
      }

      results.push({
        autoBookId: autoBook.id,
        eventName: event.name,
        status: newStatus,
        message,
        totalCost,
      });
    }

    return NextResponse.json({
      message: 'Auto-books processed successfully',
      processed: autoBooks.length,
      success: successCount,
      failed: failedCount,
      results,
    });
  } catch (error: any) {
    console.error('Error processing auto-books:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
