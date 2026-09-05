import { redirect } from "next/navigation";
import { getContext } from "@/server/session";
import { can } from "@/domain/permissions";
import { serializeFinanceOverview } from "@/server/serializers";
import { TopBar } from "@/components/ui/TopBar";
import { Card } from "@/components/ui/Card";
import { PrivacyNotice } from "@/components/ui/PrivacyNotice";
import { TaskRow, RowGroup } from "@/components/ui/TaskRow";
import { DateText } from "@/components/ui/Num";
import { Icon } from "@/components/icons/Icon";
import { TravelPlanEditor } from "@/components/more/TravelPlanEditor";
import { m } from "@/i18n";
import styles from "../more.module.css";

export const metadata = { title: "خطة السفر" };

/** Cross-city plan: follow-up city → delivery city. Money lives in finance, for planners only. */
export default async function TravelPage() {
  const ctx = await getContext();
  if (!ctx || !ctx.data.pregnancy) redirect("/onboarding");
  const p = ctx.data.pregnancy;
  const plan = ctx.data.travelPlans[0] ?? null;
  const canEdit = can(ctx.viewer, "care:edit");
  const sameCity = p.followUpCity.trim() === p.deliveryCity.trim();
  const finance = serializeFinanceOverview(ctx.data, ctx.viewer, ctx.today);

  return (
    <div className="page">
      <TopBar title={m.travel.toCity(plan?.toCity ?? p.deliveryCity)} subtitle={m.travel.route(plan?.fromCity ?? p.followUpCity, plan?.toCity ?? p.deliveryCity)} backHref="/more" />
      <div className={styles.body}>
        {sameCity && !plan && <PrivacyNotice variant="general">{m.travel.sameCityNote}</PrivacyNotice>}
        {plan?.plannedDate && (
          <div className={styles.facts}>
            <Card tone="tint" padding="md" className={styles.fact}>
              <span className={styles.factLabel}>{m.travel.plannedDate}</span>
              <span className={styles.factValue}>
                <DateText iso={plan.plannedDate} style="long" />
              </span>
            </Card>
            <Card tone="tint" padding="md" className={styles.fact}>
              <span className={styles.factLabel}>{m.travel.returnDate}</span>
              <span className={styles.factValue}>{plan.returnDate ? <DateText iso={plan.returnDate} style="long" /> : m.common.unknownDate}</span>
            </Card>
          </div>
        )}
        <TravelPlanEditor plan={plan} fromCity={p.followUpCity} toCity={p.deliveryCity} canEdit={canEdit} />
        {finance && (
          <RowGroup>
            <TaskRow title={m.travel.financeLink} meta={m.travel.financeLinkHelp} href="/finance" leading={<Icon name="lock" size={20} />} />
          </RowGroup>
        )}
      </div>
    </div>
  );
}
