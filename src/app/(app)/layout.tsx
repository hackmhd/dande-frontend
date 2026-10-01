import { BottomNav } from '@/components/BottomNav';
import { LockGate } from '@/components/LockGate';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LockGate>
      <div className="pb-[calc(5rem+env(safe-area-inset-bottom))]">
        {children}
        <BottomNav />
      </div>
    </LockGate>
  );
}
