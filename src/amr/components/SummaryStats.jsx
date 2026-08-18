import React from "react";
import { Database, ShieldAlert, HeartPulse, Ban, HelpCircle } from "lucide-react";

const TONES = {
  brand: "bg-brand/12 text-brand",
  danger: "bg-danger/12 text-danger",
  warn: "bg-amber/18 text-warn",
  violet: "bg-violet/12 text-violet",
  success: "bg-success/12 text-success",
};

export default function SummaryStats({ records }) {
  const total = records.length;
  const discordant = records.filter((r) => r.concordance.startsWith("Discordant")).length;
  const concordantFail = records.filter((r) => r.concordance.startsWith("Concordant but")).length;
  const noOrganism = records.filter((r) => r.organism_code === "NOGROW").length;
  const unmapped = records.filter(
    (r) => r.organism_code === "UNMAPPED" || r.antimicrobial_class === "Unknown"
  ).length;

  const stats = [
    { label: "Records analyzed", value: total, tone: "brand", icon: Database },
    { label: "Discordant therapy", value: discordant, tone: discordant > 0 ? "danger" : "success", icon: ShieldAlert },
    { label: "Failure despite susceptible", value: concordantFail, tone: concordantFail > 0 ? "warn" : "success", icon: HeartPulse },
    { label: "No organism isolated", value: noOrganism, tone: "violet", icon: Ban },
    { label: "Unmapped terms", value: unmapped, tone: unmapped > 0 ? "warn" : "success", icon: HelpCircle },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      {stats.map((s) => (
        <div key={s.label} className="surface-card lift-hover p-4">
          <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${TONES[s.tone]}`}>
            <s.icon size={15} />
          </span>
          <p className="mt-3 text-2xl font-semibold tracking-tight text-ink">{s.value}</p>
          <p className="mt-1 text-xs leading-snug text-ink/55">{s.label}</p>
        </div>
      ))}
    </div>
  );
}
