import React, { useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  RefreshControl,
  ActivityIndicator, 
  Linking,
  Platform,
  ViewProps,
  TextProps,
  ScrollViewProps,
  TouchableOpacityProps
} from 'react-native';
import { SafeAreaView, NativeSafeAreaViewProps } from 'react-native-safe-area-context';
import { createClient } from '@supabase/supabase-js';
import { useFocusEffect } from '@react-navigation/native';
import { MessageCircle, ArrowUpRight, TrendingUp, Users, AlertCircle } from 'lucide-react-native';
import process from 'process';
import Animated, { 
    useSharedValue, 
    useAnimatedStyle, 
    withTiming, 
    withDelay 
} from 'react-native-reanimated';
import { SvgProps } from 'react-native-svg';

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Manually augment types to support className (NativeWind)
declare module 'react-native' {
  interface ViewProps { className?: string; }
  interface TextProps { className?: string; }
  interface ScrollViewProps { className?: string; }
  interface TouchableOpacityProps { className?: string; }
}

declare module 'react-native-safe-area-context' {
  interface NativeSafeAreaViewProps { className?: string; }
}

declare module 'react-native-svg' {
  interface SvgProps { className?: string; }
}

interface DashboardStats {
  totalActive: number;
  engagedLast30: number;
  healthScore: number;
}

interface ReconnectContact {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
  company: string;
  last_interaction_at: string;
  phone?: string;
}

export default function DashboardScreen() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({ totalActive: 0, engagedLast30: 0, healthScore: 0 });
  const [reconnectList, setReconnectList] = useState<ReconnectContact[]>([]);
  
  // Animation value for progress circle (0 to 100)
  const progress = useSharedValue(0);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // Handle unauthenticated state if necessary
        setLoading(false);
        return;
      }

      // 1. Get Stats
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: contacts, error } = await supabase
        .from('contacts')
        .select('id, last_interaction_at')
        .eq('status', 'active');

      if (error) throw error;

      const totalActive = contacts.length;
      const engagedLast30 = contacts.filter(c => 
        c.last_interaction_at && new Date(c.last_interaction_at) > thirtyDaysAgo
      ).length;

      const healthScore = totalActive > 0 ? Math.round((engagedLast30 / totalActive) * 100) : 0;

      setStats({ totalActive, engagedLast30, healthScore });
      progress.value = withDelay(300, withTiming(healthScore, { duration: 1500 }));

      // 2. Get Reconnect List (> 90 days ago)
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const { data: reconnectData } = await supabase
        .from('contacts')
        .select('*')
        .eq('status', 'active')
        .lt('last_interaction_at', ninetyDaysAgo.toISOString())
        .order('last_interaction_at', { ascending: true }) // Oldest first
        .limit(10);

      setReconnectList(reconnectData || []);

    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const handlePing = (contact: ReconnectContact) => {
    const message = `Hey ${contact.first_name}, thinking of you! How have you been?`;
    // Use 'sms:' scheme. On iOS '&' separator, Android '?' usually. 
    // React Native Linking often handles '?' correctly for body on both.
    const separator = Platform.OS === 'ios' ? '&' : '?';
    const url = `sms:${contact.phone || ''}${separator}body=${encodeURIComponent(message)}`;
    
    Linking.openURL(url).catch(err => {
      console.error('Could not open SMS app', err);
      alert('Could not open SMS app. Do you have one installed?');
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      <ScrollView 
        className="flex-1"
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchData} tintColor="#6366f1" />}
      >
        <View className="px-6 py-6">
          <Text className="text-white text-3xl font-bold mb-1">Dashboard</Text>
          <Text className="text-slate-400 text-base mb-8">Your network at a glance</Text>

          {/* Network Health Widget */}
          <View className="bg-slate-900 border border-slate-800 rounded-3xl p-6 mb-8 shadow-lg shadow-black/50">
            <View className="flex-row justify-between items-start mb-4">
               <View>
                 <View className="flex-row items-center gap-2 mb-1">
                    <TrendingUp size={20} className="text-indigo-400" />
                    <Text className="text-indigo-400 font-bold uppercase text-xs tracking-wider">Network Health</Text>
                 </View>
                 <Text className="text-slate-400 text-xs max-w-[160px]">
                    % of active contacts engaged in the last 30 days.
                 </Text>
               </View>
            </View>

            <View className="flex-row items-center justify-center gap-8 py-4">
                {/* Custom Circular Progress Visualization */}
                <View className="relative w-32 h-32 items-center justify-center">
                    {/* Background Circle */}
                    <View className="absolute w-full h-full rounded-full border-[8px] border-slate-800" />
                    
                    {/* Stat Value */}
                    <View className="items-center">
                        <Text className="text-4xl font-bold text-white">
                            {stats.healthScore}<Text className="text-xl text-slate-500">%</Text>
                        </Text>
                    </View>
                    
                    {/* Note: A true animated SVG arc is complex without libraries. 
                        We simulate "Active" status with a glow and color. */}
                     <View className={`absolute w-full h-full rounded-full border-[8px] border-indigo-600 opacity-20`} />
                </View>

                {/* Legend / Stats */}
                <View className="space-y-4">
                    <View>
                        <Text className="text-2xl font-bold text-white">{stats.engagedLast30}</Text>
                        <Text className="text-slate-500 text-xs">Recently Engaged</Text>
                    </View>
                    <View>
                        <Text className="text-2xl font-bold text-slate-400">{stats.totalActive}</Text>
                        <Text className="text-slate-500 text-xs">Total Contacts</Text>
                    </View>
                </View>
            </View>
          </View>

          {/* Reconnect Queue */}
          <View className="mb-4 flex-row items-center justify-between">
             <Text className="text-slate-200 text-xl font-bold">Reconnect</Text>
             <View className="bg-amber-900/30 px-3 py-1 rounded-full border border-amber-500/20">
                <Text className="text-amber-500 text-xs font-bold">{reconnectList.length} Due</Text>
             </View>
          </View>

          {reconnectList.length === 0 && !loading ? (
             <View className="bg-slate-900/50 border border-slate-800 border-dashed rounded-2xl p-8 items-center justify-center">
                <Users size={32} className="text-slate-600 mb-3" />
                <Text className="text-slate-500 text-center">No one to reconnect with right now.</Text>
                <Text className="text-slate-600 text-xs text-center mt-1">You're a networking machine!</Text>
             </View>
          ) : (
             <View className="space-y-3 pb-20">
                {reconnectList.map((contact) => (
                    <View key={contact.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex-row items-center gap-4">
                        <View className="h-12 w-12 rounded-full bg-slate-800 items-center justify-center border border-slate-700">
                             <Text className="text-slate-300 font-bold text-lg">
                                {contact.first_name[0]}{contact.last_name ? contact.last_name[0] : ''}
                             </Text>
                        </View>
                        
                        <View className="flex-1">
                            <Text className="text-slate-200 font-semibold text-base">
                                {contact.first_name} {contact.last_name}
                            </Text>
                            <Text className="text-slate-500 text-xs">
                                Last seen: {new Date(contact.last_interaction_at).toLocaleDateString()}
                            </Text>
                        </View>

                        <TouchableOpacity 
                            onPress={() => handlePing(contact)}
                            className="bg-indigo-600/10 h-10 w-10 rounded-full items-center justify-center border border-indigo-500/50 active:bg-indigo-600 active:border-transparent group"
                        >
                            <MessageCircle size={18} className="text-indigo-400 group-active:text-white" />
                        </TouchableOpacity>
                    </View>
                ))}
             </View>
          )}

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}