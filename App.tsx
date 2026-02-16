
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { FamilyMember, TreeData, ViewMode } from './types';
import MemberCard from './components/MemberCard';
import MemberSidebar from './components/MemberSidebar';
import { Maximize, ZoomIn, ZoomOut, Heart } from 'lucide-react';

const INITIAL_DATA: TreeData = {
  members: [
    {
      id: 'm-1',
      firstName: 'Ardeshir',
      lastName: 'Namiranian',
      gender: 'male',
      birthDate: '1970-01-01',
    }
  ]
};

// --- Connection Line Component (Curved) ---
const TreeLines = ({ members }: { members: FamilyMember[] }) => {
  const [paths, setPaths] = useState<React.ReactElement[]>([]);

  const calculatePaths = useCallback(() => {
    const newPaths: React.ReactElement[] = [];
    const canvas = document.getElementById('zoom-canvas');
    if (!canvas) return;

    const canvasRect = canvas.getBoundingClientRect();
    const scale = canvasRect.width / canvas.offsetWidth;

    // پیدا کردن واحدها (والدین و فرزندان)
    const units = new Map<string, { parentIds: string[], childrenIds: string[] }>();

    members.forEach(m => {
      const p1 = m.fatherId;
      const p2 = m.motherId;
      if (!p1 && !p2) return;

      const pObj1 = p1 ? members.find(x => x.id === p1) : null;
      const pObj2 = p2 ? members.find(x => x.id === p2) : null;

      let unitKey = '';
      let unitParents: string[] = [];

      if (p1 && p2) {
        unitParents = [p1, p2].sort();
        unitKey = unitParents.join('_');
      } else {
        const parent = pObj1 || pObj2;
        if (parent?.spouseId) {
          unitParents = [parent.id, parent.spouseId].sort();
          unitKey = unitParents.join('_');
        } else if (parent) {
          unitParents = [parent.id];
          unitKey = parent.id;
        }
      }

      if (unitKey) {
        if (!units.has(unitKey)) {
          units.set(unitKey, { parentIds: unitParents, childrenIds: [] });
        }
        units.get(unitKey)!.childrenIds.push(m.id);
      }
    });

    units.forEach(({ parentIds, childrenIds }, key) => {
      let sx: number | undefined, sy: number | undefined;

      // نقطه شروع (از آیکون قلب یا مرکز والد)
      if (parentIds.length === 2) {
        const heartEl = document.getElementById(`heart-${parentIds[0]}-${parentIds[1]}`) || 
                        document.getElementById(`heart-${parentIds[1]}-${parentIds[0]}`);
        if (heartEl) {
          const r = heartEl.getBoundingClientRect();
          sx = (r.left + r.width / 2 - canvasRect.left) / scale;
          sy = (r.bottom - canvasRect.top) / scale;
        }
      } else {
        const pEl = document.getElementById(`member-${parentIds[0]}`);
        if (pEl) {
          const r = pEl.getBoundingClientRect();
          sx = (r.left + r.width / 2 - canvasRect.left) / scale;
          sy = (r.bottom - canvasRect.top) / scale;
        }
      }

      if (sx === undefined || sy === undefined) return;

      // کشیدن خطوط منحنی به هر فرزند
      childrenIds.forEach(cId => {
        const cEl = document.getElementById(`member-${cId}`);
        if (cEl) {
          const r = cEl.getBoundingClientRect();
          const cx = (r.left + r.width / 2 - canvasRect.left) / scale;
          const cy = (r.top - canvasRect.top) / scale;
          const midY = (sy + cy) / 2;
          const d = `M ${sx} ${sy} C ${sx} ${midY}, ${cx} ${midY}, ${cx} ${cy}`;
          newPaths.push(<path key={`${key}-${cId}`} d={d} fill="none" stroke="#10b981" strokeWidth="2" opacity="0.4" />);
        }
      });
    });

    setPaths(newPaths);
  }, [members]);

  useEffect(() => {
    const interval = setInterval(calculatePaths, 100);
    return () => clearInterval(interval);
  }, [calculatePaths]);

  return <svg className="absolute inset-0 pointer-events-none w-full h-full">{paths}</svg>;
};

const TreeNode = ({ memberId, members, selectedId, onMemberClick, processedIds }: any) => {
  if (processedIds.has(memberId)) return null;
  const member = members.find((m: any) => m.id === memberId);
  if (!member) return null;

  processedIds.add(memberId);
  const spouse = member.spouseId ? members.find((m: any) => m.id === member.spouseId) : null;
  if (spouse) processedIds.add(spouse.id);

  const children = members.filter((m: any) => 
    (m.fatherId === member.id || m.motherId === member.id) ||
    (spouse && (m.fatherId === spouse.id || m.motherId === spouse.id))
  );

  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center gap-20 relative mb-48">
        <MemberCard member={member} isSelected={selectedId === member.id} onClick={onMemberClick} />
        {spouse && (
          <>
            <div id={`heart-${member.id}-${spouse.id}`} className="absolute left-1/2 -translate-x-1/2 z-10">
               <div className="bg-slate-900 border border-slate-700 p-2 rounded-full shadow-lg">
                 <Heart size={14} className="text-pink-500 fill-pink-500" />
               </div>
            </div>
            <MemberCard member={spouse} isSelected={selectedId === spouse.id} onClick={onMemberClick} />
          </>
        )}
      </div>
      {children.length > 0 && (
        <div className="flex gap-24 relative items-start">
          {children.map((child: any) => (
            <TreeNode key={child.id} memberId={child.id} members={members} selectedId={selectedId} onMemberClick={onMemberClick} processedIds={processedIds} />
          ))}
        </div>
      )}
    </div>
  );
};

const App: React.FC = () => {
  const [data, setData] = useState<TreeData>(() => {
    try {
      const saved = localStorage.getItem('family_tree_v15');
      return saved ? JSON.parse(saved) : INITIAL_DATA;
    } catch {
      return INITIAL_DATA;
    }
  });
  
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Tree);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);

  useEffect(() => {
    localStorage.setItem('family_tree_v15', JSON.stringify(data));
  }, [data]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0 && (e.target as HTMLElement).id === 'canvas-wrapper') setIsPanning(true);
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) setPan(prev => ({ x: prev.x + e.movementX, y: prev.y + e.movementY }));
  };

  const handleAddMember = () => {
    const newMember: FamilyMember = { id: crypto.randomUUID(), firstName: 'New', lastName: 'Member', gender: 'male' };
    setData(prev => ({ members: [...prev.members, newMember] }));
    setSelectedId(newMember.id);
  };

  const handleSaveMember = (updated: FamilyMember) => {
    setData(prev => {
      let list = prev.members.map(m => m.id === updated.id ? updated : m);
      if (updated.spouseId) {
        list = list.map(m => m.id === updated.spouseId ? { ...m, spouseId: updated.id } : m);
      }
      return { members: list };
    });
    setSelectedId(null);
  };

  const handleDeleteMember = (id: string) => {
    if (!window.confirm('Delete this person?')) return;
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
    setData(prev => {
      const p = prev.members.find(m => m.id === parentId);
      if (!p) return prev;
      const spouse = p.spouseId ? prev.members.find(m => m.id === p.spouseId) : null;
      const child: FamilyMember = {
        id: crypto.randomUUID(),
        firstName: 'New Child',
        lastName: p.lastName,
        gender: 'male',
        fatherId: p.gender === 'male' ? p.id : spouse?.id,
        motherId: p.gender === 'female' ? p.id : spouse?.id
      };
      return { members: [...prev.members, child] };
    });
  };

  const handleAddParent = (childId: string, type: 'father' | 'mother') => {
    setData(prev => {
      const child = prev.members.find(m => m.id === childId);
      if (!child) return prev;
      const parent: FamilyMember = {
        id: crypto.randomUUID(),
        firstName: 'New',
        lastName: child.lastName,
        gender: type === 'father' ? 'male' : 'female'
      };
      const updated = prev.members.map(m => {
        if (m.id === childId) return { ...m, [type === 'father' ? 'fatherId' : 'motherId']: parent.id };
        return m;
      });
      return { members: [...updated, parent] };
    });
  };

  const roots = useMemo(() => {
    const rendered = new Set<string>();
    const results: FamilyMember[] = [];
    data.members.forEach(m => {
      const hasParents = (m.fatherId && data.members.some(x => x.id === m.fatherId)) || 
                        (m.motherId && data.members.some(x => x.id === m.motherId));
      if (!hasParents && !rendered.has(m.id)) {
        results.push(m);
        rendered.add(m.id);
        if (m.spouseId) rendered.add(m.spouseId);
      }
    });
    return results;
  }, [data.members]);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-slate-950 text-slate-200">
      <nav className="h-14 border-b border-white/5 bg-slate-900/90 backdrop-blur-md flex items-center justify-between px-6 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center font-bold">H</div>
          <span className="font-bold text-sm tracking-tight">Heritage Tree</span>
        </div>
        <div className="flex items-center gap-1 bg-slate-950/50 p-1 rounded-lg border border-white/5 text-[10px]">
           <button onClick={() => setViewMode(ViewMode.Tree)} className={`px-4 py-1.5 rounded-md font-bold uppercase ${viewMode === ViewMode.Tree ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500'}`}>Tree</button>
           <button onClick={() => setViewMode(ViewMode.List)} className={`px-4 py-1.5 rounded-md font-bold uppercase ${viewMode === ViewMode.List ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500'}`}>List</button>
        </div>
        <button onClick={handleAddMember} className="bg-white text-slate-950 px-4 py-2 rounded-lg text-xs font-bold">Add Member</button>
      </nav>

      <main 
        id="canvas-wrapper"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={() => setIsPanning(false)}
        className="flex-1 relative overflow-hidden canvas-grid"
      >
        {viewMode === ViewMode.Tree ? (
          <div 
            id="zoom-canvas"
            className="absolute origin-top-left"
            style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, left: '50%', top: '20%', width: '10000px', height: '10000px', marginLeft: '-5000px' }}
          >
            <TreeLines members={data.members} />
            <div className="relative flex flex-col gap-96 items-center pt-32">
              {roots.map(root => (
                <TreeNode key={root.id} memberId={root.id} members={data.members} selectedId={selectedId} onMemberClick={setSelectedId} processedIds={new Set()} />
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto mt-10 bg-slate-900 rounded-2xl border border-white/5 p-6 overflow-auto max-h-[80vh]">
            <table className="w-full text-left">
              <thead className="text-[10px] uppercase text-slate-500 border-b border-white/5">
                <tr><th className="px-6 py-4">Name</th><th className="px-6 py-4">Gender</th><th className="px-6 py-4 text-right">Action</th></tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {data.members.map(m => (
                  <tr key={m.id} className="hover:bg-white/5"><td className="px-6 py-4 font-bold">{m.firstName} {m.lastName}</td><td className="px-6 py-4 capitalize opacity-60">{m.gender}</td><td className="px-6 py-4 text-right"><button onClick={() => setSelectedId(m.id)} className="text-emerald-400 font-bold">Manage</button></td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="absolute bottom-6 right-6 flex flex-col gap-2 z-40">
           <div className="bg-slate-900/90 border border-white/10 rounded-xl p-1 flex flex-col shadow-2xl backdrop-blur-md">
              <button onClick={() => setZoom(z => Math.min(z + 0.1, 3))} className="p-3 text-slate-400 hover:text-white"><ZoomIn size={18} /></button>
              <button onClick={() => setZoom(z => Math.max(z - 0.1, 0.1))} className="p-3 text-slate-400 hover:text-white"><ZoomOut size={18} /></button>
              <button onClick={() => {setZoom(1); setPan({x:0,y:0});}} className="p-3 text-slate-400 hover:text-white border-t border-white/5"><Maximize size={18} /></button>
           </div>
        </div>
      </main>

      <MemberSidebar 
        member={data.members.find(m => m.id === selectedId) || null} 
        allMembers={data.members} 
        onClose={() => setSelectedId(null)} 
        onSave={handleSaveMember} 
        onDelete={handleDeleteMember} 
        onAddChild={handleAddChild} 
        onAddFather={(id) => handleAddParent(id, 'father')} 
        onAddMother={(id) => handleAddParent(id, 'mother')} 
      />
    </div>
  );
};

export default App;
