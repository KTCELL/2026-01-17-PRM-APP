import React, { useState, useEffect } from 'react';
import { LayoutDashboard, MessageSquare, Search, BrainCircuit } from 'lucide-react';
import ContactList from './components/ContactList';
import QuickCapture from './components/QuickCapture';
import AIChat from './components/AIChat';
import { Contact, ViewMode, ProcessingStatus } from './types';

const App = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [view, setView] = useState<ViewMode>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [status, setStatus] = useState<ProcessingStatus>({ isProcessing: false, type: null });

  // Load contacts from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem('cortex_contacts');
    if (saved) {
      try {
        setContacts(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load contacts", e);
      }
    }
  }, []);

  // Save contacts whenever they change
  useEffect(() => {
    localStorage.setItem('cortex_contacts', JSON.stringify(contacts));
  }, [contacts]);

  const handleCreateContact = (partialContact: Partial<Contact>) => {
    const newContact: Contact = {
      id: crypto.randomUUID(),
      firstName: partialContact.firstName || 'Unknown',
      lastName: partialContact.lastName || '',
      role: partialContact.role,
      company: partialContact.company,
      email: partialContact.email,
      phone: partialContact.phone,
      interests: partialContact.interests || [],
      notes: partialContact.notes || '',
      createdAt: new Date().toISOString(),
      ...partialContact
    };
    
    // Sort by newest first
    setContacts(prev => [newContact, ...prev]);
  };

  const filteredContacts = contacts.filter(c => {
    const term = searchTerm.toLowerCase();
    return (
        c.firstName.toLowerCase().includes(term) ||
        c.lastName.toLowerCase().includes(term) ||
        c.company?.toLowerCase().includes(term) ||
        c.role?.toLowerCase().includes(term) ||
        c.interests.some(i => i.toLowerCase().includes(term))
    );
  });

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 font-sans selection:bg-indigo-500/30">
      
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0f172a]/80 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg">
                <BrainCircuit size={24} className="text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">Cortex</h1>
          </div>
          
          <nav className="flex items-center gap-1 bg-slate-800/50 p-1 rounded-full border border-slate-700/50">
            <button 
                onClick={() => setView('list')}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                    view === 'list' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'
                }`}
            >
                <div className="flex items-center gap-2">
                    <LayoutDashboard size={16} />
                    <span className="hidden sm:inline">Contacts</span>
                </div>
            </button>
            <button 
                onClick={() => setView('chat')}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                    view === 'chat' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'
                }`}
            >
                <div className="flex items-center gap-2">
                    <MessageSquare size={16} />
                    <span className="hidden sm:inline">Ask Cortex</span>
                </div>
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-6">
        
        {/* Status Notification */}
        {status.message && (
            <div className={`fixed top-20 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full shadow-2xl z-50 flex items-center gap-3 border animate-in slide-in-from-top-5 fade-in duration-300 ${
                status.type === 'error' ? 'bg-red-900/90 border-red-700 text-red-100' :
                status.type === 'success' ? 'bg-green-900/90 border-green-700 text-green-100' :
                'bg-indigo-900/90 border-indigo-700 text-indigo-100'
            }`}>
                {status.isProcessing && <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />}
                <span className="font-medium text-sm">{status.message}</span>
            </div>
        )}

        {view === 'list' && (
            <>
                <div className="mb-6 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                    <input 
                        type="text" 
                        placeholder="Search your network..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-800/50 border border-slate-700 rounded-xl py-3 pl-12 pr-4 text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-500"
                    />
                </div>
                <ContactList contacts={filteredContacts} />
            </>
        )}

        {view === 'chat' && (
            <AIChat contacts={contacts} />
        )}
      </main>

      {/* Quick Capture FAB */}
      <QuickCapture 
        onContactCreated={handleCreateContact}
        onStatusChange={setStatus}
      />

    </div>
  );
};

export default App;
