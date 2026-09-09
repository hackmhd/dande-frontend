interface ProgressGaugeProps {
  currentDay: number;
  totalDays: number;
}

export function ProgressGauge({ currentDay, totalDays }: ProgressGaugeProps) {
  const pct = Math.min(100, Math.round((currentDay / totalDays) * 100));
  const daysLeft = Math.max(0, totalDays - currentDay);

  return (
    <div className="surface p-4">
      <div className="mb-2.5 flex items-center justify-between">
        <p className="text-sm font-medium t-title">Verrou en cours</p>
        <span className="text-sm t-soft">
          Jour {currentDay} / {totalDays}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-sand-100 dark:bg-night-700">
        <div
          className="h-full rounded-full bg-clay-600 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-2.5 text-xs t-soft">
        {daysLeft > 0
          ? `Déblocage dans ${daysLeft} jours. Retrait impossible avant.`
          : 'Verrou levé. Vous pouvez retirer votre épargne.'}
      </p>
    </div>
  );
}
