import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"
import { GoogleGenAI } from "npm:@google/genai"
import process from "node:process"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { query, user_id } = await req.json()

    if (!query) throw new Error('Missing query')

    // Initialize Clients
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const supabase = createClient(
      process.env.SUPABASE_URL ?? '',
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
    )

    // 1. Generate Embedding for Query
    const embeddingResp = await ai.models.embedContent({
      model: "text-embedding-004",
      content: query,
    });
    const queryEmbedding = embeddingResp.embedding?.values;

    if (!queryEmbedding) {
        throw new Error("Failed to generate embedding");
    }

    // 2. Perform Vector Search via RPC
    const { data: interactions, error: searchError } = await supabase.rpc('match_interactions', {
      query_embedding: queryEmbedding,
      match_threshold: 0.5, // Adjust based on precision needs
      match_count: 5
    });

    if (searchError) throw searchError;

    let contextText = "";
    let relatedContacts: any[] = [];
    
    // 3. Process matches to build context
    if (interactions && interactions.length > 0) {
      // Fetch associated contacts for these interactions to give the AI names/companies
      const contactIds = interactions.reduce((acc: string[], curr: any) => {
         // Assuming interactions table has contact_ids array, need to fetch raw data to get it 
         // But the RPC match_interactions usually only returns id/content/similarity unless modified.
         // Let's fetch the full interaction rows for these IDs.
         return acc; // We'll do a separate query below for simplicity
      }, []);
      
      const interactionIds = interactions.map((i: any) => i.id);
      
      const { data: fullInteractions } = await supabase
        .from('interactions')
        .select(`
            raw_text, 
            contact_ids
        `)
        .in('id', interactionIds);
      
      const allContactIds = new Set<string>();
      
      if (fullInteractions) {
          fullInteractions.forEach((row: any) => {
             contextText += `Note: "${row.raw_text}"\n`;
             if (row.contact_ids) {
                 row.contact_ids.forEach((id: string) => allContactIds.add(id));
             }
          });
      }

      // 4. Fetch Contact Details
      if (allContactIds.size > 0) {
        const { data: contacts } = await supabase
            .from('contacts')
            .select('id, first_name, last_name, company, role, tags')
            .in('id', Array.from(allContactIds));
            
        if (contacts) {
            relatedContacts = contacts;
            const contactContext = contacts.map(c => 
                `Contact: ${c.first_name} ${c.last_name} (${c.role} at ${c.company})`
            ).join('\n');
            contextText = `Known Contacts Context:\n${contactContext}\n\nRelated Notes:\n${contextText}`;
        }
      }
    }

    // 5. Synthesize Answer
    let answer = "I don't recall anyone matching that description in your network.";

    if (contextText && interactions.length > 0) {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `Context:\n${contextText}\n\nUser Question: "${query}"\n\nAnswer the question based strictly on the context provided. If the answer isn't in the context, say you don't know. Keep it conversational but concise.`,
            config: {
                systemInstruction: "You are Cortex, a helpful personal CRM assistant.",
            }
        });
        answer = response.text || answer;
    }

    return new Response(
      JSON.stringify({ 
        answer, 
        contacts: relatedContacts 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})