import type { Node, Position } from '../types';
export const makeNode=(id:string,content:string,parentId:string|null,position:Position):Node=>({id,content,parentId,position,status:'none',isCollapsed:false,createdAt:Date.now(),updatedAt:Date.now()});
