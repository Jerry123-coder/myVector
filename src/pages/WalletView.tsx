export const WalletView = () => {
  return (
    <div className="min-h-screen px-4 md:px-8 py-8 flex flex-col items-center justify-center">
      <div className="w-full max-w-lg p-10 text-center" style={{ background: '#1e2024', borderTop: '2px solid #00dbe9', boxShadow: 'inset 0 0 40px rgba(0,219,233,0.02)' }}>
        <div className="w-16 h-16 mx-auto mb-6 flex items-center justify-center rounded-full" style={{ background: 'rgba(0,219,233,0.05)', border: '1px solid rgba(0,219,233,0.2)' }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00dbe9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a8 8 0 0 1-5.45 7.59c-.36.12-.76.15-1.15.15h-11a2 2 0 0 1-2-2v-11"/><path d="M19 12h-3a2 2 0 0 0 0 4h3v-4Z"/></svg>
        </div>
        <h1 className="font-headline font-black text-2xl text-primary uppercase tracking-widest mb-2">Vector Wallet</h1>
        <p className="font-body text-sm text-on-surface-variant leading-relaxed">
          The financial operations and asset tracking sub-system is currently under construction.
        </p>
        <div className="mt-8 pt-6 border-t border-surface-container-highest flex flex-wrap justify-center gap-3">
            <span className="px-3 py-1 bg-surface-container-high rounded text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Incoming Update</span>
            <span className="px-3 py-1 bg-surface-container-high rounded text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">v1.1 Framework</span>
        </div>
      </div>
    </div>
  );
};
