import { redirect } from "next/navigation";
import { getContext } from "@/server/session";
import { Button } from "@/components/ui/Button";
import { DateText } from "@/components/ui/Num";
import { m } from "@/i18n";
import styles from "./confirmed.module.css";

export const metadata = { title: "وصل صغيركم" };

/** StoryHero (birth): one restrained statement, the date, one action. Production family imagery pending. */
export default async function BirthConfirmedPage() {
  const ctx = await getContext();
  if (!ctx?.data.baby?.birthDate) redirect("/journey");
  const name = ctx.data.baby.displayName;
  return (
    <section className={styles.story}>
      <div className={styles.copy}>
        <h1 className={styles.title}>{name ? m.journey.welcomeName(name) : m.journey.welcomeNeutral}</h1>
        <p className={styles.sub}>{m.journey.newChapter}</p>
        <span className={styles.rule} aria-hidden="true" />
        <p className={styles.date}>
          <DateText iso={ctx.data.baby.birthDate} style="long" />
        </p>
      </div>
      <Button href="/today" variant="lightOverMedia" fullWidth>
        {m.journey.continueTogether}
      </Button>
    </section>
  );
}
