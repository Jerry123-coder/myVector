import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-8 right-8 z-[9999] flex flex-col gap-3 pointer-events-none">
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 30, scale: 0.9, x: 50 }}
              animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.85, x: 50, transition: { duration: 0.2 } }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              className={`pointer-events-auto relative overflow-hidden flex items-center gap-4 px-6 py-4 rounded-2xl shadow-2xl border ${
                t.type === 'success' ? 'border-secondary/20 text-secondary' :
                t.type === 'error' ? 'border-error/20 text-error' :
                'border-primary/20 text-primary'
              } bg-[#111318]/90 backdrop-blur-xl`}
              style={{
                boxShadow: t.type === 'success' ? '0 10px 40px -10px rgba(0,228,117,0.15)' :
                           t.type === 'error' ? '0 10px 40px -10px rgba(255,82,82,0.15)' :
                           '0 10px 40px -10px rgba(0,219,233,0.15)',
                minWidth: '280px'
              }}
            >
              <div className="shrink-0">
                {t.type === 'success' && <CheckCircle2 size={16} />}
                {t.type === 'error' && <AlertCircle size={16} />}
                {t.type === 'info' && <Info size={16} />}
              </div>
              <p className="font-headline font-black text-[10px] uppercase tracking-widest leading-none flex-1 mt-0.5">
                {t.message}
              </p>
              <button onClick={() => removeToast(t.id)} className="ml-2 opacity-40 hover:opacity-100 transition-opacity">
                <X size={12} />
              </button>

              {/* Progress indicator bar */}
              <motion.div
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: 4, ease: 'linear' }}
                className={`absolute bottom-0 left-0 h-0.5 ${
                  t.type === 'success' ? 'bg-secondary' :
                  t.type === 'error' ? 'bg-error' :
                  'bg-primary'
                } opacity-60`}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
};
