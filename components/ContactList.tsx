import React from 'react';
import { Contact } from '../types';
import { Mail, Phone, Briefcase, Calendar } from 'lucide-react';

interface ContactListProps {
  contacts: Contact[];
}

const ContactList: React.FC<ContactListProps> = ({ contacts }) => {
  if (contacts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-500">
        <div className="mb-4 bg-slate-800/50 p-4 rounded-full">
            <Briefcase size={32} className="opacity-50" />
        </div>
        <p className="text-lg">No contacts yet.</p>
        <p className="text-sm">Use the + button to capture your first connection.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-24">
      {contacts.map((contact) => (
        <div key={contact.id} className="group bg-slate-800/50 border border-slate-700/50 hover:border-indigo-500/30 rounded-2xl p-5 transition-all hover:bg-slate-800 shadow-sm">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                    {contact.firstName[0]}{contact.lastName ? contact.lastName[0] : ''}
                </div>
                <div>
                    <h3 className="font-semibold text-slate-100 text-lg leading-tight">
                        {contact.firstName} {contact.lastName}
                    </h3>
                    {(contact.role || contact.company) && (
                        <p className="text-sm text-slate-400 flex items-center gap-1 mt-0.5">
                            <Briefcase size={12} />
                            {contact.role} {contact.role && contact.company ? 'at' : ''} {contact.company}
                        </p>
                    )}
                </div>
            </div>
          </div>

          <div className="space-y-3">
             {/* Tags/Interests */}
             <div className="flex flex-wrap gap-2">
                {contact.interests.map((interest, idx) => (
                    <span key={idx} className="text-xs px-2.5 py-1 rounded-full bg-slate-700/50 text-indigo-200 border border-indigo-500/10">
                        {interest}
                    </span>
                ))}
            </div>

            {/* Notes Preview */}
            <div className="bg-slate-900/50 rounded-lg p-3 text-sm text-slate-400 line-clamp-3 italic border border-slate-700/30">
                "{contact.notes}"
            </div>

            {/* Contact Details */}
            <div className="flex gap-4 pt-2 border-t border-slate-700/50 mt-4">
                {contact.email && (
                    <a href={`mailto:${contact.email}`} className="text-slate-400 hover:text-indigo-400 transition-colors" title={contact.email}>
                        <Mail size={18} />
                    </a>
                )}
                {contact.phone && (
                    <a href={`tel:${contact.phone}`} className="text-slate-400 hover:text-green-400 transition-colors" title={contact.phone}>
                        <Phone size={18} />
                    </a>
                )}
                <div className="ml-auto text-xs text-slate-500 flex items-center gap-1">
                    <Calendar size={12} />
                    {new Date(contact.createdAt).toLocaleDateString()}
                </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ContactList;
