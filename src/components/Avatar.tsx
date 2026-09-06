"use client";

type Props = {
  src?: string | null;
  name?: string;
  className?: string;
};

// Avatar: foto se for URL, senão emoji/inicial. Uso global no lugar dos 😎 fixos.
export default function Avatar({ src, name, className }: Props) {
  const cls = className || "w-8 h-8 rounded-full";
  if (src && /^https?:\/\//.test(src)) {
    return <img src={src} alt={name || ""} className={`${cls} object-cover shrink-0`} />;
  }
  if (src) {
    return (
      <span className={`${cls} flex items-center justify-center shrink-0`}>
        {src}
      </span>
    );
  }
  const initial = (name || "?").trim().charAt(0).toUpperCase() || "?";
  return (
    <span className={`${cls} flex items-center justify-center shrink-0`}>
      {initial}
    </span>
  );
}
