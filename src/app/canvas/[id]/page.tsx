'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Canvas from '@/components/Canvas/Canvas';
import { useCanvasStore } from '@/lib/store';

export default function CanvasPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const openPage = useCanvasStore(s => s.openPage);
  const index = useCanvasStore(s => s.index);
  const router = useRouter();

  useEffect(() => {
    openPage(id);
  }, [id, openPage]);

  useEffect(() => {
    if (!index) return;
    if (id !== 'default' && !index.pages[id]) {
      router.replace('/canvas/default');
    }
  }, [id, index, router]);

  return <Canvas canvasId={id} />;
}
