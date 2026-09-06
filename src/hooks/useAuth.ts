"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// Auth: exige login, carrega perfil e mantém username + avatar.
export function useAuth(supabase: any) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [username, setUsername] = useState("Você");
  const [avatar, setAvatar] = useState("😎");

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }: any) => {
      if (!user) {
        router.push("/login");
        return;
      }
      setUser(user);
      // busca perfil
      const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (profile?.username) setUsername(profile.username);
      else if (user.user_metadata?.username) setUsername(user.user_metadata.username);
      else setUsername(user.email?.split("@")[0] || "Você");
      if (profile?.avatar) setAvatar(profile.avatar);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((event: string, session: any) => {
      if (event === "SIGNED_OUT" || !session) router.push("/login");
    });
    return () => listener.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { user, username, setUsername, avatar, setAvatar };
}
