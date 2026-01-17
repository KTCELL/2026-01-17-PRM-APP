import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles } from 'lucide-react';
import { Contact, ChatMessage } from '../types';
import { queryContacts } from '../services/geminiService';

interface AIChatProps {
    contacts: Contact[];
}

const AIChat: React.FC<AIChatProps> = ({ contacts }) => {
    const [query, setQuery] = useState('');
    const [messages, setMessages] = useState<ChatMessage[]>([
        { id: '1', role: 'assistant', content: 'Hi! I\'m Cortex. Ask me anything about your contacts.', timestamp: Date.now() }
    ]);
    const [isTyping, setIsTyping] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async () => {
        if (!query.trim() || isTyping) return;

        const userMsg: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            content: query,
            timestamp: Date.now()
        };

        setMessages(prev => [...prev, userMsg]);
        setQuery('');
        setIsTyping(true);

        try {
            const answer = await queryContacts(userMsg.content, contacts);
            const aiMsg: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: answer,
                timestamp: Date.now()
            };
            setMessages(prev => [...prev, aiMsg]);
        } catch (e) {
            console.error(e);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-140px)] bg-slate-900/50 rounded-2xl border border-slate-700/50 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] rounded-2xl p-4 ${
                            msg.role === 'user' 
                            ? 'bg-indigo-600 text-white rounded-br-none' 
                            : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-bl-none'
                        }`}>
                            <div className="flex items-center gap-2 mb-1 opacity-70 text-xs">
                                {msg.role === 'assistant' ? <Bot size={12}/> : <User size={12}/>}
                                <span>{msg.role === 'assistant' ? 'Cortex' : 'You'}</span>
                            </div>
                            <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                        </div>
                    </div>
                ))}
                {isTyping && (
                     <div className="flex justify-start">
                        <div className="bg-slate-800 p-4 rounded-2xl rounded-bl-none border border-slate-700 flex items-center gap-2">
                             <Sparkles size={16} className="text-indigo-400 animate-pulse"/>
                             <span className="text-slate-400 text-sm">Thinking...</span>
                        </div>
                     </div>
                )}
                <div ref={bottomRef} />
            </div>

            <div className="p-4 bg-slate-900 border-t border-slate-700">
                <div className="relative">
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="e.g., 'Who works at Google?' or 'Who likes sushi?'"
                        className="w-full bg-slate-800 text-white pl-4 pr-12 py-4 rounded-xl border border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-500"
                    />
                    <button 
                        onClick={handleSend}
                        disabled={!query.trim() || isTyping}
                        className="absolute right-2 top-2 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors"
                    >
                        <Send size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AIChat;
