
import React, { useState, useEffect } from 'react';
import { User, Plus, Trash2, Heart } from 'lucide-react';

// استفاده از دیتای ثابت برای تست اولیه
const INITIAL_MEMBERS = [
  { id: '1', firstName: 'Ardeshir', lastName: 'Namiranian', gender: 'male' }
];

export default function App() {
  const [members, setMembers] = useState(() => {
    try {
      const saved = localStorage.getItem('family_tree_simple');
      return saved ? JSON.parse(saved) : INITIAL_MEMBERS;
    } catch {
      return INITIAL_MEMBERS;
    }
  });

  useEffect(() => {
    localStorage.setItem('family_tree_simple', JSON.stringify(members));
  }, [members]);

  const addMember = () => {
    const newMember = {
      id: Date.now().toString(),
      firstName: 'New',
      lastName: 'Member',
      gender: 'male'
    };
    setMembers([...members, newMember]);
  };

  const deleteMember = (id: string) => {
    setMembers(members.filter(m => m.id !== id));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center p-10">
      {/* هدر ساده برای تست */}
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-bold text-emerald-500 mb-2">Heritage Tree: Online</h1>
        <p className="text-slate-400">اگر این صفحه را می‌بینید، یعنی برنامه با موفقیت اجرا شده است.</p>
      </div>

      <button 
        onClick={addMember}
        className="mb-8 flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 px-6 py-3 rounded-full font-bold transition-all shadow-lg shadow-emerald-900/20"
      >
        <Plus size={20} /> افزودن عضو جدید
      </button>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 w-full max-w-6xl">
        {members.map(member => (
          <div 
            key={member.id}
            className="bg-slate-900 border border-white/10 p-5 rounded-2xl flex flex-col items-center gap-4 group"
          >
            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center text-emerald-400">
              <User size={32} />
            </div>
            <div className="text-center">
              <div className="font-bold text-lg">{member.firstName} {member.lastName}</div>
              <div className="text-xs text-slate-500 uppercase tracking-widest">{member.gender}</div>
            </div>
            <button 
              onClick={() => deleteMember(member.id)}
              className="mt-2 p-2 text-slate-500 hover:text-red-500 transition-colors"
            >
              <Trash2 size={18} />
            </button>
          </div>
        ))}
      </div>

      {members.length === 0 && (
        <div className="text-slate-600 mt-20">لیست خالی است. یک نفر را اضافه کنید.</div>
      )}

      <footer className="mt-auto pt-10 text-[10px] text-slate-700 font-mono">
        STATUS: REACT_OK | VERSION: 2.0.0-LITE
      </footer>
    </div>
  );
}
