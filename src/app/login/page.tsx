"use client";
import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { APP_VERSION } from "@/lib/version";
import { loadSettings, applyTheme } from "@/components/modals/SettingsModal";

export default function LoginPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Aplica tema salvo (claro/escuro + destaque) mesmo antes do login
  useEffect(() => {
    const s = loadSettings();
    applyTheme(s.theme, s.accentColor);
  }, []);

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "register") {
        if (!username.trim()) throw new Error("Escolha um nome de usuário");
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { username } },
        });
        if (error) throw error;
        // Se confirmação de email estiver desabilitada, já loga
        const { error: loginErr } = await supabase.auth.signInWithPassword({ email, password });
        if (!loginErr) router.push("/");
        else setError("Conta criada! Verifique seu email para confirmar e depois faça login.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push("/");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-[480px] bg-background rounded-lg overflow-hidden shadow-2xl border border-border">
        <div className="bg-accent h-2" />
        <div className="p-8">
          <h1 className="text-2xl font-bold text-foreground text-center">Boas-vindas ao WellCORD!</h1>
          <p className="text-zinc-400 text-center text-sm mt-1">O Discord dos seus amigos — agora com login seguro</p>

          <div className="flex bg-surface rounded-full p-1 mt-6">
            <button onClick={() => setMode("login")} className={`flex-1 py-1.5 rounded-full text-sm font-medium ${mode === "login" ? "bg-surface-active text-foreground" : "text-zinc-400"}`}>Entrar</button>
            <button onClick={() => setMode("register")} className={`flex-1 py-1.5 rounded-full text-sm font-medium ${mode === "register" ? "bg-surface-active text-foreground" : "text-zinc-400"}`}>Registrar</button>
          </div>

          <form onSubmit={handle} className="mt-6 space-y-4">
            {mode === "register" && (
              <div>
                <label className="text-xs font-bold text-zinc-500 uppercase">Nome de usuário *</label>
                <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="ex: wellington" className="w-full mt-1 bg-surface border border-input-bg rounded px-3 py-2.5 text-foreground outline-none focus:border-accent" required />
              </div>
            )}
            <div>
              <label className="text-xs font-bold text-zinc-500 uppercase">Email *</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@email.com" className="w-full mt-1 bg-surface border border-input-bg rounded px-3 py-2.5 text-foreground outline-none focus:border-accent" required />
            </div>
            <div>
              <label className="text-xs font-bold text-zinc-500 uppercase">Senha *</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full mt-1 bg-surface border border-input-bg rounded px-3 py-2.5 text-foreground outline-none focus:border-accent" required />
              <p className="text-xs text-zinc-400 mt-1">Mínimo 6 caracteres</p>
            </div>
            {error && <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded p-2">{error}</p>}
            <button type="submit" disabled={loading} className="w-full bg-accent hover:bg-accent-hover disabled:opacity-50 text-white font-medium py-2.5 rounded transition-colors">
              {loading ? "Carregando..." : mode === "login" ? "Entrar" : "Criar conta"}
            </button>
          </form>
          <p className="text-xs text-zinc-400 text-center mt-6">Ao registrar, você concorda com os Termos do WellCORD. Perfil salvo em Supabase Auth.</p>
          <p className="text-[10px] font-mono text-zinc-600 text-center mt-2">{APP_VERSION}</p>
        </div>
      </div>
    </div>
  );
}
