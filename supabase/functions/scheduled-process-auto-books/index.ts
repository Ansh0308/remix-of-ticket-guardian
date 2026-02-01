import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
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
      const eventIds = eventsToUpdate.map((e: any) => e.id);

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
      .select(
        `
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
      `
      )
      .eq("status", "active");

    if (autoBooksError) {
      console.warn(`[Scheduler] Warning fetching auto-books: ${autoBooksError.message}`);
    }

    // Filter auto-books for live events
    const liveAutoBooks =
      autoBooks?.filter(
        (ab: any) =>
          ab.events?.status === "live" && new Date(ab.events?.ticket_release_time) <= now
      ) || [];

    if (liveAutoBooks.length > 0) {
      console.log(`[Scheduler] Found ${liveAutoBooks.length} auto-books to process`);

      // Step 4: Invoke the main processor function (server-side) with these auto-books
      try {
        const { data: result, error: invokeError } = await supabase.functions.invoke(
          "process-auto-books",
          {
            body: {
              autoBookIds: liveAutoBooks.map((ab: any) => ab.id),
              scheduled: true,
              timestamp: now.toISOString(),
            },
          }
        );

        if (invokeError) {
          throw new Error(`Failed invoking process-auto-books: ${invokeError.message}`);
        }

        console.log(`[Scheduler] Processor response:`, result);

        return new Response(
          JSON.stringify({
            success: true,
            message: `Processed ${liveAutoBooks.length} auto-books`,
            eventsUpdated: eventsToUpdate?.length || 0,
            autoBooks: liveAutoBooks.length,
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
