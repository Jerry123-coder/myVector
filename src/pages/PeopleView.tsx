export const PeopleView = () => {
  return (
    <div className="min-h-screen px-4 md:px-8 py-8 flex flex-col items-center justify-center">
      <div className="w-full max-w-lg p-10 text-center" style={{ background: '#1e2024', borderTop: '2px solid #00e475', boxShadow: 'inset 0 0 40px rgba(0,228,117,0.02)' }}>
        <div className="w-16 h-16 mx-auto mb-6 flex items-center justify-center rounded-full" style={{ background: 'rgba(0,228,117,0.05)', border: '1px solid rgba(0,228,117,0.2)' }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00e475" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        </div>
        <h1 className="font-headline font-black text-2xl text-secondary uppercase tracking-widest mb-2">People Directory</h1>
        <p className="font-body text-sm text-on-surface-variant leading-relaxed">
          The network management and team collaboration sub-system is currently under construction.
        </p>
        <div className="mt-8 pt-6 border-t border-surface-container-highest flex flex-wrap justify-center gap-3">
            <span className="px-3 py-1 bg-surface-container-high rounded text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Incoming Update</span>
            <span className="px-3 py-1 bg-surface-container-high rounded text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">v1.2 Framework</span>
        </div>
      </div>
    </div>
  );
};
