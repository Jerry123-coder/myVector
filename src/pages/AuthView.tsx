import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Shield, Mail, Lock, Loader2, ArrowRight, UserPlus, LogIn } from 'lucide-react';

interface AuthViewProps {
  onSuccess?: () => void;
}

export const AuthView = ({ onSuccess }: AuthViewProps) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        
        if (data.session) {
          // If auto-logged in (email confirmation disabled)
          if (onSuccess) onSuccess();
        } else {
          // Email confirmation enabled
          setError("Verification protocol initiated. Check your email to confirm identity.");
        }
      }
      if (isLogin && onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-6">
      <div className="w-full max-w-md p-8 relative overflow-hidden" 
           style={{ background: '#1a1c20', border: '1px solid rgba(0,219,233,0.1)' }}>
        
        {/* Minimal functional container */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 flex items-center justify-center rounded-xl mb-4"
               style={{ background: 'rgba(0,219,233,0.05)', border: '1px solid rgba(0,219,233,0.2)' }}>
            <Shield className="text-primary" size={24} />
          </div>
          <h2 className="font-headline font-black text-2xl text-primary uppercase tracking-tight">
            {isLogin ? 'Vector_Access' : 'Vector_Initialize'}
          </h2>
          <p className="text-[10px] text-on-surface-variant uppercase tracking-[0.2em] font-bold mt-1">
            System Authentication
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest pl-1">
              Terminal Identifier (Email)
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/40" size={14} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#0c0e12] border border-white/5 px-10 py-3 text-sm font-body text-primary focus:border-primary/50 focus:outline-none transition-colors"
                placeholder="USER@VECTOR.OS"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest pl-1">
              Encrypted Key (Password)
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/40" size={14} />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#0c0e12] border border-white/5 px-10 py-3 text-sm font-body text-primary focus:border-primary/50 focus:outline-none transition-colors"
                placeholder="********"
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-error/10 border border-error/20 text-error text-[11px] font-bold uppercase tracking-wide">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full relative flex items-center justify-center gap-2 py-3 px-6 overflow-hidden transition-all duration-150 rounded-sm"
            style={{ background: '#00dbe9', color: '#002022' }}
          >
            <span className="relative z-10 font-headline font-black text-xs uppercase tracking-widest flex items-center gap-2">
              {loading ? <Loader2 className="animate-spin" size={16} /> : isLogin ? 'Authenticate' : 'Register'}
              {!loading && <ArrowRight size={14} />}
            </span>
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-white/5 flex flex-col items-center gap-4">
          <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-widest">
            {isLogin ? 'New Operator?' : 'Existing Protocol?'}
          </p>
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="flex items-center gap-2 text-[11px] font-headline font-bold text-on-surface-variant hover:text-primary uppercase transition-colors"
          >
            {isLogin ? <UserPlus size={14} /> : <LogIn size={14} />}
            {isLogin ? 'Create Account' : 'Return to Login'}
          </button>
        </div>
      </div>
    </div>
  );
};
