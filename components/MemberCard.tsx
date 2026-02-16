
import React from 'react';
import { FamilyMember } from '../types';
import { User } from 'lucide-react';

interface MemberCardProps {
  member: FamilyMember;
  onClick: (id: string) => void;
  isSelected?: boolean;
}

const MemberCard: React.FC<MemberCardProps> = ({ member, onClick, isSelected }) => {
  const isFemale = member.gender === 'female';
  
  return (
    <div 
      id={`member-${member.id}`}
      onClick={(e) => {
        e.stopPropagation();
        onClick(member.id);
      }}
      className={`relative group cursor-pointer transition-all duration-300 w-[180px]
        ${isSelected ? 'scale-105 z-30' : 'hover:scale-102'}
        bg-slate-900 border ${isSelected ? 'border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.3)]' : 'border-white/10'} 
        rounded-xl p-3 shadow-2xl`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center border 
          ${isFemale ? 'border-pink-500/30 bg-pink-500/10 text-pink-400' : 'border-blue-500/30 bg-blue-500/10 text-blue-400'}`}>
          <User size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-slate-100 truncate text-[12px]">
            {member.firstName || 'Unnamed'}
          </h3>
          <p className="text-[9px] text-slate-500 truncate font-mono uppercase">
            {member.lastName}
          </p>
        </div>
      </div>
    </div>
  );
};

export default MemberCard;
