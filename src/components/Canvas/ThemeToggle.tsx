'use client';

import {useEffect} from 'react';
import {loadUISettings} from '@/lib/persistence';
import {useCanvasStore} from '@/lib/store';

export default function ThemeToggle(){
 const theme=useCanvasStore(s=>s.theme),setTheme=useCanvasStore(s=>s.setTheme);
 useEffect(()=>{const savedTheme=loadUISettings().theme;if(savedTheme!==theme)setTheme(savedTheme)},[setTheme,theme]);
 const isDark=theme==='dark',nextTheme=isDark?'light':'dark',label=isDark?'Switch to light theme':'Switch to dark theme';
 const stop=(e:React.PointerEvent|React.MouseEvent)=>e.stopPropagation();
 return <button className="zb-btn theme-toggle" type="button" aria-label={label} title={label} onPointerDown={stop} onClick={e=>{stop(e);setTheme(nextTheme)}}>{isDark?<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>:<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 14.1A8.5 8.5 0 1 1 9.9 3.5 6.6 6.6 0 0 0 20.5 14.1Z"/></svg>}</button>;
}
