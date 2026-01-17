import React, { useState, useRef } from 'react';
import { Mic, Send, X, StopCircle, Loader2 } from 'lucide-react';
import { parseNoteToContact } from '../services/geminiService';
import { Contact, ProcessingStatus } from '../types';

interface QuickCaptureProps {
  onContactCreated: (contact: Partial<Contact>) => void;
  onStatusChange: (status: ProcessingStatus) => void;
}

const QuickCapture: React.FC<QuickCaptureProps> = ({ onContactCreated, onStatusChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      onStatusChange({ isProcessing: false, message: "Mic access denied", type: 'error' });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await processNote(text, audioBlob);
        
        // Stop all tracks to release mic
        mediaRecorderRef.current?.stream.getTracks().forEach(track => track.stop());
      };
    }
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        // Remove data URL prefix (e.g., "data:audio/webm;base64,")
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const processNote = async (noteText: string, audioBlob?: Blob) => {
    setIsProcessing(true);
    setIsOpen(false); // Close UI immediately for "Fire and Forget" feel
    onStatusChange({ isProcessing: true, message: "Cortex is processing your note...", type: 'info' });

    try {
      let audioBase64: string | undefined;
      if (audioBlob) {
        audioBase64 = await blobToBase64(audioBlob);
      }

      if (!noteText.trim() && !audioBase64) {
          throw new Error("Empty note");
      }

      const newContact = await parseNoteToContact(noteText, audioBase64);
      onContactCreated(newContact);
      
      setText('');
      onStatusChange({ isProcessing: false, message: "Contact added successfully!", type: 'success' });
      
      // Clear success message after delay
      setTimeout(() => onStatusChange({ isProcessing: false, message: undefined, type: null }), 3000);

    } catch (error) {
      console.error(error);
      onStatusChange({ isProcessing: false, message: "Failed to process note.", type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmit = () => {
    if (text.trim()) {
      processNote(text);
    }
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 bg-indigo-600 hover:bg-indigo-500 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-95 z-50 text-white"
        aria-label="Add Note"
      >
        <span className="text-3xl font-light leading-none mb-1">+</span>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl p-4 shadow-2xl animate-in slide-in-from-bottom-10 fade-in duration-200">
        
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-slate-100">Quick Capture</h3>
          <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white p-2">
            <X size={20} />
          </button>
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g., 'Met Sarah at the conference, she's a UX Lead at Spotify, likes hiking...'"
          className="w-full bg-slate-800 text-white rounded-xl p-4 min-h-[120px] focus:ring-2 focus:ring-indigo-500 outline-none resize-none placeholder:text-slate-500 mb-4"
          autoFocus
        />

        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                {isRecording ? (
                    <button 
                        onClick={stopRecording}
                        className="flex items-center gap-2 bg-red-500/10 text-red-500 px-4 py-2 rounded-full border border-red-500/50 hover:bg-red-500/20 transition-colors"
                    >
                        <StopCircle size={20} className="animate-pulse" />
                        <span className="font-medium">Stop Recording</span>
                    </button>
                ) : (
                    <button 
                        onClick={startRecording}
                        className="p-3 rounded-full bg-slate-800 text-slate-300 hover:text-indigo-400 hover:bg-slate-700 transition-all border border-slate-700"
                        title="Record Voice Note"
                    >
                        <Mic size={20} />
                    </button>
                )}
            </div>

            <button 
                onClick={handleSubmit}
                disabled={!text.trim() && !isRecording}
                className={`flex items-center gap-2 px-6 py-3 rounded-full font-medium transition-all ${
                    (text.trim()) 
                    ? 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-900/20' 
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
            >
                {isProcessing ? <Loader2 className="animate-spin" size={20}/> : <Send size={20} />}
                <span>Process</span>
            </button>
        </div>
      </div>
    </div>
  );
};

export default QuickCapture;
