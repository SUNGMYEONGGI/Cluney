import styles from "./SplitLayout.module.css";

type SplitLayoutProps = {
  left: React.ReactNode;
  right: React.ReactNode;
};

export function SplitLayout({ left, right }: SplitLayoutProps) {
  return (
    <div className={styles.root}>
      <div className={styles.pane}>{left}</div>
      <div className={styles.pane}>{right}</div>
    </div>
  );
}

