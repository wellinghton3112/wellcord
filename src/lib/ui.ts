// Barramento global de UI: toast + confirm sem window.alert/confirm.
// Funciona em hooks e componentes (sem provider).

export type ToastKind = "error" | "success" | "info";
export type ToastMsg = { id: number; kind: ToastKind; text: string };
export type ConfirmAsk = {
  id: number;
  message: string;
  confirmLabel: string;
  danger: boolean;
  resolve: (v: boolean) => void;
};

type Listener = () => void;
let seq = 1;
const toasts: ToastMsg[] = [];
let pendingConfirm: ConfirmAsk | null = null;
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((l) => l());
}

export function subscribeUi(l: Listener) {
  listeners.add(l);
  return () => { listeners.delete(l); };
}

export function getToasts(): ToastMsg[] {
  return [...toasts];
}

export function getConfirm(): ConfirmAsk | null {
  return pendingConfirm;
}

export function toast(text: string, kind: ToastKind = "error") {
  toasts.push({ id: seq++, kind, text });
  if (toasts.length > 4) toasts.shift();
  emit();
  const id = seq - 1;
  setTimeout(() => {
    const i = toasts.findIndex((t) => t.id === id);
    if (i >= 0) {
      toasts.splice(i, 1);
      emit();
    }
  }, 5000);
}

export function dismissToast(id: number) {
  const i = toasts.findIndex((t) => t.id === id);
  if (i >= 0) {
    toasts.splice(i, 1);
    emit();
  }
}

export function confirmDialog(message: string, opts?: { confirmLabel?: string; danger?: boolean }): Promise<boolean> {
  if (pendingConfirm) pendingConfirm.resolve(false);
  return new Promise((resolve) => {
    pendingConfirm = {
      id: seq++,
      message,
      confirmLabel: opts?.confirmLabel || "Confirmar",
      danger: opts?.danger ?? true,
      resolve: (v: boolean) => {
        pendingConfirm = null;
        emit();
        resolve(v);
      },
    };
    emit();
  });
}

export function resolveConfirm(v: boolean) {
  pendingConfirm?.resolve(v);
}
