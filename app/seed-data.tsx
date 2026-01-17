import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator, 
  ViewProps, 
  TextProps, 
  TouchableOpacityProps, 
  ScrollViewProps 
} from 'react-native';
import { SafeAreaView, NativeSafeAreaViewProps } from 'react-native-safe-area-context';
import { createClient } from '@supabase/supabase-js';
import process from 'process';

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Manually augment types to support className (NativeWind)
declare module 'react-native' {
  interface ViewProps { className?: string; }
  interface TextProps { className?: string; }
  interface TouchableOpacityProps { className?: string; }
  interface ScrollViewProps { className?: string; }
}

declare module 'react-native-safe-area-context' {
  interface NativeSafeAreaViewProps { className?: string; }
}

export default function SeedScreen() {
  const [log, setLog] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const addLog = (msg: string) => setLog(prev => [...prev, msg]);

  const runSeed = async () => {
    setLoading(true);
    setLog([]);
    addLog("Starting seed process...");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        addLog("Error: No authenticated user found. Log in first.");
        setLoading(false);
        return;
      }
      
      const userId = user.id;
      addLog(`Seeding data for user: ${userId}`);

      // Dummy Data
      const dummyContacts = [
        // Recent Interactions (< 30 days)
        { first: "Sarah", last: "Connor", role: "Security Chief", company: "TechCorp", daysAgo: 2, status: 'active' },
        { first: "John", last: "Doe", role: "CEO", company: "StartupInc", daysAgo: 10, status: 'active' },
        { first: "Emily", last: "Blunt", role: "Actress", company: "Hollywood", daysAgo: 25, status: 'active' },
        
        // Mid-range (30-90 days)
        { first: "Michael", last: "Scott", role: "Regional Manager", company: "Dunder Mifflin", daysAgo: 45, status: 'active' },
        { first: "Dwight", last: "Schrute", role: "Assistant Regional Manager", company: "Dunder Mifflin", daysAgo: 60, status: 'active' },
        { first: "Jim", last: "Halpert", role: "Sales", company: "Athlead", daysAgo: 85, status: 'active' },

        // Old (> 90 days) -> Reconnect List
        { first: "Walter", last: "White", role: "Chemist", company: "Self-Employed", daysAgo: 100, status: 'active' },
        { first: "Jesse", last: "Pinkman", role: "Distributor", company: "Self-Employed", daysAgo: 120, status: 'active' },
        { first: "Saul", last: "Goodman", role: "Lawyer", company: "Hamlin Hamlin McGill", daysAgo: 200, status: 'active' },
        { first: "Gus", last: "Fring", role: "Owner", company: "Los Pollos Hermanos", daysAgo: 300, status: 'active' },
      ];

      for (const c of dummyContacts) {
        addLog(`Creating ${c.first} ${c.last}...`);
        
        const interactionDate = new Date();
        interactionDate.setDate(interactionDate.getDate() - c.daysAgo);

        // 1. Insert Contact
        const { data: contact, error: cError } = await supabase
          .from('contacts')
          .insert({
            user_id: userId,
            first_name: c.first,
            last_name: c.last,
            role: c.role,
            company: c.company,
            status: c.status,
            tags: ['seed-data', 'test'],
            last_interaction_at: interactionDate.toISOString(),
            phone: '555-0123' // Mock phone for SMS testing
          })
          .select()
          .single();

        if (cError) {
            addLog(`Failed to create contact: ${cError.message}`);
            continue;
        }

        // 2. Insert Mock Interaction
        if (contact) {
            await supabase.from('interactions').insert({
                user_id: userId,
                contact_ids: [contact.id],
                raw_text: `Met with ${c.first} about ${c.daysAgo} days ago. Discussed ${c.company} business.`,
                created_at: interactionDate.toISOString()
            });
        }
      }

      addLog("Seed complete! Go to Dashboard to see results.");

    } catch (e: any) {
        addLog(`Critical Error: ${e.message}`);
    } finally {
        setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-950 p-6">
      <Text className="text-white text-2xl font-bold mb-6">Database Seeder</Text>
      
      <TouchableOpacity 
        onPress={runSeed}
        disabled={loading}
        className={`w-full py-4 rounded-xl items-center mb-6 ${loading ? 'bg-slate-800' : 'bg-indigo-600'}`}
      >
         {loading ? <ActivityIndicator color="white"/> : <Text className="text-white font-bold">Inject 10 Dummy Contacts</Text>}
      </TouchableOpacity>

      <Text className="text-slate-500 mb-2">Logs:</Text>
      <ScrollView className="flex-1 bg-slate-900 rounded-xl p-4 border border-slate-800">
        {log.map((l, i) => (
            <Text key={i} className="text-green-400 font-mono text-xs mb-1">{`> ${l}`}</Text>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}