'use client';

interface StreakRowProps {
  filledDays: number;
  totalDays?: number;
  onDeposit?: () => void;
}

/**
 * La série de cotisation, affichée comme le cycle complet du verrou.
 * Chaque cercle plein = un paiement enregistré. Le cercle suivant, en
 * pointillés, invite à déposer. Disposé en grille pour rester lisible
 * sur mobile même avec 30 cercles.
 */
export function StreakRow({ filledDays, totalDays = 30, onDeposit }: StreakRowProps) {
  const done = Math.min(filledDays, totalDays);

  return (
    <div className="surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-medium t-title">Ma série</p>
        <span className="rounded-md bg-clay-50 px-2.5 py-0.5 text-xs font-medium text-clay-600 dark:bg-clay-600/15 dark:text-clay-100">
          {done} / {totalDays} jours
        </span>
      </div>

      <div className="grid grid-cols-10 gap-1.5">
        {Array.from({ length: totalDays }).map((_, i) => {
          const isFilled = i < done;
          const isNext = i === done;
          return (
            <button
              key={i}
              disabled={!isNext}
              onClick={isNext ? onDeposit : undefined}
              aria-label={isFilled ? `Jour ${i + 1} cotisé` : isNext ? 'Cotiser' : `Jour ${i + 1} à venir`}
              className={`flex aspect-square items-center justify-center rounded-full text-[10px] transition-all duration-200 ${
                isFilled
                  ? 'bg-forest-600 text-white'
                  : isNext
                    ? 'border border-dashed border-clay-400 bg-clay-50 text-clay-600 hover:scale-110 active:scale-95 dark:bg-clay-600/15 dark:text-clay-100'
                    : 'border border-dashed border-sand-200 bg-sand-50 text-ink-faint dark:border-night-600 dark:bg-night-900 dark:text-iris-100/30'
              }`}
            >
              {isFilled ? '\u2713' : i + 1}
            </button>
          );
        })}
      </div>

      <p className="mt-3 text-xs t-soft">
        {done === 0
          ? 'Aucune cotisation pour le moment. Touchez un cercle pour déposer.'
          : done >= totalDays
            ? 'Cycle complet ! Bravo.'
            : `${done} cotisation${done > 1 ? 's' : ''} enregistrée${done > 1 ? 's' : ''}.`}
      </p>
    </div>
  );
}
