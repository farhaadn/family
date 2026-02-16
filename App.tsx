
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { FamilyMember, TreeData, ViewMode } from './types';
import MemberCard from './components/MemberCard';
import MemberSidebar from './components/MemberSidebar';
import { Heart, Maximize, ZoomIn, ZoomOut } from 'lucide-react';

const INITIAL_DATA: TreeData = {
  members: [
    {
      id: 'm-1',
      firstName: '',
      lastName: '',
      gender: 'male',
    }
  ]
};

const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

// --- Connection Line Component ---
const TreeLines = ({ members }: { members: FamilyMember[] }) => {
  const [paths, setPaths] = useState<React.ReactElement[]>([]);

  const calculatePaths = useCallback(() => {
    const newPaths: React.ReactElement[] = [];
    const canvas = document.getElementById('zoom-canvas');
    if (!canvas) return;

    const canvasRect = canvas.getBoundingClientRect();
    const scale = canvasRect.width / canvas.offsetWidth || 1;

    const units = new Map<string, { parentIds: string[], childrenIds: string[] }>();

    members.forEach(m => {
      const p1 = m.fatherId;
      const p2 = m.motherId;
      if (!p1 && !p2) return;

      let unitKey = '';
      let unitParents: string[] = [];

      if (p1 && p2) {
        unitParents = [p1, p2].sort();
        unitKey = unitParents.join('_');
      } else {
        const singleId = p1 || p2;
        if (singleId) {
          const parent = members.find(x => x.id === singleId);
          if (parent?.spouseId) {
            unitParents = [parent.id, parent.spouseId].sort();
            unitKey = unitParents.join('_');
          } else {
            unitParents = [singleId];
            unitKey = singleId;
          }
        }
      }

      if (unitKey) {
        if (!units.has(unitKey)) {
          units.set(unitKey, { parentIds: unitParents, childrenIds: [] });
        }
        const u = units.get(unitKey)!;
        if (!u.childrenIds.includes(m.id)) u.childrenIds.push(m.id);
      }
    });

    units.forEach(({ parentIds, childrenIds }, key) => {
      let sx: number | undefined, sy: number | undefined;

      if (parentIds.length === 2) {
        const heartId = `heart-${parentIds[0]}-${parentIds[1]}`;
        const altHeartId = `heart-${parentIds[1]}-${parentIds[0]}`;
        const heartEl = document.getElementById(heartId) || document.getElementById(altHeartId);
        
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

      if (sx !== undefined && sy !== undefined) {
        childrenIds.forEach(cId => {
          const cEl = document.getElementById(`member-${cId}`);
          if (cEl) {
            const r = cEl.getBoundingClientRect();
            const cx = (r.left + r.width / 2 - canvasRect.left) / scale;
            const cy = (r.top - canvasRect.top) / scale;
            const midY = (sy! + cy) / 2;
            newPaths.push(
              <path 
                key={`line-${key}-${cId}`} 
                d={`M ${sx} ${sy} C ${sx} ${midY}, ${cx} ${midY}, ${cx} ${cy}`} 
                fill="none" stroke="#10b981" strokeWidth="2" opacity="0.4"
              />
            );
          }
        });
      }
    });

    setPaths(newPaths);
  }, [members]);

  useEffect(() => {
    const timer = setInterval(calculatePaths, 150);
    return () => clearInterval(timer);
  }, [calculatePaths]);

  return <svg className="absolute inset-0 pointer-events-none overflow-visible">{paths}</svg>;
};

const TreeNode = ({ memberId, members, selectedId, onMemberClick, globalProcessed }: any) => {
  if (globalProcessed.has(memberId)) return null;
  
  const member = members.find((m: any) => m.id === memberId);
  if (!member) return null;

  globalProcessed.add(memberId);
  const spouse = member.spouseId ? members.find((m: any) => m.id === member.spouseId) : null;
  if (spouse) globalProcessed.add(spouse.id);

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
            <TreeNode 
              key={child.id}
              memberId={child.id} 
              members={members} 
              selectedId={selectedId}
              onMemberClick={onMemberClick}
              globalProcessed={globalProcessed}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const App: React.FC = () => {
  const [data, setData] = useState<TreeData>(() => {
    const saved = localStorage.getItem('family_tree_v14');
    return saved ? JSON.parse(saved) : INITIAL_DATA;
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Tree);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);

  useEffect(() => {
    localStorage.setItem('family_tree_v14', JSON.stringify(data));
  }, [data]);

  // منطق هوشمند برای پیدا کردن ریشه‌های واقعی (کسانی که فرزند کسی نیستند)
  const roots = useMemo(() => {
    const childrenIds = new Set<string>();
    data.members.forEach(m => {
      if (m.fatherId) childrenIds.add(m.fatherId);
      if (m.motherId) childrenIds.add(m.motherId);
    });

    const rootCandidates = data.members.filter(m => {
      const hasFatherInList = m.fatherId && data.members.some(x => x.id === m.fatherId);
      const hasMotherInList = m.motherId && data.members.some(x => x.id === m.motherId);
      return !hasFatherInList && !hasMotherInList;
    });

    const rootList: FamilyMember[] = [];
    const seen = new Set<string>();

    rootCandidates.forEach(m => {
      if (!seen.has(m.id)) {
        rootList.push(m);
        seen.add(m.id);
        if (m.spouseId) seen.add(m.spouseId);
      }
    });
    return rootList;
  }, [data.members]);

  const globalProcessed = new Set<string>();

  const handleAddMember = () => {
    const newM: FamilyMember = { id: generateId(), firstName: '', lastName: '', gender: 'male' };
    setData(prev => ({ members: [...prev.members, newM] }));
    setSelectedId(newM.id);
  };

  const handleSave = (u: FamilyMember) => {
    setData(prev => {
      let list = prev.members.map(m => m.id === u.id ? u : m);
      if (u.spouseId) list = list.map(m => m.id === u.spouseId ? { ...m, spouseId: u.id } : m);
      return { members: list };
    });
    setSelectedId(null);
  };

  const handleDelete = (id: string) => {
    if (!confirm('Delete this person?')) return;
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

  const handleAddChild = (pId: string) => {
    const p = data.members.find(m => m.id === pId);
    if (!p) return;
    const s = p.spouseId ? data.members.find(m => m.id === p.spouseId) : null;
    const newC: FamilyMember = {
      id: generateId(), firstName: '', lastName: p.lastName, gender: 'male',
      fatherId: p.gender === 'male' ? p.id : (s?.gender === 'male' ? s.id : undefined),
      motherId: p.gender === 'female' ? p.id : (s?.gender === 'female' ? s.id : undefined),
    };
    setData(prev => ({ members: [...prev.members, newC] }));
    setSelectedId(newC.id);
  };

  return (
    <div className="h-screen flex flex-col bg-slate-950 text-slate-200">
      <nav className="h-14 border-b border-white/5 bg-slate-900/90 backdrop-blur-md flex items-center justify-between px-6 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold">H</div>
          <span className="font-bold text-sm tracking-tight">Heritage Tree</span>
        </div>
        <div className="flex bg-slate-950 p-1 rounded-lg border border-white/5">
           <button onClick={() => setViewMode(ViewMode.Tree)} className={`px-4 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all ${viewMode === ViewMode.Tree ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>Tree View</button>
           <button onClick={() => setViewMode(ViewMode.List)} className={`px-4 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all ${viewMode === ViewMode.List ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>Table List</button>
        </div>
        <button onClick={handleAddMember} className="bg-white text-slate-950 hover:bg-slate-100 px-4 py-2 rounded-lg text-xs font-bold transition-all active:scale-95 shadow-lg shadow-white/5">Add Member</button>
      </nav>

      <main 
        onMouseDown={(e) => (e.target as HTMLElement).id === 'canvas-wrapper' && setIsPanning(true)}
        onMouseMove={(e) => isPanning && setPan(p => ({ x: p.x + e.movementX, y: p.y + e.movementY }))}
        onMouseUp={() => setIsPanning(false)}
        id="canvas-wrapper"
        className="flex-1 relative overflow-hidden canvas-grid"
      >
        {viewMode === ViewMode.Tree ? (
          <div 
            id="zoom-canvas"
            className="absolute origin-top-left transition-transform duration-75"
            style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, left: '50%', top: '20%', width: '1px' }}
          >
            <TreeLines members={data.members} />
            <div className="relative flex flex-col gap-96 items-center">
              {roots.map(root => (
                <TreeNode 
                  key={root.id} memberId={root.id} members={data.members} 
                  selectedId={selectedId} onMemberClick={setSelectedId} 
                  globalProcessed={globalProcessed} 
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto mt-20 bg-slate-900 rounded-2xl p-6 border border-white/5 shadow-2xl overflow-auto max-h-[70vh]">
            <table className="w-full text-left">
              <thead className="text-[10px] text-slate-500 uppercase font-bold border-b border-white/5">
                <tr><th className="px-6 py-4">Full Name</th><th className="px-6 py-4">Gender</th><th className="px-6 py-4 text-right">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {data.members.map(m => (
                  <tr key={m.id} className="hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-4 text-sm font-bold text-slate-200">{m.firstName || 'Unnamed'} {m.lastName}</td>
                    <td className="px-6 py-4 text-xs text-slate-500 capitalize">{m.gender}</td>
                    <td className="px-6 py-4 text-right"><button onClick={() => setSelectedId(m.id)} className="text-blue-400 text-xs font-bold hover:underline">Edit Member</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="absolute bottom-6 right-6 flex flex-col gap-2">
           <div className="bg-slate-900/90 border border-white/10 rounded-xl p-1 flex flex-col shadow-2xl backdrop-blur-md">
              <button onClick={() => setZoom(z => Math.min(z + 0.1, 2))} className="p-3 text-slate-400 hover:text-white transition-colors"><ZoomIn size={18} /></button>
              <button onClick={() => setZoom(z => Math.max(z - 0.1, 0.2))} className="p-3 text-slate-400 hover:text-white transition-colors"><ZoomOut size={18} /></button>
              <button onClick={() => {setZoom(1); setPan({x:0,y:0})}} className="p-3 text-slate-400 hover:text-white border-t border-white/5 transition-colors"><Maximize size={18} /></button>
           </div>
        </div>
      </main>

      <MemberSidebar 
        member={data.members.find(m => m.id === selectedId) || null} allMembers={data.members}
        onClose={() => setSelectedId(null)} onSave={handleSave} onDelete={handleDelete}
        onAddChild={handleAddChild}
        onAddFather={(id) => {
          const m = data.members.find(x => x.id === id);
          if (!m) return;
          const newF: FamilyMember = { id: generateId(), firstName: '', lastName: m.lastName, gender: 'male' };
          if (m.motherId) newF.spouseId = m.motherId;
          
          setData(prev => {
            const newList = prev.members.map(x => {
              if (x.id === id) return { ...x, fatherId: newF.id };
              if (m.motherId && x.id === m.motherId) return { ...x, spouseId: newF.id };
              return x;
            });
            return { members: [...newList, newF] };
          });
          setSelectedId(newF.id);
        }}
        onAddMother={(id) => {
          const m = data.members.find(x => x.id === id);
          if (!m) return;
          const newM: FamilyMember = { id: generateId(), firstName: '', lastName: m.lastName, gender: 'female' };
          if (m.fatherId) newM.spouseId = m.fatherId;
          
          setData(prev => {
            const newList = prev.members.map(x => {
              if (x.id === id) return { ...x, motherId: newM.id };
              if (m.fatherId && x.id === m.fatherId) return { ...x, spouseId: newM.id };
              return x;
            });
            return { members: [...newList, newM] };
          });
          setSelectedId(newM.id);
        }}
      />
    </div>
  );
};

export default App;
