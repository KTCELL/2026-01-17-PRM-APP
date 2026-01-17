import React, { useState } from 'react';
import { 
  View, 
  TextInput, 
  TouchableOpacity, 
  KeyboardAvoidingView, 
  Platform, 
  Text, 
  ActivityIndicator,
  Pressable,
  Keyboard,
  ViewProps,
  TextProps,
  TextInputProps,
  TouchableOpacityProps,
  PressableProps,
  KeyboardAvoidingViewProps
} from 'react-native';
import { Mic, Send } from 'lucide-react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  Easing,
  withSpring,
  cancelAnimation
} from 'react-native-reanimated';
import { SafeAreaView, NativeSafeAreaViewProps } from 'react-native-safe-area-context';

// Manually augment types to support className (NativeWind)
declare module 'react-native' {
  interface ViewProps { className?: string; }
  interface TextProps { className?: string; }
  interface TextInputProps { className?: string; }
  interface TouchableOpacityProps { className?: string; }
  interface PressableProps { className?: string; }
  interface KeyboardAvoidingViewProps { className?: string; }
}

declare module 'react-native-safe-area-context' {
  interface NativeSafeAreaViewProps { className?: string; }
}

export default function HomeScreen() {
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Animation Shared Values
  const micScale = useSharedValue(1);
  const rippleScale = useSharedValue(1);
  const rippleOpacity = useSharedValue(0);

  // Mic Button Scale Animation
  const micAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: micScale.value }],
    };
  });

  // Ripple Pulse Animation
  const rippleAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: rippleScale.value }],
      opacity: rippleOpacity.value,
    };
  });

  const startRecording = () => {
    if (isSubmitting) return;
    setIsRecording(true);
    
    // Button press effect
    micScale.value = withSpring(0.9);
    
    // Start pulsing ripple
    rippleScale.value = 1;
    rippleOpacity.value = 0.6;
    
    rippleScale.value = withRepeat(
      withTiming(2.5, { duration: 1000, easing: Easing.out(Easing.ease) }),
      -1, // Infinite repeat
      false
    );
    rippleOpacity.value = withRepeat(
      withTiming(0, { duration: 1000, easing: Easing.out(Easing.ease) }),
      -1,
      false
    );
  };

  const stopRecording = () => {
    if (!isRecording) return;
    
    setIsRecording(false);
    micScale.value = withSpring(1);
    
    // Stop and reset ripple
    cancelAnimation(rippleScale);
    cancelAnimation(rippleOpacity);
    rippleScale.value = withTiming(1, { duration: 200 });
    rippleOpacity.value = withTiming(0, { duration: 200 });
    
    // Simulate capture
    handleCapture('audio');
  };

  const handleCapture = async (type: 'text' | 'audio') => {
    if (type === 'text' && !text.trim()) return;
    
    setIsSubmitting(true);
    Keyboard.dismiss();

    // Mock processing delay
    setTimeout(() => {
        const data = type === 'text' 
            ? { type: 'text', content: text } 
            : { type: 'audio', content: 'audio-blob-placeholder' };
        
        console.log("Capture: ", data);
        
        // Reset state
        setText('');
        setIsSubmitting(false);
    }, 1500);
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 justify-center items-center px-6"
      >
        
        {/* Instruction Header */}
        <View className="mb-16 items-center">
            <Text className="text-slate-200 font-semibold text-2xl mb-2">Cortex</Text>
            <Text className="text-slate-500 text-sm tracking-wider uppercase">Quick Capture</Text>
        </View>

        {/* Text Input Section */}
        <View className="w-full max-w-sm mb-16 z-10">
            <View className="flex-row items-center bg-slate-900/80 border border-slate-800 rounded-2xl px-5 py-4 shadow-lg shadow-black/20 focus:border-indigo-500 transition-all">
                <TextInput 
                    className="flex-1 text-slate-100 text-lg min-h-[28px]"
                    placeholder="Who did you meet?"
                    placeholderTextColor="#64748b"
                    value={text}
                    onChangeText={setText}
                    returnKeyType="send"
                    onSubmitEditing={() => handleCapture('text')}
                    editable={!isSubmitting && !isRecording}
                />
                
                {(text.length > 0 || isSubmitting) && !isRecording && (
                     <TouchableOpacity 
                        onPress={() => handleCapture('text')} 
                        disabled={isSubmitting}
                        className="ml-3"
                     >
                        {isSubmitting ? (
                            <ActivityIndicator color="#6366f1" />
                        ) : (
                            <View className="bg-indigo-600 p-2.5 rounded-xl">
                                <Send size={18} color="white" strokeWidth={2.5} />
                            </View>
                        )}
                     </TouchableOpacity>
                )}
            </View>
        </View>

        {/* Mic / FAB Section */}
        <View className="items-center justify-center relative">
            {/* Ripple Background Layer */}
            <Animated.View 
                className={`absolute bg-indigo-500/30 rounded-full w-24 h-24 ${!isRecording && 'opacity-0'}`}
                style={rippleAnimatedStyle}
            />

            {/* Main Button */}
            <Pressable
                onPressIn={startRecording}
                onPressOut={stopRecording}
                disabled={isSubmitting}
                className="active:opacity-90"
            >
                <Animated.View 
                    style={micAnimatedStyle}
                    className={`h-24 w-24 rounded-full flex items-center justify-center shadow-2xl shadow-indigo-500/30 border-4 border-slate-950 ${isRecording ? 'bg-red-500' : 'bg-indigo-600'}`}
                >
                    <Mic size={40} color="white" strokeWidth={2} />
                </Animated.View>
            </Pressable>
            
            {/* Status Label */}
            <View className="h-8 mt-6 justify-center">
                {isRecording ? (
                    <Text className="text-red-400 font-medium animate-pulse">Recording...</Text>
                ) : (
                    <Text className="text-slate-600 font-medium">Hold to Speak</Text>
                )}
            </View>
        </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}