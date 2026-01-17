import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ActivityIndicator, 
  KeyboardAvoidingView, 
  Platform, 
  ScrollView,
  Alert,
  ViewProps,
  TextProps,
  TextInputProps,
  TouchableOpacityProps,
  KeyboardAvoidingViewProps,
  ScrollViewProps
} from 'react-native';
import { SafeAreaView, NativeSafeAreaViewProps } from 'react-native-safe-area-context';
import { Check, X, SkipForward, Briefcase, User, Building, Quote, Tag } from 'lucide-react-native';
import Animated, { FadeIn, FadeOutLeft, FadeOutRight, SlideInRight } from 'react-native-reanimated';
import { createClient } from '@supabase/supabase-js';
import process from 'process'; // Ensure you have this polyfill or use expo-constants

// Initialize Supabase Client (Ensure process.env.SUPABASE_URL is set in your app config)
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Manually augment types to support className (NativeWind)
declare module 'react-native' {
  interface ViewProps { className?: string; }
  interface TextProps { className?: string; }
  interface TextInputProps { className?: string; }
  interface TouchableOpacityProps { className?: string; }
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
  status: string;
}

export default function DebriefScreen() {
  const [queue, setQueue] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [contextText, setContextText] = useState<string>('');
  const [contextLoading, setContextLoading] = useState(false);

  // Form State for current card
  const [formData, setFormData] = useState<Partial<Contact>>({});

  useEffect(() => {
    fetchQueue();
  }, []);

  useEffect(() => {
    if (queue.length > 0) {
      const current = queue[0];
      setFormData({
        first_name: current.first_name,
        last_name: current.last_name,
        company: current.company,
        role: current.role,
        tags: current.tags
      });
      fetchContext(current.id);
    }
  }, [queue]);

  const fetchQueue = async () => {
    setLoading(true);
    // Fetch contacts marked as 'incomplete'
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('status', 'incomplete')
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching queue:", error);
      Alert.alert("Error", "Could not load debrief queue.");
    } else {
      setQueue(data || []);
    }
    setLoading(false);
  };

  const fetchContext = async (contactId: string) => {
    setContextLoading(true);
    setContextText('');
    
    // Find an interaction that includes this contact_id
    // Note: This relies on the pgvector/postgres array column logic
    const { data, error } = await supabase
      .from('interactions')
      .select('raw_text')
      .contains('contact_ids', [contactId])
      .limit(1)
      .maybeSingle();

    if (data) {
      setContextText(data.raw_text);
    }
    setContextLoading(false);
  };

  const handleConfirm = async () => {
    if (!queue.length) return;
    const current = queue[0];

    // Optimistic UI update: Remove from queue immediately
    const nextQueue = queue.slice(1);
    setQueue(nextQueue);

    try {
      const { error } = await supabase
        .from('contacts')
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name,
          company: formData.company,
          role: formData.role,
          status: 'active' // Mark as complete
        })
        .eq('id', current.id);

      if (error) throw error;
    } catch (err) {
      console.error("Failed to confirm contact", err);
      // Revert queue in a real app, or show error toast
      Alert.alert("Error", "Failed to save contact.");
      fetchQueue(); // Reload to be safe
    }
  };

  const handleDelete = async () => {
    if (!queue.length) return;
    const current = queue[0];

    Alert.alert(
      "Delete Contact",
      "Are you sure? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: async () => {
            setQueue(queue.slice(1));
            await supabase.from('contacts').delete().eq('id', current.id);
          }
        }
      ]
    );
  };

  const handleSkip = () => {
    // Just move to the back of the line or next
    if (queue.length <= 1) return;
    const [first, ...rest] = queue;
    setQueue([...rest, first]); // Rotate to end
  };

  if (loading) {
    return (
      <View className="flex-1 bg-slate-950 justify-center items-center">
        <ActivityIndicator size="large" color="#6366f1" />
        <Text className="text-slate-500 mt-4">Loading queue...</Text>
      </View>
    );
  }

  // Empty State
  if (queue.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-slate-950 justify-center items-center px-6">
        <View className="bg-slate-900 p-8 rounded-full mb-6 border border-slate-800">
          <Check size={64} color="#6366f1" />
        </View>
        <Text className="text-2xl font-bold text-slate-100 mb-2">All Caught Up!</Text>
        <Text className="text-slate-500 text-center leading-6">
          You've reviewed all your incomplete contacts. Great job keeping your CRM clean.
        </Text>
      </SafeAreaView>
    );
  }

  const currentContact = queue[0];

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <View className="px-6 py-4 flex-row justify-between items-center">
            <Text className="text-white text-xl font-bold">Debrief Queue</Text>
            <View className="bg-slate-800 px-3 py-1 rounded-full">
                <Text className="text-indigo-400 text-xs font-bold">{queue.length} Pending</Text>
            </View>
        </View>

        <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 100 }}>
          
          {/* Context Card (Original Note) */}
          <View className="mb-6">
            <Text className="text-slate-500 text-xs uppercase tracking-wider mb-2 font-semibold">Original Context</Text>
            <View className="bg-slate-900/50 p-4 rounded-xl border border-dashed border-slate-700">
                {contextLoading ? (
                    <ActivityIndicator size="small" color="#94a3b8" />
                ) : (
                    <View className="flex-row gap-3">
                        <View className="mt-1 shrink-0">
                            <Quote size={16} color="#475569" />
                        </View>
                        <Text className="text-slate-400 italic leading-relaxed">
                            {contextText || "No context text found for this contact."}
                        </Text>
                    </View>
                )}
            </View>
          </View>

          {/* Main Edit Card */}
          <Animated.View 
            key={currentContact.id}
            entering={SlideInRight}
            exiting={FadeOutLeft}
            className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl shadow-black"
          >
            {/* Name Fields */}
            <View className="flex-row gap-4 mb-5">
                <View className="flex-1 space-y-2">
                    <Label icon={<User size={14}/>}>First Name</Label>
                    <TextInput 
                        value={formData.first_name}
                        onChangeText={(t) => setFormData({...formData, first_name: t})}
                        className="bg-slate-950 text-white p-3 rounded-xl border border-slate-800 focus:border-indigo-500"
                        placeholder="First Name"
                        placeholderTextColor="#475569"
                    />
                </View>
                <View className="flex-1 space-y-2">
                    <Label>Last Name</Label>
                    <TextInput 
                        value={formData.last_name}
                        onChangeText={(t) => setFormData({...formData, last_name: t})}
                        className="bg-slate-950 text-white p-3 rounded-xl border border-slate-800 focus:border-indigo-500"
                        placeholder="Last Name"
                        placeholderTextColor="#475569"
                    />
                </View>
            </View>

            {/* Professional Info */}
            <View className="space-y-4 mb-6">
                <View className="space-y-2">
                    <Label icon={<Building size={14}/>}>Company</Label>
                    <TextInput 
                        value={formData.company}
                        onChangeText={(t) => setFormData({...formData, company: t})}
                        className="bg-slate-950 text-white p-3 rounded-xl border border-slate-800 focus:border-indigo-500"
                        placeholder="e.g. OpenAI"
                        placeholderTextColor="#475569"
                    />
                </View>
                <View className="space-y-2">
                    <Label icon={<Briefcase size={14}/>}>Role</Label>
                    <TextInput 
                        value={formData.role}
                        onChangeText={(t) => setFormData({...formData, role: t})}
                        className="bg-slate-950 text-white p-3 rounded-xl border border-slate-800 focus:border-indigo-500"
                        placeholder="e.g. Senior Engineer"
                        placeholderTextColor="#475569"
                    />
                </View>
            </View>

            {/* Tags (Read only visualization for now) */}
            {formData.tags && formData.tags.length > 0 && (
                <View className="mb-4">
                     <Label icon={<Tag size={14}/>}>Inferred Tags</Label>
                     <View className="flex-row flex-wrap gap-2 mt-2">
                        {formData.tags.map((tag, i) => (
                            <View key={i} className="bg-indigo-500/10 border border-indigo-500/20 px-2 py-1 rounded-md">
                                <Text className="text-indigo-300 text-xs">{tag}</Text>
                            </View>
                        ))}
                     </View>
                </View>
            )}

          </Animated.View>
        </ScrollView>

        {/* Action Bar */}
        <View className="absolute bottom-6 left-0 right-0 px-6 flex-row justify-between items-center gap-4">
            <TouchableOpacity 
                onPress={handleDelete}
                className="h-14 w-14 bg-slate-900 border border-red-900/50 rounded-full items-center justify-center hover:bg-red-900/20"
            >
                <X size={24} color="#ef4444" />
            </TouchableOpacity>

            <TouchableOpacity 
                onPress={handleSkip}
                className="h-14 w-14 bg-slate-900 border border-slate-700 rounded-full items-center justify-center"
            >
                <SkipForward size={24} color="#94a3b8" />
            </TouchableOpacity>

            <TouchableOpacity 
                onPress={handleConfirm}
                className="flex-1 h-14 bg-indigo-600 rounded-full items-center justify-center flex-row gap-2 shadow-lg shadow-indigo-900/40"
            >
                <Check size={20} color="white" strokeWidth={3} />
                <Text className="text-white font-bold text-lg">Confirm Contact</Text>
            </TouchableOpacity>
        </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const Label = ({ children, icon }: { children: React.ReactNode, icon?: React.ReactNode }) => (
    <View className="flex-row items-center gap-1.5 ml-1">
        {icon && <View className="opacity-50">{icon}</View>}
        <Text className="text-slate-400 text-xs font-semibold uppercase">{children}</Text>
    </View>
);