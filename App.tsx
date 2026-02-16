
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FamilyMember, TreeData, ViewMode } from './types';
import MemberCard from './components/MemberCard';
import MemberSidebar from './components/MemberSidebar';
import { Maximize, ZoomIn, ZoomOut, Heart, Share2, Plus } from 'lucide-react';

const INITIAL_DATA: TreeData = {
  members: [
    {
      id: 'root-1',
      firstName: 'بزرگ',
      lastName: 'خاندان',
      gender: 'male',
    }
  ]
};

// --- Connection Lines ---
const TreeLines = ({ members }: { members: FamilyMember[] }) => {
  const [paths, setPaths] = useState<React.ReactElement[]>([]);

  const calculatePaths = useCallback(() => {
    const newPaths: React.ReactElement[] = [];
    const canvas = document.getElementById('zoom-canvas');
    if (!canvas) return;

    const canvasRect = canvas.getBoundingClientRect();
    const scale = canvasRect.width / canvas.offsetWidth;

    // پیدا کردن واحدها (ترکیب والدین برای رسم خط فرزندان)
    const familyUnits = new Map<string, { parentIds: string[], childrenIds: string[] }>();

    members.forEach(m => {
      if (m.fatherId || m.motherId) {
        const p1 = m.fatherId || '';
        const p2 = m.motherId || '';
        const unitKey = [p1, p2].sort().join('_');
        
        if (!familyUnits.has(unitKey)) {
          familyUnits.set(unitKey, { parentIds: [p1, p2].filter(Boolean), childrenIds: [] });
        }
        familyUnits.get(unitKey)!.childrenIds.push(m.id);
      }
    });

    familyUnits.forEach(({ parentIds, childrenIds }, key) => {
      let startX: number | undefined, startY: number | undefined;

      if (parentIds.length === 2) {
        // خط از وسط دو والد (نقطه قلب)
        const heartEl = document.getElementById(`heart-${parentIds[0]}-${parentIds[1]}`) || 
                        document.getElementById(`heart-${parentIds[1]}-${parentIds[0]}`);
        if (heartEl) {
          const r = heartEl.getBoundingClientRect();
          startX = (r.left + r.width / 2 - canvasRect.left) / scale;
          startY = (r.bottom - canvasRect.top) / scale;
        }
      } else if (parentIds.length === 1) {
        // خط از زیر تک والد
        const pEl = document.getElementById(`member-${parentIds[0]}`);
        if (pEl) {
          const r = pEl.getBoundingClientRect();
          startX = (r.left + r.width / 2 - canvasRect.left) / scale;
          startY = (r.bottom - canvasRect.top) / scale;
        }
      }

      if (startX !== undefined && startY !== undefined) {
        childrenIds.forEach(cId => {
          const cEl = document.getElementById(`member-${cId}`);
          if (cEl) {
            const r = cEl.getBoundingClientRect();
            const endX = (r.left + r.width / 2 - canvasRect.left) / scale;
            const endY = (r.top - canvasRect.top) / scale;
            
            const midY = (startY! + endY) / 2;
            const d = `M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY}`;
            newPaths.push(
              <path key={`${key}-${cId}`} d={d} fill="none" stroke="#334155" strokeWidth="2" strokeDasharray="4 2" />
            );
          }
        });
      }
    });

    setPaths(newPaths);
  }, [members]);

  useEffect(() => {
    const timer = setInterval(calculatePaths, 100);
    return () => clearInterval(timer);
  }, [calculatePaths]);

  return <svg className="absolute inset-0 pointer-events-none w-full h-full overflow-visible">{paths}</svg>;
};

// --- Recursive Tree Node ---
const TreeNode = ({ memberId, members, selectedId, onMemberClick, processed }: any) => {
  if (processed.has(memberId)) return null;
  const member = members.find((m: any) => m.id === memberId);
  if (!member) return null;

  processed.add(memberId);
  const spouse = member.spouseId ? members.find((m: any) => m.id === member.spouseId) : null;
  if (spouse) processed.add(spouse.id);

  const children = members.filter((m: any) => 
    (m.fatherId === member.id || m.motherId === member.id) ||
    (spouse && (m.fatherId === spouse.id || m.motherId === spouse.id))
  );

  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center gap-16 relative mb-32">
        <MemberCard member={member} isSelected={selectedId === member.id} onClick={onMemberClick} />
        {spouse && (
          <>
            <div id={`heart-${member.id}-${spouse.id}`} className="absolute left-1/2 -translate-x-1/2 z-10">
               <div className="bg-slate-950 border border-white/10 p-1.5 rounded-full shadow-xl">
                 <Heart size={12} className="text-pink-500 fill-pink-500" />
               </div>
            </div>
            <MemberCard member={spouse} isSelected={selectedId === spouse.id} onClick={onMemberClick} />
          </>
        )}
      </div>
      {children.length > 0 && (
        <div className="flex gap-16 relative items-start">
          {children.map((child: any) => (
            <TreeNode key={child.id} memberId={child.id} members={members} selectedId={selectedId} onMemberClick={onMemberClick} processed={processed} />
          ))}
        </div>
      )}
    </div>
  );
};

const App: React.FC = () => {
  const [data, setData] = useState<TreeData>(() => {
    const saved = localStorage.getItem('family_tree_data_v2');
    return saved ? JSON.parse(saved) : INITIAL_DATA;
  });
  
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);

  useEffect(() => {
    localStorage.setItem('family_tree_data_v2', JSON.stringify(data));
  }, [data]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).id === 'canvas-wrapper') setIsPanning(true);
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) setPan(p => ({ x: p.x + e.movementX, y: p.y + e.movementY }));
  };

  const roots = useMemo(() => {
    const rendered = new Set<string>();
    const results: FamilyMember[] = [];
    data.members.forEach(m => {
      const hasParents = m.fatherId || m.motherId;
      if (!hasParents && !rendered.has(m.id)) {
        results.push(m);
        rendered.add(m.id);
        if (m.spouseId) rendered.add(m.spouseId);
      }
    });
    return results;
  }, [data.members]);

  const generateId = () => Date.now().toString() + Math.random().toString(36).substr(2, 5);

  const handleAddMember = () => {
    const newMember: FamilyMember = { id: generateId(), firstName: 'عضو', lastName: 'جدید', gender: 'male' };
    setData(prev => ({ members: [...prev.members, newMember] }));
    setSelectedId(newMember.id);
  };

  const handleSave = (updated: FamilyMember) => {
    setData(prev => ({
      members: prev.members.map(m => m.id === updated.id ? updated : m)
    }));
  };

  const handleDelete = (id: string) => {
    if (!confirm('آیا از حذف این شخص مطمئن هستید؟')) return;
    setData(prev => ({
      members: prev.members.filter(m => m.id !== id).map(m => ({
        ...m,
        spouseId: m.spouseId === id ? undefined : m.spouseId,
        fatherId: m.fatherId === id ? undefined : m.fatherId,
        motherId: m.motherId === id ? undefined : m.motherId,
      }))
    }));
    setSelectedId(null);
  };

  const handleAddChild = (parentId: string) => {
    const p = data.members.find(m => m.id === parentId);
    if (!p) return;
    const newChild: FamilyMember = {
      id: generateId(),
      firstName: 'فرزند جدید',
      lastName: p.lastName,
      gender: 'male',
      fatherId: p.gender === 'male' ? p.id : p.spouseId,
      motherId: p.gender === 'female' ? p.id : p.spouseId
    };
    setData(prev => ({ members: [...prev.members, newChild] }));
    setSelectedId(newChild.id);
  };

  return (
    <div className="h-screen w-screen bg-slate-950 flex flex-col overflow-hidden">
      {/* Navigation */}
      <nav className="h-16 border-b border-white/5 bg-slate-900/50 backdrop-blur-xl flex items-center justify-between px-8 z-50">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Share2 className="text-white" size={20} />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight">HERITAGE TREE</h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-medium">Family Management</p>
          </div>
        </div>
        <button 
          onClick={handleAddMember}
          className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-emerald-900/20"
        >
          <Plus size={16} /> افزودن عضو
        </button>
      </nav>

      {/* Main Canvas */}
      <main 
        id="canvas-wrapper"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={() => setIsPanning(false)}
        className="flex-1 relative cursor-grab active:cursor-grabbing canvas-grid"
      >
        <div 
          id="zoom-canvas"
          className="absolute origin-center transition-transform duration-75"
          style={{ 
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            left: '50%',
            top: '20%',
            width: '1px',
            height: '1px'
          }}
        >
          <TreeLines members={data.members} />
          <div className="relative flex flex-col gap-64 items-center">
            {roots.map(root => (
              <TreeNode 
                key={root.id} 
                memberId={root.id} 
                members={data.members} 
                selectedId={selectedId} 
                onMemberClick={setSelectedId} 
                processed={new Set()} 
              />
            ))}
          </div>
        </div>

        {/* Floating Controls */}
        <div className="absolute bottom-10 right-10 flex flex-col gap-3">
          <div className="bg-slate-900/80 border border-white/10 backdrop-blur-md rounded-2xl p-1.5 flex flex-col shadow-2xl">
            <button onClick={() => setZoom(z => Math.min(z + 0.1, 2))} className="p-3 text-slate-400 hover:text-white transition-colors"><ZoomIn size={20} /></button>
            <div className="h-px bg-white/5 mx-2" />
            <button onClick={() => setZoom(z => Math.max(z - 0.1, 0.2))} className="p-3 text-slate-400 hover:text-white transition-colors"><ZoomOut size={20} /></button>
            <div className="h-px bg-white/5 mx-2" />
            <button onClick={() => {setZoom(1); setPan({x:0,y:0})}} className="p-3 text-slate-400 hover:text-white transition-colors"><Maximize size={20} /></button>
          </div>
        </div>
      </main>

      {/* Sidebar */}
      <MemberSidebar 
        member={data.members.find(m => m.id === selectedId) || null} 
        allMembers={data.members}
        onClose={() => setSelectedId(null)}
        onSave={handleSave}
        onDelete={handleDelete}
        onAddChild={handleAddChild}
        onAddFather={() => {}} // Simple placeholders for now
        onAddMother={() => {}} 
      />
    </div>
  );
};

export default App;
