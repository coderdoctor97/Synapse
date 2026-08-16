import {THEME_TOKENS,type CustomTheme,type ThemeId} from './types';

export function clearThemeOverrides(){
 if(typeof document==='undefined')return;
 for(const token of THEME_TOKENS)document.documentElement.style.removeProperty(token);
}

export function applyTheme(themeId:ThemeId,customThemes:Record<ThemeId,CustomTheme>){
 if(typeof document==='undefined')return;
 clearThemeOverrides();
 if(themeId==='light'||themeId==='dark'){
  document.documentElement.setAttribute('data-theme',themeId);
  return;
 }
 const theme=customThemes[themeId];
 if(!theme){
  document.documentElement.setAttribute('data-theme','light');
  return;
 }
 document.documentElement.setAttribute('data-theme',theme.base);
 for(const token of THEME_TOKENS){
  const value=theme.colors[token];
  if(typeof value==='string'&&value.trim())document.documentElement.style.setProperty(token,value);
 }
}
