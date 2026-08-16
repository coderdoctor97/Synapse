import Canvas from '@/components/Canvas/Canvas';
export default function CanvasPage({params}:{params:{id:string}}) { return <Canvas canvasId={params.id} />; }
