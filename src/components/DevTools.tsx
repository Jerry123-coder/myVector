import { useState } from 'react';
import { Settings2, X, Zap, Trash2, RefreshCw, FlaskConical, FlaskConicalOff } from 'lucide-react';
import { seedDemoData, clearAllData } from '../lib/seedData';
import { seedTestData, clearTestData } from '../lib/seedTestData';
import { useDb } from '../lib/DbContext';

export const DevTools = () => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const { isTestMode, setTestMode } = useDb();

  const run = async (label: string, fn: () => Promise<void>) => {
    setLoading(label);
    try { await fn(); } catch(e) { console.error(e); } finally { setLoading(null); }
    setOpen(false);
  };

  return (
    <div className="fixed bottom-20 md:bottom-4 right-4 z-50 flex flex-col items-end gap-2">
      {open && (
        <div className="mb-1 w-72 p-4 flex flex-col gap-3"
          style={{ background:'#0c0e12', border:`1px solid ${isTestMode ? 'rgba(180,100,255,0.4)' : 'rgba(255,186,56,0.3)'}`, boxShadow:'0 8px 32px rgba(0,0,0,0.8)' }}>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="font-headline font-black text-[10px] uppercase tracking-widest text-tertiary-fixed-dim">Dev Tools</span>
              {isTestMode && (
                <span className="px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-widest bg-[rgba(180,100,255,0.15)] text-[#b464ff] border border-[rgba(180,100,255,0.3)]">
                  TEST MODE
                </span>
              )}
            </div>
            <button onClick={() => setOpen(false)} className="w-5 h-5 flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors">
              <X size={12} />
            </button>
          </div>

          {/* ── Test Mode Toggle ── */}
          <button
            onClick={() => setTestMode(!isTestMode)}
            className="w-full py-2.5 flex items-center justify-center gap-2 font-headline font-bold text-[10px] uppercase tracking-widest transition-all active:scale-95"
            style={{
              background: isTestMode ? 'rgba(180,100,255,0.15)' : 'rgba(180,100,255,0.05)',
              border: `1px solid ${isTestMode ? 'rgba(180,100,255,0.5)' : 'rgba(180,100,255,0.2)'}`,
              color: '#b464ff',
            }}
          >
            {isTestMode ? <FlaskConicalOff size={12} /> : <FlaskConical size={12} />}
            {isTestMode ? 'Exit Test Mode' : 'Enter Test Mode'}
          </button>

          {/* ── Test DB Controls (only in test mode) ── */}
          {isTestMode && (
            <>
              <div className="text-[8px] text-[#b464ff]/50 uppercase tracking-widest px-1">
                ↳ Isolated DB: VectorOS_Dev
              </div>
              <button
                onClick={() => run('seed-test', seedTestData)} disabled={!!loading}
                className="w-full py-2.5 flex items-center justify-center gap-2 font-headline font-bold text-[10px] uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50"
                style={{ background:'rgba(0,219,233,0.1)', border:'1px solid rgba(0,219,233,0.3)', color:'#00dbe9' }}
              >
                {loading === 'seed-test' ? <RefreshCw size={12} className="animate-spin" /> : <Zap size={12} />}
                {loading === 'seed-test' ? 'Seeding...' : 'Seed Rich Test Data'}
              </button>
              <button
                onClick={() => run('clear-test', clearTestData)} disabled={!!loading}
                className="w-full py-2.5 flex items-center justify-center gap-2 font-headline font-bold text-[10px] uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50"
                style={{ background:'rgba(255,180,171,0.06)', border:'1px solid rgba(255,180,171,0.15)', color:'#ffb4ab' }}
              >
                {loading === 'clear-test' ? <RefreshCw size={12} className="animate-spin" /> : <Trash2 size={12} />}
                {loading === 'clear-test' ? 'Clearing...' : 'Clear Test Data'}
              </button>
              <div className="h-px bg-surface-container-highest" />
            </>
          )}

          {/* ── Real DB Controls ── */}
          {!isTestMode && (
            <>
              <button onClick={() => run('seed', seedDemoData)} disabled={!!loading}
                className="w-full py-2.5 flex items-center justify-center gap-2 font-headline font-bold text-[10px] uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50"
                style={{ background:'rgba(0,219,233,0.1)', border:'1px solid rgba(0,219,233,0.3)', color:'#00dbe9' }}>
                {loading==='seed' ? <RefreshCw size={12} className="animate-spin"/> : <Zap size={12}/>}
                {loading==='seed' ? 'Seeding...' : 'Load Demo Data (Real DB)'}
              </button>
              <button onClick={() => run('clear', clearAllData)} disabled={!!loading}
                className="w-full py-2.5 flex items-center justify-center gap-2 font-headline font-bold text-[10px] uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50"
                style={{ background:'rgba(255,180,171,0.08)', border:'1px solid rgba(255,180,171,0.2)', color:'#ffb4ab' }}>
                {loading==='clear' ? <RefreshCw size={12} className="animate-spin"/> : <Trash2 size={12}/>}
                {loading==='clear' ? 'Clearing...' : 'Clear Real DB'}
              </button>
            </>
          )}

          <div className="text-[8px] text-on-surface-variant/30 leading-relaxed pt-2 border-t border-surface-container-high">
            DEV MODE // VECTOR_OS v1.3.0-dev
          </div>
        </div>
      )}

      <button onClick={() => setOpen(!open)}
        className="w-10 h-10 flex items-center justify-center transition-all active:scale-95"
        style={{
          background: isTestMode ? 'rgba(180,100,255,0.15)' : open ? 'rgba(255,186,56,0.15)' : 'rgba(11,14,18,0.9)',
          border: `1px solid ${isTestMode ? 'rgba(180,100,255,0.5)' : open ? 'rgba(255,186,56,0.4)' : 'rgba(255,186,56,0.2)'}`,
          boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
          color: isTestMode ? '#b464ff' : '#ffba38',
        }}>
        {isTestMode ? <FlaskConical size={16} /> : <Settings2 size={16} />}
      </button>
    </div>
  );
};
