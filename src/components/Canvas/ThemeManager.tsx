'use client';

import {useMemo,useRef,useState} from 'react';
import {useCanvasStore} from '@/lib/store';
import {THEME_TOKENS,type CustomTheme,type ThemeId} from '@/lib/types';

type Draft={id:ThemeId|null;name:string;base:'light'|'dark';colors:string};
type Portable={name:string;base:'light'|'dark';colors:Record<string,string>};

function validateTheme(value:unknown,requireBase:boolean):{theme:Portable|null;error:string}{
 if(!value||typeof value!=='object'||Array.isArray(value))return {theme:null,error:'Theme JSON must be an object.'};
 const data=value as Record<string,unknown>,name=data.name,base=data.base,colors=data.colors;
 if(typeof name!=='string'||!name.trim())return {theme:null,error:'Theme name is required.'};
 if(requireBase&&(base!=='light'&&base!=='dark'))return {theme:null,error:'Base must be "light" or "dark".'};
 if(!colors||typeof colors!=='object'||Array.isArray(colors))return {theme:null,error:'Colors must be an object.'};
 const unknown=Object.keys(colors).filter(key=>!THEME_TOKENS.includes(key));
 if(unknown.length)return {theme:null,error:`Unknown theme token${unknown.length>1?'s':''}: ${unknown.join(', ')}`};
 for(const [key,color] of Object.entries(colors)){if(typeof color!=='string'||!color.trim())return {theme:null,error:`${key} must have a non-empty string value.`};}
 return {theme:{name:name.trim(),base:base as 'light'|'dark',colors:colors as Record<string,string>},error:''};
}

function baseTemplate(base:'light'|'dark'){
 const root=document.documentElement,attribute=root.getAttribute('data-theme'),inline=THEME_TOKENS.map(token=>[token,root.style.getPropertyValue(token)] as const);
 root.setAttribute('data-theme',base);
 THEME_TOKENS.forEach(token=>root.style.removeProperty(token));
 const colors=Object.fromEntries(THEME_TOKENS.map(token=>[token,getComputedStyle(root).getPropertyValue(token).trim()]));
 if(attribute===null)root.removeAttribute('data-theme');else root.setAttribute('data-theme',attribute);
 inline.forEach(([token,value])=>value?root.style.setProperty(token,value):root.style.removeProperty(token));
 return colors;
}

export default function ThemeManager({open,onClose}:{open:boolean;onClose:()=>void}){
 const theme=useCanvasStore(s=>s.theme),customThemes=useCanvasStore(s=>s.customThemes),setTheme=useCanvasStore(s=>s.setTheme),createCustomTheme=useCanvasStore(s=>s.createCustomTheme),updateCustomTheme=useCanvasStore(s=>s.updateCustomTheme),deleteCustomTheme=useCanvasStore(s=>s.deleteCustomTheme);
 const [draft,setDraft]=useState<Draft|null>(null),[error,setError]=useState('');
 const inputRef=useRef<HTMLInputElement>(null);
 const themes=useMemo(()=>Object.values(customThemes).sort((a,b)=>a.createdAt-b.createdAt),[customThemes]);
 const stop=(event:React.MouseEvent|React.PointerEvent)=>event.stopPropagation();
 const close=()=>{setDraft(null);setError('');onClose()};
 const openEditor=(item?:CustomTheme)=>{setError('');setDraft(item?{id:item.id,name:item.name,base:item.base,colors:JSON.stringify(item.colors,null,2)}:{id:null,name:'',base:'light',colors:'{}'});};
 const save=()=>{if(!draft)return;let colors:unknown;try{colors=JSON.parse(draft.colors)}catch{setError('Colors must be valid JSON.');return;}const check=validateTheme({name:draft.name,base:draft.base,colors},true);if(!check.theme){setError(check.error);return;}const id=draft.id||createCustomTheme(check.theme.name,check.theme.base,check.theme.colors);if(draft.id)updateCustomTheme(draft.id,check.theme);setTheme(id);setDraft(null);setError('');};
 const exportTheme=(item:CustomTheme)=>{const file=new Blob([JSON.stringify({name:item.name,base:item.base,colors:item.colors},null,2)],{type:'application/json'}),url=URL.createObjectURL(file),anchor=document.createElement('a');anchor.href=url;anchor.download=`${item.name.trim().replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'')||'theme'}.theme.json`;anchor.click();URL.revokeObjectURL(url);};
 const importFile=async(event:React.ChangeEvent<HTMLInputElement>)=>{const file=event.target.files?.[0];event.target.value='';if(!file)return;try{const check=validateTheme(JSON.parse(await file.text()),true);if(!check.theme){setError(check.error);return;}const id=createCustomTheme(check.theme.name,check.theme.base,check.theme.colors);setTheme(id);setError('');}catch{setError('Import failed: choose a valid theme JSON file.');}};
 if(!open)return null;
 return <div className="theme-manager-overlay" role="dialog" aria-modal="true" aria-labelledby="theme-manager-title" onClick={event=>{stop(event);if(event.target===event.currentTarget)close()}} onPointerDown={stop}>
  <div className="theme-manager-modal" onClick={stop} onPointerDown={stop}>
   <div className="theme-manager-header"><h2 id="theme-manager-title">Themes</h2><button type="button" className="theme-manager-close" aria-label="Close themes" onClick={event=>{stop(event);close()}} onPointerDown={stop}>×</button></div>
   {draft?<section className="theme-manager-editor"><h3>{draft.id?'Edit theme':'New theme'}</h3><label>Name<input value={draft.name} onChange={event=>setDraft({...draft,name:event.target.value})} onPointerDown={stop}/></label><label>Base<select value={draft.base} onChange={event=>setDraft({...draft,base:event.target.value as 'light'|'dark'})} onPointerDown={stop}><option value="light">Light</option><option value="dark">Dark</option></select></label><div className="theme-manager-editor-head"><label>Colors JSON</label><button type="button" className="btn btn-ghost" onClick={event=>{stop(event);setDraft({...draft,colors:JSON.stringify(baseTemplate(draft.base),null,2)});setError('')}} onPointerDown={stop}>Load base template</button></div><textarea value={draft.colors} onChange={event=>setDraft({...draft,colors:event.target.value})} onPointerDown={stop} spellCheck={false}/>{error&&<p className="theme-manager-error" role="alert">{error}</p>}<div className="theme-manager-actions"><button type="button" className="btn btn-ghost" onClick={event=>{stop(event);setDraft(null);setError('')}} onPointerDown={stop}>Cancel</button><button type="button" className="btn btn-primary" onClick={event=>{stop(event);save()}} onPointerDown={stop}>Save theme</button></div></section>:<>
    <section className="theme-manager-section"><h3>Built-in</h3>{(['light','dark'] as const).map(id=><div className="theme-manager-row" key={id}><span>{id==='light'?'Light':'Dark'}</span><button type="button" className={`btn ${theme===id?'btn-primary':'btn-ghost'}`} onClick={event=>{stop(event);setTheme(id)}} onPointerDown={stop}>{theme===id?'Active':'Apply'}</button></div>)}</section>
    <section className="theme-manager-section"><div className="theme-manager-section-head"><h3>Custom</h3><button type="button" className="btn btn-primary" onClick={event=>{stop(event);openEditor()}} onPointerDown={stop}>New theme</button></div>{themes.length?themes.map(item=><div className="theme-manager-row theme-manager-custom-row" key={item.id}><div><strong>{item.name}</strong><span className="theme-manager-badge">{item.base}</span></div><div className="theme-manager-actions"><button type="button" className="btn btn-ghost" onClick={event=>{stop(event);setTheme(item.id)}} onPointerDown={stop}>Apply</button><button type="button" className="btn btn-ghost" onClick={event=>{stop(event);openEditor(item)}} onPointerDown={stop}>Edit</button><button type="button" className="btn btn-ghost" onClick={event=>{stop(event);exportTheme(item)}} onPointerDown={stop}>Export JSON</button><button type="button" className="btn btn-ghost" onClick={event=>{stop(event);if(confirm(`Delete theme “${item.name}”?`))deleteCustomTheme(item.id)}} onPointerDown={stop}>Delete</button></div></div>):<p className="theme-manager-empty">No custom themes yet.</p>}<input ref={inputRef} className="theme-manager-file" type="file" accept="application/json,.json,.theme.json" onChange={importFile}/><button type="button" className="btn btn-ghost theme-manager-import" onClick={event=>{stop(event);inputRef.current?.click()}} onPointerDown={stop}>Import JSON</button>{error&&<p className="theme-manager-error" role="alert">{error}</p>}</section>
   </>}
  </div>
 </div>;
}
