'use client';
import Sidebar from '@/components/Sidebar/Sidebar';

export default function CanvasLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="canvas-layout">
      <Sidebar />
      <div className="canvas-main">{children}</div>
    </div>
  );
}
