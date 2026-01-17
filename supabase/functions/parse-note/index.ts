import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"
import { GoogleGenAI, Type } from "npm:@google/genai"
import process from "node:process"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { text, user_id } = await req.json()

    if (!text || !user_id) {
      throw new Error('Missing text or user_id in request body')
    }

    // Initialize Google GenAI
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    // Initialize Supabase Admin Client
    // We use the Service Role Key to bypass RLS when checking for cross-reference or inserting data
    const supabaseClient = createClient(
      process.env.SUPABASE_URL ?? '',
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
    )

    console.log(`Processing note for user ${user_id}: ${text.substring(0, 50)}...`)

    // 1. Run Gemini calls in parallel: Parsing and Embedding
    // Using gemini-3-flash-preview for fast extraction
    // Using text-embedding-004 for embeddings
    const [extractionResponse, embeddingResponse] = await Promise.all([
      ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: text,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              people: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    first_name: { type: Type.STRING },
                    last_name: { type: Type.STRING },
                    company: { type: Type.STRING },
                    role: { type: Type.STRING },
                    tags: { type: Type.ARRAY, items: { type: Type.STRING } },
                  },
                },
              },
              summary: { type: Type.STRING },
            },
          },
          systemInstruction: `You are a CRM extraction engine. Extract people, companies, roles, and tags. 
            - "tags" should be an array of strings inferring context (e.g., "investor", "lead", "friend").
            - If a name field is unknown, use an empty string.`,
        },
      }),
      ai.models.embedContent({
        model: "text-embedding-004",
        content: text,
      }),
    ])

    const result = JSON.parse(extractionResponse.text || "{}")
    const embedding = embeddingResponse.embedding?.values

    if (!embedding) {
        throw new Error("Failed to generate embedding");
    }
    
    const people = result.people || []
    const contactIds: string[] = []

    // 2. Process extracted people
    for (const person of people) {
      const firstName = person.first_name?.trim()
      const lastName = person.last_name?.trim() || ''

      // Skip if no first name
      if (!firstName) continue

      // Fuzzy Match Strategy (Simplified for MVP):
      // Check for Exact Match on (user_id, first_name, last_name) (case-insensitive)
      const { data: existingContact } = await supabaseClient
        .from('contacts')
        .select('id')
        .eq('user_id', user_id)
        .ilike('first_name', firstName)
        .ilike('last_name', lastName)
        .maybeSingle()

      if (existingContact) {
        // Contact exists: Update metadata if needed (not implemented here) and link
        contactIds.push(existingContact.id)
        
        // Update last interaction
        await supabaseClient
            .from('contacts')
            .update({ last_interaction_at: new Date().toISOString() })
            .eq('id', existingContact.id)

      } else {
        // Contact does not exist: Create new
        const { data: newContact, error: insertError } = await supabaseClient
          .from('contacts')
          .insert({
            user_id: user_id,
            first_name: firstName,
            last_name: lastName,
            company: person.company,
            role: person.role,
            tags: person.tags || [],
            status: 'active',
            last_interaction_at: new Date().toISOString()
          })
          .select('id')
          .single()

        if (insertError) {
          console.error(`Failed to insert contact ${firstName}:`, insertError)
        } else if (newContact) {
          contactIds.push(newContact.id)
        }
      }
    }

    // 3. Insert the Interaction with the embedding
    const { error: interactionError } = await supabaseClient
      .from('interactions')
      .insert({
        user_id: user_id,
        raw_text: text,
        contact_ids: contactIds,
        embedding: embedding
      })

    if (interactionError) {
      throw new Error(`Failed to save interaction: ${interactionError.message}`)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: {
            summary: result.summary,
            contacts_processed: contactIds.length
        } 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Error in parse-note function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})