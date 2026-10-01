import { BottomNav } from '@/components/BottomNav';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="pb-[calc(5rem+env(safe-area-inset-bottom))]">
      {children}
      <BottomNav />
    </div>
  );
}
