import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: { persistSession: false },
      }
    );

    const { eventId, testOffsetMinutes = 2 } = await req.json();

    if (!eventId) {
      return new Response(
        JSON.stringify({ error: "eventId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch original event
    const { data: originalEvent, error: fetchError } = await supabase
      .from("events")
      .select("*")
      .eq("id", eventId)
      .single();

    if (fetchError || !originalEvent) {
      return new Response(
        JSON.stringify({ error: "Event not found", details: fetchError }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate new release time: NOW + testOffsetMinutes
    const now = new Date();
    const newReleaseTime = new Date(now.getTime() + testOffsetMinutes * 60000);

    // Create cloned event
    const clonedEvent = {
      ...originalEvent,
      id: undefined, // Let Supabase generate new ID
      is_test_event: true,
      cloned_from_id: eventId,
      original_release_time: originalEvent.ticket_release_time,
      ticket_release_time: newReleaseTime.toISOString(),
      name: `[TEST] ${originalEvent.name} (${testOffsetMinutes}m)`,
      test_created_at: now.toISOString(),
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    };

    // Insert cloned event
    const { data: inserted, error: insertError } = await supabase
      .from("events")
      .insert([clonedEvent])
      .select()
      .single();

    if (insertError) {
      console.error("[Clone Event] Insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to create test event", details: insertError }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[Clone Event] Created test event ${inserted.id} from original ${eventId}`);
    console.log(`[Clone Event] Original release: ${originalEvent.ticket_release_time}`);
    console.log(`[Clone Event] Test release: ${newReleaseTime.toISOString()} (${testOffsetMinutes}m from now)`);

    return new Response(
      JSON.stringify({
        success: true,
        testEventId: inserted.id,
        originalEventId: eventId,
        originalReleaseTime: originalEvent.ticket_release_time,
        testReleaseTime: newReleaseTime.toISOString(),
        offsetMinutes: testOffsetMinutes,
        eventName: inserted.name,
        message: `Test event created. Tickets will "release" in ${testOffsetMinutes} minutes.`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("[Clone Event] Unexpected error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: "Internal server error", details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
