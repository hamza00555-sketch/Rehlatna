import { todayIso } from "@/domain/dates";
import { OnboardingFlow } from "./OnboardingFlow";

export const metadata = { title: "البداية" };

export default function OnboardingStartPage() {
  return <OnboardingFlow today={todayIso()} />;
}
