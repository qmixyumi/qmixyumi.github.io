'use client';
import {useState} from 'react';
import type {Expense,Trip,Split} from './model';
import {amount} from './model';
import {PEOPLE,balances} from './split';
export {PEOPLE,shareOf,balances,splitText,readSplit} from './split';
import {currencies} from './extras';
/** Amount, currency, exchange rate and split. Changing currency clears the old rate so it cannot stay at 1 by mistake. */
export function ExpenseFields({edit}:{edit:Expense|null}){
 const [total,setTotal]=useState(edit?String(edit.amount):''),[currency,setCurrency]=useState(edit?.currency||'HKD'),[rate,setRate]=useState(edit?String(edit.rate):'1'),[msg,setMsg]=useState(''),[people,setPeople]=useState<string[]>(edit?.people||PEOPLE),[mode,setMode]=useState<Split['mode']>(edit?.split?.mode||'equal'),[shares,setShares]=useState<Record<string,string>>(Object.fromEntries(PEOPLE.map(p=>[p,edit?.split?String(edit.split.shares[p]??''):''])));
 const n=Number(total),r=Number(rate);const preview=currency!=='HKD'&&n>0&&r>0;
 function changeCurrency(c:string){setCurrency(c);if(c==='HKD'){setRate('1');setMsg('HKD 對 HKD = 1')}else{setRate('');setMsg(`已轉為 ${c}，舊匯率已清空：請按「取得參考匯率」或者填實際匯率`)}}
 async function fetchRate(){if(currency==='HKD'){setRate('1');setMsg('HKD 對 HKD = 1');return}setMsg('讀取參考匯率中…');try{const res=await fetch('https://api.frankfurter.dev/v1/latest?base='+encodeURIComponent(currency)+'&symbols=HKD',{signal:AbortSignal.timeout(12000)});if(!res.ok)throw Error();const x=await res.json() as {rates:{HKD:number};date:string};if(!Number.isFinite(x.rates?.HKD))throw Error();setRate(String(x.rates.HKD));setMsg('Frankfurter 參考匯率 · '+x.date+'；實際刷卡匯率可能不同，可手動修改。')}catch{setMsg('未能取得參考匯率，請填寫實際匯率。')}}
 const sum=people.reduce((a,p)=>a+(Number(shares[p])||0),0);
 return <>
  <div className="form-grid"><label className="field"><span>全單總額（唔係每人價）</span><input name="amount" type="number" min="0" step="0.01" value={total} onChange={e=>setTotal(e.target.value)} required/></label>
  <label className="field"><span>原幣</span><select name="currency" value={currency} onChange={e=>changeCurrency(e.target.value)}>{currencies.map(k=><option key={k}>{k}</option>)}</select></label>
  <label className="field"><span>1 {currency} = 幾多 HKD</span><input name="rate" type="number" min="0.000001" step="any" value={rate} onChange={e=>setRate(e.target.value)} required placeholder="請填匯率"/></label>
  <div className="field rate-tools"><span>&nbsp;</span><button type="button" className="secondary" onClick={fetchRate}>取得參考匯率</button></div></div>
  {preview&&<p className="rate-preview">{currency} {amount(n)} ≈ <b>HKD {amount(n*r)}</b>（1 {currency} = {r} HKD）</p>}
  {currency!=='HKD'&&r===1&&<label className="check-row rate-warning"><input type="checkbox" name="rate-one-ok"/>匯率仍然係 1。我確認 1 {currency} 真係等於 1 HKD</label>}
  {msg&&<p role="status">{msg}</p>}
  <fieldset className="split"><legend>分攤</legend>
   <div className="split-people">{PEOPLE.map(p=><label className="check-row" key={p}><input type="checkbox" name="people" value={p} checked={people.includes(p)} onChange={e=>setPeople(e.target.checked?PEOPLE.filter(x=>x===p||people.includes(x)):people.filter(x=>x!==p))}/>{p}</label>)}</div>
   <div className="split-modes" role="radiogroup" aria-label="分攤方式">{([['equal','平均'],['amount','指定金額'],['percent','百分比']] as const).map(([m,l])=><label key={m} className={mode===m?'on':''}><input type="radio" name="split-mode" value={m} checked={mode===m} onChange={()=>setMode(m)}/>{l}</label>)}</div>
   {mode!=='equal'&&<div className="form-grid">{people.map(p=><label className="field" key={p}><span>{p}{mode==='amount'?`（${currency}）`:'（%）'}</span><input name={'share-'+p} type="number" min="0" step="any" value={shares[p]} onChange={e=>setShares({...shares,[p]:e.target.value})} required/></label>)}</div>}
   {mode==='amount'&&<small>已分 {currency} {amount(sum)} / {amount(n||0)}{n>0&&Math.abs(sum-n)>0.01?` · 尚差 ${amount(n-sum)}`:' ✓'}</small>}
   {mode==='percent'&&<small>已分 {amount(sum)}% / 100%{Math.abs(sum-100)>0.01?` · 尚差 ${amount(100-sum)}%`:' ✓'}</small>}
  </fieldset>
 </>;
}
export function SettlementPanel({trip,onRepay,onDelete}:{trip:Trip;onRepay:(from:string,to:string,amount:number)=>void;onDelete:(id:string)=>void}){
 const b=balances(trip);const debtor=PEOPLE.find(p=>b[p]<-0.005),creditor=PEOPLE.find(p=>b[p]>0.005);const owed=debtor?Math.abs(b[debtor]):0;
 const repaid=(trip.settlements||[]).filter(s=>!s.deletedAt);
 return <section className="panel settlement"><h2>雙人分攤結算</h2>
  {debtor&&creditor?<p className="owe-line"><b>{debtor}</b> 仲欠 <b>{creditor}</b> <strong>HKD {amount(owed)}</strong></p>:<p className="owe-line">✓ 已經兩清</p>}
  {PEOPLE.map(p=><p key={p}><b>{p}</b><span>{b[p]>=0?'應收回':'應支付'} HKD {amount(Math.abs(b[p]))}</span></p>)}
  {debtor&&creditor&&<button className="secondary" onClick={()=>onRepay(debtor,creditor,Math.round(owed*100)/100)}>記錄 {debtor} 已還款</button>}
  {repaid.length>0&&<div className="repay-list"><h3>已還款記錄</h3>{repaid.map(s=><p key={s.id}><span>{s.date} · {s.from} → {s.to}</span><b>HKD {amount(s.amount)}</b><button className="text-btn danger" onClick={()=>onDelete(s.id)}>刪除</button></p>)}</div>}
  <small>按每筆支出嘅分攤方式（平均、指定金額或百分比）計算，未付款唔計入；已還款會從欠款扣除。</small>
 </section>;
}
