import type {Expense,Trip,Split} from './model';
import {amount} from './model';
export const PEOPLE=['QMI','YUMI'];
/** Same as tripPeople in model.ts (kept here so this file loads on its own in the checks). */
const tripPeople=(t:Pick<Trip,'people'>)=>t.people&&t.people.length?t.people:PEOPLE;
/** Fraction of an expense that a person carries, by equal split, fixed amounts or percentages. */
export function shareOf(e:Expense,p:string){if(!e.people.includes(p))return 0;const s=e.split;if(s?.mode==='amount')return e.amount>0?(s.shares[p]||0)/e.amount:0;if(s?.mode==='percent')return (s.shares[p]||0)/100;return 1/e.people.length}
/** Positive = should get money back. Repayments move money from the debtor to the creditor. */
export function balances(trip:Trip){const b:Record<string,number>=Object.fromEntries(tripPeople(trip).map(p=>[p,0]));
 for(const e of trip.expenses.filter(x=>!x.deletedAt&&x.status!=='未付')){const v=(e.status==='退款'?-1:1)*e.amount*e.rate;for(const p of Object.keys(b))b[p]+=v*((e.payer===p?1:0)-shareOf(e,p))}
 for(const s of (trip.settlements||[]).filter(x=>!x.deletedAt)){b[s.from]=(b[s.from]||0)+s.amount;b[s.to]=(b[s.to]||0)-s.amount}
 return b}
export function splitText(e:Expense){const s=e.split;if(!s||s.mode==='equal')return e.people.join(' + ');return e.people.map(p=>`${p} ${s.mode==='amount'?e.currency+' '+amount(s.shares[p]||0):(s.shares[p]||0)+'%'}`).join(' · ')}
/** Reads and checks the split from the form; returns an error message instead when the numbers do not add up. */
export function readSplit(f:FormData,people:string[],total:number):Split|string|undefined{const mode=String(f.get('split-mode')||'equal') as Split['mode'];if(mode==='equal')return undefined;
 const shares=Object.fromEntries(people.map(p=>[p,Number(f.get('share-'+p)||0)]));if(Object.values(shares).some(n=>!Number.isFinite(n)||n<0))return '分攤數字唔可以係負數';
 const sum=Object.values(shares).reduce((a,b)=>a+b,0);
 if(mode==='amount'&&Math.abs(sum-total)>0.01)return `指定金額加埋係 ${amount(sum)}，要等於全單總額 ${amount(total)}`;
 if(mode==='percent'&&Math.abs(sum-100)>0.01)return `百分比加埋係 ${amount(sum)}%，要等於 100%`;
 return {mode,shares}}

const live=(trip:Trip)=>trip.expenses.filter(x=>!x.deletedAt&&x.status!=='未付')
/** What everyone paid, what their share of the spending is, and the plain average per head (all in HKD). */
export function perPerson(trip:Trip){const who=tripPeople(trip),paid:Record<string,number>=Object.fromEntries(who.map(p=>[p,0])),share:Record<string,number>=Object.fromEntries(who.map(p=>[p,0]));let total=0;for(const e of live(trip)){const v=(e.status==='退款'?-1:1)*e.amount*e.rate;total+=v;if(e.payer in paid)paid[e.payer]+=v;for(const p of who)share[p]+=v*shareOf(e,p)}return {who,paid,share,total,average:who.length?total/who.length:0}}
/** The fewest payments that settle everyone: the biggest debtor pays the biggest creditor, and so on. */
export function transfers(b:Record<string,number>){const d=Object.entries(b).filter(([,v])=>v<-0.005).map(([p,v])=>({p,v:-v})).sort((x,y)=>y.v-x.v),c=Object.entries(b).filter(([,v])=>v>0.005).map(([p,v])=>({p,v})).sort((x,y)=>y.v-x.v),out:{from:string;to:string;amount:number}[]=[];let i=0,j=0;while(i<d.length&&j<c.length){const n=Math.min(d[i].v,c[j].v);if(n>0.005)out.push({from:d[i].p,to:c[j].p,amount:Math.round(n*100)/100});d[i].v-=n;c[j].v-=n;if(d[i].v<=0.005)i++;if(c[j].v<=0.005)j++}return out}
