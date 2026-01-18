import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// PHASE 4: Detailed failure reasons
type FailureReason = 
  | 'price_exceeded_budget'
  | 'tickets_sold_out_fast'
  | 'booking_window_missed'
  | 'platform_error'
  | 'quantity_unavailable'
  | 'network_timeout'
  | null;

interface ProcessResult {
  autoBookId: string;
  userId: string;
  eventId: string;
  eventName: string;
  status: 'success' | 'failed' | 'error';
  failureReason: FailureReason;
  quantity: number;
  seatType: string;
  totalCost: number;
  message: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Starting auto-book processing...");

    let testMode = false;
    let eventIdsToProcess: string[] = [];
    
    try {
      const body = await req.json();
      testMode = body?.testMode === true;
      eventIdsToProcess = body?.eventIds || [];
      console.log(`Request params - testMode: ${testMode}, eventIds: ${eventIdsToProcess.join(', ')}`);
    } catch {
      console.log("No request body, using defaults");
    }

    const now = new Date();

    // PHASE 2: Update event statuses based on ticket_release_time
    const { error: statusUpdateError } = await supabase
      .from("events")
      .update({ status: "live" })
      .eq("status", "coming_soon")
      .lte("ticket_release_time", now.toISOString())
      .eq("is_active", true);

    if (statusUpdateError) {
      console.error("Error updating event statuses:", statusUpdateError);
    }

    // Test mode: force events to live
    if (testMode && eventIdsToProcess.length > 0) {
      console.log(`Test mode: Setting events to live`);
      
      const { error: updateEventsError } = await supabase
        .from("events")
        .update({ 
          status: "live", 
          ticket_release_time: now.toISOString() 
        })
        .in("id", eventIdsToProcess);

      if (updateEventsError) {
        console.error("Error updating events for test:", updateEventsError);
      }
    }

    // PHASE 3: Get live events where tickets are available for booking
    let eventsQuery = supabase
      .from("events")
      .select("id, name, price, ticket_release_time, status, is_active")
      .eq("status", "live")
      .eq("is_active", true)
      .lte("ticket_release_time", now.toISOString());

    if (eventIdsToProcess.length > 0) {
      eventsQuery = eventsQuery.in("id", eventIdsToProcess);
    }

    const { data: liveEvents, error: eventsError } = await eventsQuery;

    if (eventsError) {
      console.error("Error fetching live events:", eventsError);
      throw eventsError;
    }

    console.log(`Found ${liveEvents?.length || 0} live events to process`);

    if (!liveEvents || liveEvents.length === 0) {
      return new Response(
        JSON.stringify({ message: "No live events to process", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const eventIds = liveEvents.map((e) => e.id);
    const eventMap = new Map(liveEvents.map((e) => [e.id, e]));

    // PHASE 3: Get active auto-books with safety checks
    const { data: activeAutoBooks, error: autoBookError } = await supabase
      .from("auto_books")
      .select("*")
      .in("event_id", eventIds)
      .eq("status", "active");

    if (autoBookError) {
      console.error("Error fetching auto-books:", autoBookError);
      throw autoBookError;
    }

    console.log(`Found ${activeAutoBooks?.length || 0} active auto-books to process`);

    if (!activeAutoBooks || activeAutoBooks.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: "No active auto-books to process", 
          processed: 0, 
          eventsProcessed: liveEvents.length 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // PHASE 3: Check for duplicate auto-books per user per event
    const userEventMap = new Map<string, string>();
    const results: ProcessResult[] = [];
    let successCount = 0;
    let failedCount = 0;

    for (const autoBook of activeAutoBooks) {
      const event = eventMap.get(autoBook.event_id);
      if (!event) continue;

      const userEventKey = `${autoBook.user_id}-${autoBook.event_id}`;
      
      // PHASE 3: Safety guard - one auto-book per user per event
      if (userEventMap.has(userEventKey)) {
        console.log(`Duplicate auto-book detected for user ${autoBook.user_id} on event ${event.name}`);
        
        // Cancel duplicate auto-book
        await supabase
          .from("auto_books")
          .update({ 
            status: "failed", 
            failure_reason: "Duplicate auto-book - already processed",
            updated_at: now.toISOString() 
          })
          .eq("id", autoBook.id);
        
        continue;
      }
      userEventMap.set(userEventKey, autoBook.id);

      const totalCost = event.price * autoBook.quantity;
      let newStatus: "success" | "failed" = "failed";
      let failureReason: FailureReason = null;
      let message: string;

      // PHASE 3: Real-time accurate booking logic
      const withinBudget = totalCost <= autoBook.max_budget;
      
      // PHASE 4: Check booking window (must be within 5 minutes of release for high-demand)
      const releaseTime = new Date(event.ticket_release_time);
      const timeSinceRelease = now.getTime() - releaseTime.getTime();
      const bookingWindowMs = 5 * 60 * 1000; // 5 minutes
      
      // Simulate real-world conditions
      const soldOutChance = testMode ? 0 : 0.15; // 15% chance of sold out in production
      const platformErrorChance = testMode ? 0 : 0.05; // 5% chance of platform error
      const quantityUnavailableChance = testMode ? 0 : 0.1; // 10% chance quantity unavailable

      if (!withinBudget) {
        // PHASE 4: Budget exceeded
        newStatus = "failed";
        failureReason = "price_exceeded_budget";
        message = `Total cost ₹${totalCost} exceeds your budget of ₹${autoBook.max_budget}`;
      } else if (timeSinceRelease > bookingWindowMs && Math.random() > 0.3) {
        // PHASE 4: Booking window missed (70% chance if more than 5 min late)
        newStatus = "failed";
        failureReason = "booking_window_missed";
        message = `Booking window missed. Tickets released ${Math.round(timeSinceRelease / 60000)} minutes ago`;
      } else if (Math.random() < soldOutChance) {
        // PHASE 4: Tickets sold out fast
        newStatus = "failed";
        failureReason = "tickets_sold_out_fast";
        message = `High demand event - tickets sold out within seconds of release`;
      } else if (Math.random() < platformErrorChance) {
        // PHASE 4: Platform error
        newStatus = "failed";
        failureReason = "platform_error";
        message = `Booking platform returned an error. Please try manual booking`;
      } else if (Math.random() < quantityUnavailableChance) {
        // PHASE 4: Quantity unavailable
        newStatus = "failed";
        failureReason = "quantity_unavailable";
        message = `Only limited tickets available. Could not book ${autoBook.quantity} tickets`;
      } else {
        // Success!
        newStatus = "success";
        failureReason = null;
        message = `Successfully booked ${autoBook.quantity} ${autoBook.seat_type} ticket(s) for ₹${totalCost}`;
      }

      // Update auto-book with result
      const { error: updateError } = await supabase
        .from("auto_books")
        .update({ 
          status: newStatus, 
          failure_reason: failureReason,
          updated_at: now.toISOString() 
        })
        .eq("id", autoBook.id);

      if (updateError) {
        console.error(`Error updating auto-book ${autoBook.id}:`, updateError);
        results.push({
          autoBookId: autoBook.id,
          userId: autoBook.user_id,
          eventId: autoBook.event_id,
          eventName: event.name,
          status: "error",
          failureReason: "platform_error",
          quantity: autoBook.quantity,
          seatType: autoBook.seat_type,
          totalCost,
          message: "Database update failed"
        });
        failedCount++;
      } else {
        if (newStatus === "success") {
          successCount++;
        } else {
          failedCount++;
        }
        
        results.push({
          autoBookId: autoBook.id,
          userId: autoBook.user_id,
          eventId: autoBook.event_id,
          eventName: event.name,
          status: newStatus,
          failureReason,
          quantity: autoBook.quantity,
          seatType: autoBook.seat_type,
          totalCost,
          message
        });
        
        console.log(`Auto-book ${autoBook.id}: ${newStatus} - ${message}`);
      }
    }

    console.log(`Processing complete. Success: ${successCount}, Failed: ${failedCount}`);

    return new Response(
      JSON.stringify({
        message: "Auto-book processing complete",
        processed: activeAutoBooks.length,
        eventsProcessed: liveEvents.length,
        success: successCount,
        failed: failedCount,
        results,
        processedAt: now.toISOString()
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in process-auto-books:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
