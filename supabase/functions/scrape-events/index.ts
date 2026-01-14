import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScrapedEvent {
  name: string;
  date: string;
  venue: string;
  city: string;
  category: string;
  price: number;
  description: string | null;
  image_url: string | null;
  high_demand: boolean;
  ticket_release_time: string;
}

const extractionSchema = {
  type: "object",
  properties: {
    events: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string", description: "Event title" },
          date: { type: "string", description: "Event date" },
          venue: { type: "string", description: "Venue name" },
          city: { type: "string", description: "City name" },
          category: { type: "string", description: "Event category like Concert, Comedy, Theatre, Sports, Workshop" },
          price: { type: "number", description: "Ticket price in INR" },
          description: { type: "string", description: "Brief event description" },
          image_url: { type: "string", description: "Event poster image URL" }
        },
        required: ["name"]
      }
    }
  },
  required: ["events"]
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      console.error('FIRECRAWL_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl connector not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting to scrape events from Indian platforms...');

    const scrapedEvents: ScrapedEvent[] = [];

    // Define scrape targets
    const targets = [
      { url: 'https://in.bookmyshow.com/explore/events-mumbai', city: 'Mumbai' },
      { url: 'https://insider.in/all-events-in-mumbai', city: 'Mumbai' },
      { url: 'https://insider.in/all-events-in-delhi', city: 'Delhi' },
      { url: 'https://insider.in/all-events-in-bengaluru', city: 'Bangalore' },
    ];

    // Scrape each target
    for (const target of targets) {
      console.log(`Scraping ${target.url}...`);
      try {
        const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: target.url,
            formats: ['extract'],
            extract: {
              schema: extractionSchema,
              prompt: 'Extract all events listed on this page including their name, date, venue, city, category, price, description, and image URL.'
            },
            waitFor: 3000,
          }),
        });

        const data = await response.json();
        console.log(`Response from ${target.city}:`, JSON.stringify(data).substring(0, 500));

        if (data.success && data.data?.extract?.events) {
          const events = data.data.extract.events;
          console.log(`Found ${events.length} events from ${target.city}`);
          events.forEach((event: any) => {
            if (event.name) {
              scrapedEvents.push(parseEvent(event, target.city));
            }
          });
        } else if (data.data?.extract) {
          // Try alternate structure
          const extract = data.data.extract;
          if (Array.isArray(extract)) {
            extract.forEach((event: any) => {
              if (event.name) {
                scrapedEvents.push(parseEvent(event, target.city));
              }
            });
          }
        }
      } catch (error) {
        console.error(`Error scraping ${target.url}:`, error);
      }
    }

    console.log(`Total events scraped: ${scrapedEvents.length}`);

    // If no events were scraped, fallback to markdown parsing
    if (scrapedEvents.length === 0) {
      console.log('No structured data found, trying markdown extraction...');
      
      for (const target of targets) {
        try {
          const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              url: target.url,
              formats: ['markdown'],
              waitFor: 2000,
            }),
          });

          const data = await response.json();
          
          if (data.success && data.data?.markdown) {
            const markdown = data.data.markdown;
            console.log(`Got markdown from ${target.city}, length: ${markdown.length}`);
            
            // Parse events from markdown using simple pattern matching
            const eventMatches = parseEventsFromMarkdown(markdown, target.city);
            scrapedEvents.push(...eventMatches);
          }
        } catch (error) {
          console.error(`Error with markdown scrape for ${target.url}:`, error);
        }
      }
    }

    console.log(`Final events count: ${scrapedEvents.length}`);

    if (scrapedEvents.length === 0) {
      // Add sample events for demonstration
      console.log('Adding sample events for demonstration...');
      const sampleEvents = generateSampleIndianEvents();
      scrapedEvents.push(...sampleEvents);
    }

    // Clear existing events and insert new ones
    console.log('Clearing existing events...');
    const { error: deleteError } = await supabase
      .from('events')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (deleteError) {
      console.error('Error deleting existing events:', deleteError);
    }

    // Insert scraped events
    console.log('Inserting events...');
    const { data: insertedEvents, error: insertError } = await supabase
      .from('events')
      .insert(scrapedEvents)
      .select();

    if (insertError) {
      console.error('Error inserting events:', insertError);
      return new Response(
        JSON.stringify({ success: false, error: insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Successfully inserted ${insertedEvents?.length || 0} events`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Successfully stored ${insertedEvents?.length || 0} events`,
        eventsCount: insertedEvents?.length || 0,
        events: insertedEvents
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in scrape-events function:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function parseEvent(event: any, defaultCity: string): ScrapedEvent {
  let eventDate = new Date();
  eventDate.setMonth(eventDate.getMonth() + 1);
  
  if (event.date) {
    const parsedDate = new Date(event.date);
    if (!isNaN(parsedDate.getTime()) && parsedDate > new Date()) {
      eventDate = parsedDate;
    }
  }

  const releaseDate = new Date(eventDate);
  const daysBeforeEvent = Math.floor(Math.random() * 5) + 2;
  releaseDate.setDate(releaseDate.getDate() - daysBeforeEvent);
  
  if (releaseDate < new Date()) {
    releaseDate.setTime(Date.now() + (Math.floor(Math.random() * 30) + 5) * 60 * 1000);
  }

  let price = 500;
  if (event.price) {
    const priceNum = parseInt(String(event.price).replace(/[^\d]/g, ''));
    if (!isNaN(priceNum) && priceNum > 0) {
      price = priceNum;
    }
  }

  const categoryMap: { [key: string]: string } = {
    'concert': 'Concert',
    'music': 'Concert',
    'comedy': 'Comedy',
    'standup': 'Comedy',
    'theatre': 'Theatre',
    'theater': 'Theatre',
    'drama': 'Theatre',
    'sports': 'Sports',
    'cricket': 'Cricket',
    'football': 'Sports',
    'workshop': 'Workshop',
    'conference': 'Conference',
    'festival': 'Festival',
  };

  let category = 'Concert';
  if (event.category) {
    const catLower = String(event.category).toLowerCase();
    for (const [key, value] of Object.entries(categoryMap)) {
      if (catLower.includes(key)) {
        category = value;
        break;
      }
    }
  }

  return {
    name: String(event.name || 'Untitled Event').substring(0, 200),
    date: eventDate.toISOString(),
    venue: String(event.venue || 'Venue TBA').substring(0, 200),
    city: String(event.city || defaultCity).substring(0, 100),
    category: category,
    price: price,
    description: event.description ? String(event.description).substring(0, 500) : null,
    image_url: event.image_url || null,
    high_demand: Math.random() > 0.7,
    ticket_release_time: releaseDate.toISOString(),
  };
}

function parseEventsFromMarkdown(markdown: string, city: string): ScrapedEvent[] {
  const events: ScrapedEvent[] = [];
  
  // Look for event-like patterns in markdown
  const lines = markdown.split('\n');
  let currentEvent: any = {};
  
  for (const line of lines) {
    // Look for headings that might be event names
    if (line.startsWith('##') || line.startsWith('###')) {
      if (currentEvent.name) {
        events.push(parseEvent(currentEvent, city));
      }
      currentEvent = { name: line.replace(/^#+\s*/, '').trim() };
    }
    
    // Look for date patterns
    const dateMatch = line.match(/(\d{1,2})\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*(\d{4})?/i);
    if (dateMatch && currentEvent.name) {
      const month = dateMatch[2];
      const day = dateMatch[1];
      const year = dateMatch[3] || '2026';
      currentEvent.date = `${year}-${getMonthNumber(month)}-${day.padStart(2, '0')}`;
    }
    
    // Look for price patterns
    const priceMatch = line.match(/₹\s*(\d+)/);
    if (priceMatch && currentEvent.name) {
      currentEvent.price = parseInt(priceMatch[1]);
    }
  }
  
  if (currentEvent.name) {
    events.push(parseEvent(currentEvent, city));
  }
  
  return events.slice(0, 10); // Limit to 10 events per source
}

function getMonthNumber(month: string): string {
  const months: { [key: string]: string } = {
    'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
    'may': '05', 'jun': '06', 'jul': '07', 'aug': '08',
    'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
  };
  return months[month.toLowerCase().substring(0, 3)] || '01';
}

function generateSampleIndianEvents(): ScrapedEvent[] {
  const now = new Date();
  
  const events = [
    {
      name: "Arijit Singh Live in Concert",
      venue: "NSCI Dome",
      city: "Mumbai",
      category: "Concert",
      price: 2500,
      description: "Experience the magical voice of Arijit Singh live. An evening of soulful melodies and chart-topping hits.",
      image_url: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800",
      high_demand: true,
    },
    {
      name: "IPL 2026 - Mumbai Indians vs Chennai Super Kings",
      venue: "Wankhede Stadium",
      city: "Mumbai",
      category: "Cricket",
      price: 1500,
      description: "The biggest rivalry in IPL! Watch MI take on CSK in this blockbuster match.",
      image_url: "https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=800",
      high_demand: true,
    },
    {
      name: "Zakir Khan Stand-up Comedy Show",
      venue: "Epicentre",
      city: "Delhi",
      category: "Comedy",
      price: 999,
      description: "Join Zakir Khan for an evening of laughter with his unique style of observational comedy.",
      image_url: "https://images.unsplash.com/photo-1527224857830-43a7acc85260?w=800",
      high_demand: false,
    },
    {
      name: "Diljit Dosanjh Dil-Luminati Tour",
      venue: "Jawaharlal Nehru Stadium",
      city: "Delhi",
      category: "Concert",
      price: 3500,
      description: "The biggest Punjabi pop star brings his Dil-Luminati world tour to Delhi.",
      image_url: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800",
      high_demand: true,
    },
    {
      name: "Sunburn Festival 2026",
      venue: "Vagator Beach",
      city: "Goa",
      category: "Festival",
      price: 4500,
      description: "Asia's biggest electronic dance music festival featuring international DJs.",
      image_url: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800",
      high_demand: true,
    },
    {
      name: "Theatre Olympics - Mahabharata",
      venue: "Ravindra Kalakshetra",
      city: "Bangalore",
      category: "Theatre",
      price: 750,
      description: "An epic theatrical adaptation of the Mahabharata with stunning visuals.",
      image_url: "https://images.unsplash.com/photo-1503095396549-807759245b35?w=800",
      high_demand: false,
    },
    {
      name: "Coldplay Music of the Spheres Tour",
      venue: "DY Patil Stadium",
      city: "Mumbai",
      category: "Concert",
      price: 6500,
      description: "Coldplay returns to India with their spectacular Music of the Spheres World Tour.",
      image_url: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=800",
      high_demand: true,
    },
    {
      name: "Kunal Kamra Live",
      venue: "Phoenix Marketcity",
      city: "Bangalore",
      category: "Comedy",
      price: 799,
      description: "Sharp political satire and witty observations from one of India's top comedians.",
      image_url: "https://images.unsplash.com/photo-1585699324551-f6c309eedeca?w=800",
      high_demand: false,
    },
    {
      name: "Indian Classical Music Festival",
      venue: "Shanmukhananda Hall",
      city: "Mumbai",
      category: "Concert",
      price: 500,
      description: "A celebration of Indian classical music featuring legendary artists.",
      image_url: "https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=800",
      high_demand: false,
    },
    {
      name: "Pro Kabaddi League Finals",
      venue: "Gachibowli Indoor Stadium",
      city: "Hyderabad",
      category: "Sports",
      price: 800,
      description: "Witness the thrilling finale of Pro Kabaddi League 2026.",
      image_url: "https://images.unsplash.com/photo-1461896836934- voices-for-change?w=800",
      high_demand: true,
    },
    {
      name: "Comic Con India",
      venue: "KTPO Convention Center",
      city: "Bangalore",
      category: "Festival",
      price: 1200,
      description: "India's biggest pop culture convention with cosplay, gaming, and celebrity panels.",
      image_url: "https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?w=800",
      high_demand: false,
    },
    {
      name: "Shreya Ghoshal Live",
      venue: "Indoor Stadium",
      city: "Chennai",
      category: "Concert",
      price: 1800,
      description: "The melodious voice of Shreya Ghoshal performing her greatest hits.",
      image_url: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800",
      high_demand: true,
    },
  ];

  return events.map((event, index) => {
    // Stagger event dates over the next 3 months
    const eventDate = new Date(now);
    eventDate.setDate(eventDate.getDate() + (index * 7) + 14); // 2 weeks to 3 months out
    
    // Release time: between 5 minutes and 7 days before event
    const releaseDate = new Date(now);
    if (index < 3) {
      // First 3 events release soon for testing auto-book
      releaseDate.setMinutes(releaseDate.getMinutes() + 5 + (index * 5));
    } else {
      releaseDate.setDate(releaseDate.getDate() + (index * 2));
    }

    return {
      ...event,
      date: eventDate.toISOString(),
      ticket_release_time: releaseDate.toISOString(),
    };
  });
}
