
import React, { useState, useEffect } from 'react';
import { FamilyMember, Gender } from '../types';
import { X, Save, Trash2, Heart, Baby, ChevronUp, User, Hash } from 'lucide-react';

interface MemberSidebarProps {
  member: FamilyMember | null;
  allMembers: FamilyMember[];
  onClose: () => void;
  onSave: (member: FamilyMember) => void;
  onDelete: (id: string) => void;
  onAddChild: (parentId: string) => void;
  onAddFather: (childId: string) => void;
  onAddMother: (childId: string) => void;
}

const MemberSidebar: React.FC<MemberSidebarProps> = ({ 
  member, 
  allMembers,
  onClose, 
  onSave, 
  onDelete,
  onAddChild,
  onAddFather,
  onAddMother
}) => {
  const [edited, setEdited] = useState<FamilyMember | null>(null);

  useEffect(() => {
    setEdited(member);
  }, [member]);

  if (!edited) return null;

  const handleChange = (field: keyof FamilyMember, value: any) => {
    setEdited(prev => prev ? { ...prev, [field]: value } : null);
  };

  const potentialSpouses = allMembers.filter(m => m.id !== edited.id);
  const potentialFathers = allMembers.filter(m => m.id !== edited.id && m.gender === 'male');
  const potentialMothers = allMembers.filter(m => m.id !== edited.id && m.gender === 'female');

  return (
    <div className="fixed inset-y-0 right-0 w-[380px] bg-slate-900 border-l border-white/5 shadow-[0_0_50px_rgba(0,0,0,0.5)] z-50 flex flex-col">
      <div className="p-6 flex items-center justify-between border-b border-white/5">
        <div>
           <h2 className="text-sm font-bold text-white uppercase tracking-widest">Edit Profile</h2>
           <p className="text-[10px] text-slate-500 font-mono mt-1 flex items-center gap-1">
             <Hash size={10} /> {edited.id.split('-')[0]}
           </p>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg text-slate-400">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {/* Quick Actions */}
        <div className="space-y-2">
           <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Quick Connect</p>
           <div className="grid grid-cols-2 gap-2">
              <button onClick={() => onAddChild(edited.id)} className="col-span-2 flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all"><Baby size={16} /> Add Child</button>
              <button onClick={() => onAddFather(edited.id)} disabled={!!edited.fatherId} className="flex items-center justify-center gap-2 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 rounded-xl text-xs font-medium text-slate-300"><ChevronUp size={14} /> Father</button>
              <button onClick={() => onAddMother(edited.id)} disabled={!!edited.motherId} className="flex items-center justify-center gap-2 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 rounded-xl text-xs font-medium text-slate-300"><ChevronUp size={14} /> Mother</button>
           </div>
        </div>

        {/* Identity */}
        <div className="space-y-4">
           <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Identity</p>
           <div className="grid grid-cols-2 gap-3">
              <input 
                placeholder="First Name" 
                value={edited.firstName} 
                onChange={(e) => handleChange('firstName', e.target.value)}
                className="bg-slate-950 border border-white/5 rounded-lg p-3 text-sm focus:border-blue-500 outline-none"
              />
              <input 
                placeholder="Last Name" 
                value={edited.lastName} 
                onChange={(e) => handleChange('lastName', e.target.value)}
                className="bg-slate-950 border border-white/5 rounded-lg p-3 text-sm focus:border-blue-500 outline-none"
              />
           </div>
           <div className="flex gap-2 p-1 bg-slate-950 rounded-xl border border-white/5">
              {['male', 'female'].map(g => (
                <button 
                  key={g} 
                  onClick={() => handleChange('gender', g)}
                  className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${edited.gender === g ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-500'}`}
                >
                  {g}
                </button>
              ))}
           </div>
        </div>

        {/* Timeline */}
        <div className="space-y-4">
           <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Timeline</p>
           <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                 <label className="text-[9px] text-slate-500 uppercase">Birth</label>
                 <input type="date" value={edited.birthDate || ''} onChange={(e) => handleChange('birthDate', e.target.value)} className="w-full bg-slate-950 border border-white/5 rounded-lg p-3 text-xs outline-none" />
              </div>
              <div className="space-y-1">
                 <label className="text-[9px] text-slate-500 uppercase">Death</label>
                 <input type="date" value={edited.deathDate || ''} onChange={(e) => handleChange('deathDate', e.target.value)} className="w-full bg-slate-950 border border-white/5 rounded-lg p-3 text-xs outline-none" />
              </div>
           </div>
        </div>

        {/* Connections */}
        <div className="space-y-4">
           <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Relationships</p>
           <div className="space-y-3">
              <select value={edited.spouseId || ''} onChange={(e) => handleChange('spouseId', e.target.value)} className="w-full bg-slate-950 border border-white/5 rounded-lg p-3 text-xs outline-none appearance-none">
                 <option value="">No Spouse</option>
                 {potentialSpouses.map(s => <option key={s.id} value={s.id}>Married to: {s.firstName}</option>)}
              </select>
           </div>
        </div>
      </div>

      <div className="p-6 border-t border-white/5 bg-slate-950/50 flex gap-3">
        <button onClick={() => onDelete(edited.id)} className="p-4 text-red-500 hover:bg-red-500/10 rounded-xl transition-all"><Trash2 size={20} /></button>
        <button onClick={() => onSave(edited)} className="flex-1 bg-white text-slate-950 font-bold rounded-xl py-4 text-sm hover:scale-[1.02] active:scale-95 transition-all">Save Changes</button>
      </div>
    </div>
  );
};

export default MemberSidebar;
