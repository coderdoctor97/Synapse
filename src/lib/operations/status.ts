import type { Node } from '../types';
export function statusSummary(nodes:Node[]){return nodes.reduce((s,n)=>{if(n.status!=='none')s[n.status]++;return s},{failed:0,review:0,mastered:0});}
