import type { ToastState } from "../hooks/useToast";
import styles from "./Toast.module.css";

export default function Toast({ toast }: { toast: ToastState | null }) {
  if (!toast) return null;
  return (
    <div className={`${styles.toast} ${styles[toast.type] ?? ""}`} role={toast.type === "error" ? "alert" : "status"}>
      {toast.msg}
    </div>
  );
}
