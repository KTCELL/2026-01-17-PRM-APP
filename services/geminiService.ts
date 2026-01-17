import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Contact } from "../types";

// Initialize Gemini Client
// NOTE: In a real production app, you should proxy these requests through a backend 
// to avoid exposing the API key if RLS/Auth is a concern.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const MODEL_FAST = "gemini-3-flash-preview";

// Schema for structured contact extraction
const contactSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    firstName: { type: Type.STRING, description: "First name of the contact" },
    lastName: { type: Type.STRING, description: "Last name of the contact. Empty string if unknown." },
    role: { type: Type.STRING, description: "Job title or role" },
    company: { type: Type.STRING, description: "Company or organization name" },
    email: { type: Type.STRING, description: "Email address if present" },
    phone: { type: Type.STRING, description: "Phone number if present" },
    interests: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING },
      description: "List of interests, hobbies, or personal details"
    },
    notes: { type: Type.STRING, description: "A summary of the interaction or context of the meeting" },
  },
  required: ["firstName", "interests", "notes"],
};

export const parseNoteToContact = async (text: string, audioBase64?: string): Promise<Partial<Contact>> => {
  try {
    const parts: any[] = [];
    
    if (audioBase64) {
      parts.push({
        inlineData: {
          mimeType: "audio/webm", // Assuming webm from MediaRecorder, Gemini is flexible
          data: audioBase64
        }
      });
    }

    if (text) {
      parts.push({ text });
    } else if (!audioBase64) {
        throw new Error("No input provided");
    }

    // Add a specific instruction part
    parts.push({
        text: `Extract contact information from this note. 
        If it's a new contact, extract their details. 
        If the note mentions specific dates (like 'met today'), convert them to relative context in the notes field.
        Infer missing details where possible based on context.`
    });

    const response = await ai.models.generateContent({
      model: MODEL_FAST,
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: contactSchema,
        systemInstruction: "You are Cortex, an intelligent CRM assistant. Your job is to structure unstructured data perfectly."
      },
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("Empty response from AI");

    return JSON.parse(jsonText);
  } catch (error) {
    console.error("Gemini Parse Error:", error);
    throw error;
  }
};

export const queryContacts = async (query: string, contacts: Contact[]): Promise<string> => {
    try {
        // Minimal RAG (Retrieval Augmented Generation) by passing context window
        // For a large app, we would use embeddings (text-embedding-004) and vector search.
        const contextData = contacts.map(c => 
            `${c.firstName} ${c.lastName} (${c.role} at ${c.company}). Interests: ${c.interests.join(', ')}. Notes: ${c.notes}`
        ).join('\n');

        const response = await ai.models.generateContent({
            model: MODEL_FAST,
            contents: `Context:\n${contextData}\n\nUser Question: ${query}`,
            config: {
                systemInstruction: "You are Cortex. Answer the user's question based strictly on the provided contact context. Be concise and helpful.",
            }
        });

        return response.text || "I couldn't find an answer in your contacts.";

    } catch (error) {
        console.error("Gemini Query Error:", error);
        return "Sorry, I had trouble searching your contacts.";
    }
}
