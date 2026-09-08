import { Button } from "@/components/ui/Button";
import { m } from "@/i18n";
import styles from "./onboarding.module.css";
import { DemoEntry } from "./DemoEntry";
import { DEV_MEDIA } from "@/media/dev";
import { getAuthUser, supabaseConfigured } from "@/server/supabase";

/**
 * Welcome — OnboardingHero. Full-bleed premium baby imagery is a production
 * asset that is not yet attached (see docs/asset-backlog.md); until then the
 * approved loading gradient carries the scene.
 */
export default async function OnboardingWelcome() {
  // Signed in already → straight to household setup; otherwise the sign-in gate (Supabase only).
  const startHref = supabaseConfigured() && !(await getAuthUser()) ? "/auth" : "/onboarding/start";
  return (
    <section className={styles.hero} style={DEV_MEDIA.storyWelcome ? { backgroundImage: `url(${DEV_MEDIA.storyWelcome})` } : undefined}>
      <div className={styles.copy}>
        <h1 className={styles.title}>{m.onboarding.welcomeTitle}</h1>
        <p className={styles.subtitle}>{m.onboarding.welcomeSubtitle}</p>
      </div>
      <div className={styles.actions}>
        <Button href={startHref} variant="lightOverMedia" fullWidth>
          {m.onboarding.start}
        </Button>
        <DemoEntry />
      </div>
    </section>
  );
}
