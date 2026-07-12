import type { ReactNode } from "react";
import styles from "./styles.module.css";

type MirrorLayoutProps = {
  weather?: ReactNode;
  time?: ReactNode;
  agenda?: ReactNode;
  deviceStatus?: ReactNode;
  center: ReactNode;
  showPanels?: boolean;
  blank?: boolean;
  showGradient?: boolean;
};

export default function MirrorLayout({
  weather,
  time,
  agenda,
  deviceStatus,
  center,
  showPanels = true,
  blank = false,
  showGradient = false
}: MirrorLayoutProps) {
  if (blank) {
    return (
      <main className={styles.root}>{center}</main>
    );
  }

  return (
    <main className={styles.root}>
      {showGradient ? <div className={styles.gradient} /> : null}
      <div className={styles.topLine} />
      <div className={styles.bottomLine} />

      <div className={styles.shell}>
        {showPanels ? (
          <>
            <header className={styles.header}>
              <div className={styles.left}>{weather}</div>
              <div className={styles.right}>{time}</div>
            </header>

            <section className={styles.center}>
              <div className={styles.centerInner}>{center}</div>
            </section>

            <footer className={styles.footer}>
              <div className={styles.left}>{agenda}</div>
              <div className={styles.right}>{deviceStatus}</div>
            </footer>
          </>
        ) : (
          <section className={styles.center}>
            <div className={styles.centerInner}>{center}</div>
          </section>
        )}
      </div>
    </main>
  );
}
