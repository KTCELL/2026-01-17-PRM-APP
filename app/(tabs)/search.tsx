import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ActivityIndicator, 
  FlatList, 
  KeyboardAvoidingView, 
  Platform,
  Image,
  ScrollView,
  Keyboard,
  ViewProps,
  TextProps,
  TextInputProps,
  KeyboardAvoidingViewProps,
  ScrollViewProps
} from 'react-native';
import { SafeAreaView, NativeSafeAreaViewProps } from 'react-native-safe-area-context';
import { Search, Sparkles, User, Briefcase, ArrowRight } from 'lucide-react-native';
import { createClient } from '@supabase/supabase-js';
import process from 'process';

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Manually augment types to support className (NativeWind)
declare module 'react-native' {
  interface ViewProps { className?: string; }
  interface TextProps { className?: string; }
  interface TextInputProps { className?: string; }
  interface KeyboardAvoidingViewProps { className?: string; }
  interface ScrollViewProps { className?: string; }
}

declare module 'react-native-safe-area-context' {
  interface NativeSafeAreaViewProps { className?: string; }
}

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  company: string;
  role: string;
  tags: string[];
}

interface SearchResult {
  answer: string;
  contacts: Contact[];
}

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);

  const handleSearch = async () => {
    if (!query.trim()) return;
    
    setLoading(true);
    setResult(null);
    Keyboard.dismiss();

    try {
      // 1. Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      // For demo purposes, if no auth, we might fail. 
      // Assuming generic user_id if auth not implemented fully in this context snippet
      const userId = user?.id || '00000000-0000-0000-0000-000000000000'; 

      // 2. Call Edge Function
      const { data, error } = await supabase.functions.invoke('search-network', {
        body: { query, user_id: userId },
      });

      if (error) throw error;
      setResult(data);

    } catch (err) {
      console.error('Search failed:', err);
      // Fallback UI for error
      setResult({
        answer: "I'm having trouble connecting to your network right now. Please try again.",
        contacts: []
      });
    } finally {
      setLoading(false);
    }
  };

  const renderContactCard = ({ item }: { item: Contact }) => (
    <View className="w-64 bg-slate-900 border border-slate-800 rounded-2xl p-4 mr-4 shadow-sm">
      <View className="flex-row items-center gap-3 mb-3">
        <View className="h-10 w-10 rounded-full bg-indigo-500/20 items-center justify-center">
            <Text className="text-indigo-400 font-bold text-lg">
                {item.first_name[0]}{item.last_name ? item.last_name[0] : ''}
            </Text>
        </View>
        <View className="flex-1">
            <Text className="text-slate-100 font-semibold text-base" numberOfLines={1}>
                {item.first_name} {item.last_name}
            </Text>
            {(item.role || item.company) && (
                <Text className="text-slate-400 text-xs" numberOfLines={1}>
                    {item.role} {item.role && item.company ? 'at' : ''} {item.company}
                </Text>
            )}
        </View>
      </View>
      
      <View className="flex-row flex-wrap gap-1.5 mt-auto">
         {item.tags && item.tags.slice(0, 3).map((tag, i) => (
             <View key={i} className="bg-slate-800 px-2 py-1 rounded-md">
                 <Text className="text-slate-500 text-[10px]">{tag}</Text>
             </View>
         ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <View className="px-6 py-4">
            <Text className="text-white text-2xl font-bold mb-6">Search Network</Text>
            
            {/* Search Bar */}
            <View className="flex-row items-center bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 shadow-sm mb-6 focus:border-indigo-500">
                <View className="mr-3">
                    <Search size={20} color="#64748b" />
                </View>
                <TextInput 
                    className="flex-1 text-slate-100 text-base"
                    placeholder="e.g. 'Who do I know at OpenAI?'"
                    placeholderTextColor="#64748b"
                    value={query}
                    onChangeText={setQuery}
                    onSubmitEditing={handleSearch}
                    returnKeyType="search"
                />
                {loading && <ActivityIndicator size="small" color="#6366f1" />}
            </View>
        </View>

        <ScrollView className="flex-1 px-6">
            {!result && !loading && (
                <View className="items-center justify-center mt-20 opacity-40">
                    <View className="mb-4">
                        <Sparkles size={48} color="#475569" />
                    </View>
                    <Text className="text-slate-500 text-center">
                        Ask about your connections, companies,{"\n"}or past conversations.
                    </Text>
                </View>
            )}

            {result && (
                <View className="pb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* AI Answer Section */}
                    <View className="mb-8">
                        <View className="flex-row items-center gap-2 mb-3">
                            <Sparkles size={16} color="#818cf8" />
                            <Text className="text-indigo-400 font-semibold text-xs tracking-wider uppercase">Cortex Answer</Text>
                        </View>
                        <View className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-5">
                            <Text className="text-slate-200 text-lg leading-relaxed">
                                {result.answer}
                            </Text>
                        </View>
                    </View>

                    {/* Relevant Contacts Section */}
                    {result.contacts && result.contacts.length > 0 && (
                        <View>
                            <Text className="text-slate-500 font-semibold text-xs tracking-wider uppercase mb-4">Relevant Contacts</Text>
                            <FlatList 
                                data={result.contacts}
                                renderItem={renderContactCard}
                                keyExtractor={item => item.id}
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={{ paddingRight: 20 }}
                            />
                        </View>
                    )}
                </View>
            )}
        </ScrollView>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}