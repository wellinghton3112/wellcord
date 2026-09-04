"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

// Página de convite: /join/CODIGO — valida login, resgata e entra no servidor.
export default function JoinPage() {
  const params = useParams();
  const router = useRouter();
  const code = typeof params.code === "string" ? params.code : "";
  const [status, setStatus] = useState("Validando convite...");

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setStatus("Faça login para aceitar o convite — depois abra o link de novo.");
        return;
      }
      const { data, error } = await supabase.rpc("redeem_invite", { p_code: code.trim().toLowerCase() });
      if (error) {
        setStatus("Convite inválido: " + error.message);
        return;
      }
      setStatus("Muito bem! Entrando no servidor...");
      router.push(`/?server=${data}`);
    })();
  }, [code, router]);

  return (
    <div className="min-h-screen bg-[#313338] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#2B2D31] rounded-lg p-8 text-center shadow-2xl">
        <h1 className="text-xl font-bold text-white">Convite Wellcord</h1>
        <p className="text-sm text-zinc-400 mt-2 font-mono">wellcord.vercel.app/join/{code}</p>
        <p className="text-sm text-zinc-300 mt-4">{status}</p>
        {status.startsWith("Faça login") && (
          <button onClick={() => router.push("/login")} className="mt-4 px-6 py-2 bg-[#5865F2] hover:bg-[#4752C4] rounded text-sm font-medium text-white">Ir para login</button>
        )}
      </div>
    </div>
  );
}
