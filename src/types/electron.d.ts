export {};

declare global {
  interface Window {
    wellcord?: {
      platform: string;
      versions: { electron: string; chrome: string; node: string };
      tray: { update: (state: { unread?: number; inVoice?: boolean; muted?: boolean }) => void };
      ptt: {
        set: (accelerator: string | null) => Promise<boolean>;
        onPress: (cb: () => void) => () => void;
      };
      voice: { onControl: (cb: (action: string) => void) => () => void };
      screens?: {
        list: () => Promise<{ id: string; name: string; screen: boolean; thumbnail: string | null }[]>;
      };
    };
  }
}
