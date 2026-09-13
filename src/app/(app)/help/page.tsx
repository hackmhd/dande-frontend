'use client';

import { useRouter } from 'next/navigation';

// Vos coordonnées WhatsApp. Le format international pour le lien : Burkina = 226.
const WHATSAPP_NUMBERS = [
  { display: '63 91 37 32', intl: '22663913732' },
  { display: '06 58 80 81', intl: '22606588081' },
];

interface Step {
  n: number;
  title: string;
  text: string;
}

const STEPS: Step[] = [
  { n: 1, title: 'Créez votre compte', text: 'Inscrivez-vous avec votre nom, votre numéro, votre e-mail et le code de votre agent.' },
  { n: 2, title: 'Rejoignez une tontine', text: 'Dans « Défis », choisissez la tontine qui vous convient et rejoignez-la.' },
  { n: 3, title: 'Épargnez chaque jour', text: 'Faites une demande de dépôt depuis « Déposer ». Votre agent la confirme et votre solde augmente.' },
  { n: 4, title: 'Suivez votre progression', text: 'Votre série de cotisations et votre solde se mettent à jour à chaque paiement.' },
];

const BENEFITS: string[] = [
  'Épargnez à votre rythme, un peu chaque jour.',
  'Suivez votre solde et votre historique à tout moment.',
  'Un agent de confiance accompagne votre épargne.',
  'Vos versements sont enregistrés et traçables.',
  'Fixez-vous des objectifs avec les tontines (Tabaski, rentrée…).',
];

export default function HelpPage() {
  const router = useRouter();

  return (
    <main className="flex min-h-screen flex-col px-4 py-5">
      <header className="mb-5 flex items-center gap-2.5">
        <button onClick={() => router.back()} className="t-soft transition-colors hover:text-ink dark:hover:text-white">←</button>
        <h1 className="text-lg font-semibold t-title">Aide et support</h1>
      </header>

      {/* Présentation */}
      <div className="surface mb-5 p-5">
        <h2 className="text-base font-semibold text-forest-700 dark:text-forest-400">Bienvenue sur Dande</h2>
        <p className="mt-2 text-sm t-soft">
          Dande vous aide à épargner régulièrement, un peu chaque jour, pour atteindre
          vos objectifs. Votre agent vous accompagne et enregistre vos versements en
          toute confiance.
        </p>
      </div>

      {/* Comment ça marche */}
      <p className="mb-2 px-1 text-xs font-medium uppercase tracking-wide t-faint">Comment ça marche</p>
      <div className="mb-5 flex flex-col gap-2.5">
        {STEPS.map((s) => (
          <div key={s.n} className="surface flex items-start gap-3 p-4">
            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-forest-600 text-sm font-semibold text-white">
              {s.n}
            </div>
            <div>
              <p className="text-sm font-medium t-title">{s.title}</p>
              <p className="mt-0.5 text-xs t-soft">{s.text}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Avantages */}
      <p className="mb-2 px-1 text-xs font-medium uppercase tracking-wide t-faint">Les avantages</p>
      <div className="surface mb-5 p-4">
        <ul className="flex flex-col gap-2.5">
          {BENEFITS.map((b, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm t-title">
              <span className="mt-0.5 text-forest-600 dark:text-forest-400">✓</span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Contact WhatsApp */}
      <p className="mb-2 px-1 text-xs font-medium uppercase tracking-wide t-faint">Besoin d'aide ?</p>
      <div className="surface p-5">
        <p className="text-sm t-soft">
          Une question ? Un problème ? Contactez-nous directement sur WhatsApp, nous
          vous répondrons rapidement.
        </p>
        <div className="mt-4 flex flex-col gap-2.5">
          {WHATSAPP_NUMBERS.map((w) => (
            <a
              key={w.intl}
              href={`https://wa.me/${w.intl}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-xl bg-forest-600 px-4 py-3 text-white transition-all duration-200 hover:bg-forest-700 active:scale-[0.98]"
            >
              <span className="flex items-center gap-2.5">
                <svg width={20} height={20} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 2a10 10 0 0 0-8.6 15l-1.3 4.8 4.9-1.3A10 10 0 1 0 12 2Zm5.8 14.2c-.2.7-1.4 1.3-2 1.4-.5.1-1.2.1-1.9-.1-.4-.1-1-.3-1.7-.6-3-1.3-4.9-4.3-5.1-4.5-.1-.2-1.2-1.5-1.2-2.9s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 1.9c.1.2.1.4 0 .5l-.3.5-.4.4c-.1.1-.3.3-.1.5.1.3.6 1 1.3 1.6.9.8 1.6 1 1.9 1.2.2.1.4.1.5-.1l.6-.8c.2-.2.4-.2.6-.1l1.8.9c.2.1.4.2.5.3.1.2.1.7-.1 1.3Z" />
                </svg>
                <span className="text-sm font-medium">WhatsApp</span>
              </span>
              <span className="text-sm font-semibold tracking-wide">{w.display}</span>
            </a>
          ))}
        </div>
      </div>

      <p className="mt-5 text-center text-xs t-faint">Dande — Épargnez chaque jour, atteignez vos objectifs.</p>
    </main>
  );
}
