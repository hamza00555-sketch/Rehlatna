import { redirect } from "next/navigation";
import { getContext } from "@/server/session";
import { can } from "@/domain/permissions";
import { pregnancyProgress, postpartumAge } from "@/domain/pregnancy";
import { weeklyMedia } from "@/media/weekly";
import { TopBar } from "@/components/ui/TopBar";
import { Card } from "@/components/ui/Card";
import { MediaFrame } from "@/components/ui/MediaFrame";
import { TaskRow, RowGroup } from "@/components/ui/TaskRow";
import { PrivacyNotice } from "@/components/ui/PrivacyNotice";
import { DateText, Num, TimeText } from "@/components/ui/Num";
import { Icon } from "@/components/icons/Icon";
import { PregnancyDatingEditor } from "@/components/more/PregnancyEditors";
import { m, days } from "@/i18n";
import styles from "../more.module.css";

export const metadata = { title: "الصغير" };

export default async function BabyProfilePage() {
  const ctx = await getContext();
  if (!ctx || !ctx.data.pregnancy || !ctx.data.baby) redirect("/onboarding");
  const { pregnancy, baby } = ctx.data;
  const canEdit = can(ctx.viewer, "journey:edit");
  const born = Boolean(baby.birthDate);
  const progress = pregnancyProgress(pregnancy.dueDate, ctx.today);
  const media = weeklyMedia(progress.mediaWeek);
  const age = baby.birthDate ? postpartumAge(baby.birthDate, ctx.today) : null;
  const genderLabel = baby.gender === "boy" ? m.gender.boy : baby.gender === "girl" ? m.gender.girl : baby.gender === "undisclosed" ? m.gender.undisclosed : m.gender.unknown;

  return (
    <div className="page">
      <TopBar title={m.baby.nameOf(baby.displayName)} subtitle={m.family.babyProfile} backHref="/more" />
      <div className={styles.body}>
        <div className={styles.hero}>
          {born ? (
            <MediaFrame alt={m.postpartum.neutralFallbackAlt} ratio="card" radius="hero" placeholderLabel={m.family.photoUnsupported} />
          ) : (
            <MediaFrame src={media.posterWebp} alt={media.alt} focalPoint={media.focalPoint} ratio="card" radius="hero" placeholderLabel={m.today.mediaPlaceholder} />
          )}
          <div className={styles.facts}>
            {born && baby.birthDate ? (
              <>
                <Card tone="rose" padding="md" className={styles.fact}>
                  <span className={styles.factLabel}>{m.family.babyBirth}</span>
                  <span className={styles.factValue}>
                    <DateText iso={baby.birthDate} style="long" />
                  </span>
                  {baby.birthTime && (
                    <span className={styles.factLabel}>
                      <TimeText value={baby.birthTime} />
                    </span>
                  )}
                </Card>
                <Card tone="tint" padding="md" className={styles.fact}>
                  <span className={styles.factLabel}>{m.baby.ageLabel}</span>
                  <span className={styles.factValue}>{days(age!.days)}</span>
                </Card>
              </>
            ) : (
              <>
                <Card tone="rose" padding="md" className={styles.fact}>
                  <span className={styles.factLabel}>{m.family.babyWeek}</span>
                  <span className={styles.factValue}>
                    {m.today.weekLabel} <Num value={progress.week} />
                  </span>
                </Card>
                <Card tone="tint" padding="md" className={styles.fact}>
                  <span className={styles.factLabel}>{m.family.dueDate}</span>
                  <span className={styles.factValue}>
                    <DateText iso={pregnancy.dueDate} style="long" />
                  </span>
                </Card>
              </>
            )}
          </div>
        </div>

        {!born && canEdit && (
          <PregnancyDatingEditor dueDate={pregnancy.dueDate} datingMethod={pregnancy.datingMethod} lastPeriodStartDate={pregnancy.lastPeriodStartDate} today={ctx.today} canEdit={canEdit} />
        )}

        <RowGroup>
          <TaskRow title={m.family.babyName} meta={baby.displayName ?? m.name.keepNeutral} href={canEdit ? "/journey/name" : undefined} leading={<Icon name="edit" size={20} />} />
          <TaskRow title={m.family.babyGender} meta={genderLabel} href={canEdit ? "/journey/gender" : undefined} leading={<Icon name="sprout" size={20} />} />
          {!born && canEdit && <TaskRow title={m.journey.birthEvent} meta={m.family.arrivalHelp} href="/journey/birth" leading={<Icon name="heart" size={20} />} />}
        </RowGroup>

        {born && <PrivacyNotice variant="general">{m.family.photoUnsupported}</PrivacyNotice>}
      </div>
    </div>
  );
}
