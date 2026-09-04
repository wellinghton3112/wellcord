"use client";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { APP_VERSION } from "@/lib/version";

export default function LoginPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
    <div className="min-h-screen bg-[#313338] flex items-center justify-center p-4">
      <div className="w-full max-w-[480px] bg-[#313338] rounded-lg overflow-hidden shadow-2xl border border-[#232428]">
        <div className="bg-[#5865F2] h-2" />
        <div className="p-8">
          <h1 className="text-2xl font-bold text-white text-center">Boas-vindas ao Wellcord!</h1>
          <p className="text-zinc-400 text-center text-sm mt-1">O Discord dos seus amigos — agora com login seguro</p>

          <div className="flex bg-[#2B2D31] rounded-full p-1 mt-6">
            <button onClick={() => setMode("login")} className={`flex-1 py-1.5 rounded-full text-sm font-medium ${mode === "login" ? "bg-[#404249] text-white" : "text-zinc-400"}`}>Entrar</button>
            <button onClick={() => setMode("register")} className={`flex-1 py-1.5 rounded-full text-sm font-medium ${mode === "register" ? "bg-[#404249] text-white" : "text-zinc-400"}`}>Registrar</button>
          </div>

          <form onSubmit={handle} className="mt-6 space-y-4">
            {mode === "register" && (
              <div>
                <label className="text-xs font-bold text-zinc-300 uppercase">Nome de usuário *</label>
                <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="ex: wellington" className="w-full mt-1 bg-[#2B2D31] border border-[#1E1F22] rounded px-3 py-2.5 text-white outline-none focus:border-[#5865F2]" required />
              </div>
            )}
            <div>
              <label className="text-xs font-bold text-zinc-300 uppercase">Email *</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@email.com" className="w-full mt-1 bg-[#2B2D31] border border-[#1E1F22] rounded px-3 py-2.5 text-white outline-none focus:border-[#5865F2]" required />
            </div>
            <div>
              <label className="text-xs font-bold text-zinc-300 uppercase">Senha *</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full mt-1 bg-[#2B2D31] border border-[#1E1F22] rounded px-3 py-2.5 text-white outline-none focus:border-[#5865F2]" required />
              <p className="text-xs text-zinc-500 mt-1">Mínimo 6 caracteres</p>
            </div>
            {error && <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded p-2">{error}</p>}
            <button type="submit" disabled={loading} className="w-full bg-[#5865F2] hover:bg-[#4752C4] disabled:opacity-50 text-white font-medium py-2.5 rounded transition-colors">
              {loading ? "Carregando..." : mode === "login" ? "Entrar" : "Criar conta"}
            </button>
          </form>
          <p className="text-xs text-zinc-500 text-center mt-6">Ao registrar, você concorda com os Termos do Wellcord. Perfil salvo em Supabase Auth.</p>
          <p className="text-[10px] font-mono text-zinc-600 text-center mt-2">{APP_VERSION}</p>
        </div>
      </div>
    </div>
  );
}
