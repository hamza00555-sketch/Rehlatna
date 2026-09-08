import styles from "./loading.module.css";

/** Instant shell while a destination renders on the server: keeps the page from feeling frozen. */
export default function AppLoading() {
  return (
    <div className={styles.page} aria-busy="true" aria-live="polite">
      <div className={styles.hero} />
      <div className={styles.card} />
      <div className={styles.grid}>
        <div className={styles.tile} />
        <div className={styles.tile} />
      </div>
      <div className={styles.row} />
      <div className={styles.row} />
    </div>
  );
}
