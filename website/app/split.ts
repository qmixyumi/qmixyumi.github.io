import type {Expense,Trip,Split} from './model';
import {amount} from './model';
export const PEOPLE=['QMI','YUMI'];
/** Fraction of an expense that a person carries, by equal split, fixed amounts or percentages. */
export function shareOf(e:Expense,p:string){if(!e.people.includes(p))return 0;const s=e.split;if(s?.mode==='amount')return e.amount>0?(s.shares[p]||0)/e.amount:0;if(s?.mode==='percent')return (s.shares[p]||0)/100;return 1/e.people.length}
/** Positive = should get money back. Repayments move money from the debtor to the creditor. */
export function balances(trip:Trip){const b:Record<string,number>=Object.fromEntries(PEOPLE.map(p=>[p,0]));
 for(const e of trip.expenses.filter(x=>!x.deletedAt&&x.status!=='未付')){const v=(e.status==='退款'?-1:1)*e.amount*e.rate;for(const p of PEOPLE)b[p]+=v*((e.payer===p?1:0)-shareOf(e,p))}
 for(const s of (trip.settlements||[]).filter(x=>!x.deletedAt)){b[s.from]+=s.amount;b[s.to]-=s.amount}
 return b}
export function splitText(e:Expense){const s=e.split;if(!s||s.mode==='equal')return e.people.join(' + ');return e.people.map(p=>`${p} ${s.mode==='amount'?e.currency+' '+amount(s.shares[p]||0):(s.shares[p]||0)+'%'}`).join(' · ')}
/** Reads and checks the split from the form; returns an error message instead when the numbers do not add up. */
export function readSplit(f:FormData,people:string[],total:number):Split|string|undefined{const mode=String(f.get('split-mode')||'equal') as Split['mode'];if(mode==='equal')return undefined;
 const shares=Object.fromEntries(people.map(p=>[p,Number(f.get('share-'+p)||0)]));if(Object.values(shares).some(n=>!Number.isFinite(n)||n<0))return '分攤數字唔可以係負數';
 const sum=Object.values(shares).reduce((a,b)=>a+b,0);
 if(mode==='amount'&&Math.abs(sum-total)>0.01)return `指定金額加埋係 ${amount(sum)}，要等於全單總額 ${amount(total)}`;
 if(mode==='percent'&&Math.abs(sum-100)>0.01)return `百分比加埋係 ${amount(sum)}%，要等於 100%`;
 return {mode,shares}}
