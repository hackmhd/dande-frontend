import { formatFcfa } from '@/lib/api';

interface BalanceCardProps {
  balanceFcfa: number;
  depositCount: number;
  dailyAmountFcfa: number;
}

export function BalanceCard({
  balanceFcfa,
  depositCount,
  dailyAmountFcfa,
}: BalanceCardProps) {
  return (
    <div className="relative overflow-hidden rounded-card bg-forest-600 p-5 text-white dark:bg-night-900 dark:ring-1 dark:ring-iris-700/40">
      <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/5 blur-2xl dark:bg-iris-500/20" />
      <div className="relative">
        <p className="mb-1 text-sm text-forest-100 dark:text-iris-100/70">
          Épargne totale
        </p>
        <p className="text-3xl font-semibold tracking-tight">
          {formatFcfa(balanceFcfa)}
        </p>
        <p className="mt-2 text-xs text-forest-100 dark:text-iris-100/50">
          {depositCount} versements · {formatFcfa(dailyAmountFcfa)} / jour
        </p>
      </div>
    </div>
  );
}
