import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Starting auto-book processing...");

    // Parse request body for optional parameters
    let testMode = false;
    let eventIdsToProcess: string[] = [];
    
    try {
      const body = await req.json();
      testMode = body?.testMode === true;
      eventIdsToProcess = body?.eventIds || [];
      console.log(`Request params - testMode: ${testMode}, eventIds: ${eventIdsToProcess.join(', ')}`);
    } catch {
      // No body or invalid JSON, proceed with defaults
      console.log("No request body, using defaults");
    }

    // If in test mode with specific event IDs, update those events to be live first
    if (testMode && eventIdsToProcess.length > 0) {
      console.log(`Test mode: Setting events to live and updating ticket release time`);
      
      const { error: updateEventsError } = await supabase
        .from("events")
        .update({ 
          status: "live", 
          ticket_release_time: new Date().toISOString() 
        })
        .in("id", eventIdsToProcess);

      if (updateEventsError) {
        console.error("Error updating events for test:", updateEventsError);
      } else {
        console.log(`Updated ${eventIdsToProcess.length} events to live status`);
      }
    }

    // Get all live events where ticket release time has passed
    const now = new Date().toISOString();
    let eventsQuery = supabase
      .from("events")
      .select("id, name, price, ticket_release_time")
      .eq("status", "live")
      .lte("ticket_release_time", now);

    // If specific event IDs provided, filter to those
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

    // Get all active auto-books for these events
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
        JSON.stringify({ message: "No active auto-books to process", processed: 0, eventsProcessed: liveEvents.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results = {
      success: 0,
      failed: 0,
      details: [] as Array<{ 
        autoBookId: string;
        userId: string; 
        eventName: string; 
        status: string; 
        reason?: string;
        quantity: number;
        seatType: string;
      }>,
    };

    // Process each auto-book
    for (const autoBook of activeAutoBooks) {
      const event = eventMap.get(autoBook.event_id);
      if (!event) continue;

      const totalCost = event.price * autoBook.quantity;
      let newStatus: "success" | "failed";
      let reason: string | undefined;

      // Simulate booking logic:
      // - Check if total cost is within budget
      // - In test mode, always succeed if within budget
      // - Otherwise, simulate ~80% success rate for realistic behavior
      const withinBudget = totalCost <= autoBook.max_budget;
      const randomSuccess = testMode ? true : Math.random() < 0.8; // 100% in test mode, 80% normally

      if (!withinBudget) {
        newStatus = "failed";
        reason = `Total cost ₹${totalCost} exceeds budget ₹${autoBook.max_budget}`;
      } else if (!randomSuccess) {
        newStatus = "failed";
        reason = "Tickets sold out - high demand event";
      } else {
        newStatus = "success";
        reason = `Successfully booked ${autoBook.quantity} ${autoBook.seat_type} ticket(s) for ₹${totalCost}`;
      }

      // Update auto-book status
      const { error: updateError } = await supabase
        .from("auto_books")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", autoBook.id);

      if (updateError) {
        console.error(`Error updating auto-book ${autoBook.id}:`, updateError);
        results.failed++;
        results.details.push({
          autoBookId: autoBook.id,
          userId: autoBook.user_id,
          eventName: event.name,
          status: "error",
          reason: "Database update failed",
          quantity: autoBook.quantity,
          seatType: autoBook.seat_type,
        });
      } else {
        if (newStatus === "success") {
          results.success++;
        } else {
          results.failed++;
        }
        results.details.push({
          autoBookId: autoBook.id,
          userId: autoBook.user_id,
          eventName: event.name,
          status: newStatus,
          reason,
          quantity: autoBook.quantity,
          seatType: autoBook.seat_type,
        });
        console.log(`Auto-book ${autoBook.id}: ${newStatus} - ${reason}`);
      }
    }

    console.log(`Processing complete. Success: ${results.success}, Failed: ${results.failed}`);

    return new Response(
      JSON.stringify({
        message: "Auto-book processing complete",
        processed: activeAutoBooks.length,
        eventsProcessed: liveEvents.length,
        results,
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
