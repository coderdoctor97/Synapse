'use client';
import Sidebar from '@/components/Sidebar/Sidebar';
import { useCanvasStore } from '@/lib/store';

export default function CanvasLayout({ children }: { children: React.ReactNode }) {
  const focusMode = useCanvasStore(s => s.focusMode);
  return (
    <div className={`canvas-layout${focusMode ? ' focus-mode' : ''}`}>
      <Sidebar />
      <div className="canvas-main">{children}</div>
    </div>
  );
}