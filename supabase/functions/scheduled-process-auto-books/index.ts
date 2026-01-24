import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { env } from "https://deno.land/std@0.168.0/dotenv/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const envData = await env({ path: "./.env" });
    const supabaseUrl = envData.SUPABASE_URL!;
    const supabaseServiceKey = envData.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("[Scheduler] Auto-book scheduler triggered");

    const now = new Date();

    // Step 1: Find events that just went live (ticket_release_time has passed)
    console.log(`[Scheduler] Checking for events with ticket_release_time <= ${now.toISOString()}`);

    const { data: eventsToUpdate, error: eventsError } = await supabase
      .from("events")
      .select("id, name, ticket_release_time, status")
      .eq("status", "coming_soon")
      .eq("is_active", true)
      .lte("ticket_release_time", now.toISOString());

    if (eventsError) {
      throw new Error(`Failed to fetch events: ${eventsError.message}`);
    }

    console.log(`[Scheduler] Found ${eventsToUpdate?.length || 0} events ready to go live`);

    // Step 2: Update event statuses to "live"
    if (eventsToUpdate && eventsToUpdate.length > 0) {
      const eventIds = eventsToUpdate.map((e) => e.id);

      const { error: updateError } = await supabase
        .from("events")
        .update({ status: "live", updated_at: now.toISOString() })
        .in("id", eventIds);

      if (updateError) {
        throw new Error(`Failed to update event statuses: ${updateError.message}`);
      }

      console.log(`[Scheduler] Updated ${eventIds.length} events to live status`);
    }

    // Step 3: Get active auto-books for live events
    console.log("[Scheduler] Fetching active auto-books for live events");

    const { data: autoBooks, error: autoBooksError } = await supabase
      .from("auto_books")
      .select(`
        id,
        user_id,
        event_id,
        status,
        quantity,
        seat_type,
        max_budget,
        events!auto_books_event_id_fkey(
          id,
          name,
          price,
          status,
          ticket_release_time
        )
      `)
      .eq("status", "active")
      .in("events.status", ["live"])
      .lte("events.ticket_release_time", now.toISOString());

    if (autoBooksError) {
      console.warn(`[Scheduler] Warning fetching auto-books: ${autoBooksError.message}`);
    }

    if (autoBooks && autoBooks.length > 0) {
      console.log(`[Scheduler] Found ${autoBooks.length} auto-books to process`);

      // Step 4: Call the main processor function with these auto-books
      try {
        const processorUrl = `${supabaseUrl}/functions/v1/process-auto-books`;

        const response = await fetch(processorUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            autoBookIds: autoBooks.map((ab) => ab.id),
            scheduled: true,
            timestamp: now.toISOString(),
          }),
        });

        const result = await response.json();
        console.log(`[Scheduler] Processor response:`, result);

        return new Response(
          JSON.stringify({
            success: true,
            message: `Processed ${autoBooks.length} auto-books`,
            eventsUpdated: eventsToUpdate?.length || 0,
            autoBooks: autoBooks.length,
            timestamp: now.toISOString(),
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          }
        );
      } catch (processorError) {
        console.error("[Scheduler] Error calling processor:", processorError);
        throw processorError;
      }
    } else {
      console.log("[Scheduler] No auto-books found to process");

      return new Response(
        JSON.stringify({
          success: true,
          message: "No auto-books to process",
          eventsUpdated: eventsToUpdate?.length || 0,
          autoBooks: 0,
          timestamp: now.toISOString(),
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }
  } catch (error) {
    console.error("[Scheduler] Fatal error:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
