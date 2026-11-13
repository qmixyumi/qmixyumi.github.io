import { useEffect, useRef, useState } from "react";
import { kinds, dateAt, amount, tripPeople, type Data, type Trip, type Stop, type Expense, type Money } from "./model";
import { currencies } from "./extras";
import { colorOf, travelIcon } from "./plan-visual";
import "./budget.css";
// Automatic spending: prices typed on stops, on the legs between stops and on tickets become
// expenses in 旅費帳簿 by themselves (one per source, id "auto-…", field `source`), so nobody adds them up by hand.

export const LEG_MODES = ["步行", "地鐵", "巴士", "的士", "網約車", "高鐵", "火車", "電車", "自駕", "單車", "船", "飛機"];
export const CATEGORY_LABEL: Record<string, string> = { 美食: "餐飲", 酒店: "住宿", 購物: "購物" };
const label = (k: string) => CATEGORY_LABEL[k] || k;
const iso = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));
const liveStops = (t: Trip) => t.stops.filter((s) => !s.deletedAt && s.status !== "取消");

/** The stop after this one on the same day, in time order. */
export function nextStop(t: Trip, s: Stop) {
  const day = liveStops(t).filter((x) => x.day === s.day).sort((a, b) => a.time.localeCompare(b.time));
  const i = day.findIndex((x) => x.id === s.id);
  return i >= 0 ? day[i + 1] : undefined;
}

type Source = { key: string; title: string; money: Money; category: string; date: string };
export function autoSources(t: Trip): Source[] {
  const out: Source[] = [];
  for (const s of liveStops(t)) {
    if (s.day < 1) continue;
    const date = dateAt(t, s.day);
    if (s.cost && s.cost.amount > 0)
      out.push({ key: "stop:" + s.id, title: s.title, money: s.cost, category: kinds[s.kind] ? s.kind : "日常", date });
    if (s.fare && s.fare.amount > 0) {
      const n = nextStop(t, s);
      out.push({ key: "leg:" + s.id, title: `${s.travel || "交通"}：${s.title}${n ? " → " + n.title : ""}`, money: s.fare, category: "交通", date });
    }
  }
  for (const k of t.tickets || []) {
    if (k.deletedAt || k.fare === null || !(k.fare > 0)) continue;
    const d = (k.departure || "").slice(0, 10);
    out.push({
      key: "ticket:" + k.id,
      title: `${k.number ? k.number + " " : ""}${k.from || "?"} → ${k.to || "?"}`,
      money: { amount: k.fare, currency: k.currency || "HKD" },
      category: "交通",
      date: iso(d) ? d : t.start,
    });
  }
  return out;
}

/** HKD per unit: the trip's saved rate, then the rate already on this row, then the latest hand-entered row in that currency. */
export function rateFor(t: Trip, cur: string, existing?: Expense): number | null {
  if (cur === "HKD") return 1;
  const saved = t.rates?.[cur];
  if (saved && saved > 0) return saved;
  if (existing && existing.currency === cur && existing.rate > 0) return existing.rate;
  const manual = t.expenses.filter((e) => !e.deletedAt && !e.source && e.currency === cur && e.rate > 0 && e.rate !== 1);
  return manual.length ? manual[manual.length - 1].rate : null;
}

export const autoId = (key: string) => "auto-" + key.replace(":", "-");

/** Brings the automatic rows of one trip in line with its prices. Payer, people, split and status that someone changed are kept. */
export function syncAuto(t: Trip): boolean {
  const before = JSON.stringify(t.expenses);
  const who = tripPeople(t);
  const sources = autoSources(t);
  const keep = new Set(sources.map((s) => autoId(s.key)));
  const next: Expense[] = t.expenses.filter((e) => !e.source || keep.has(e.id) || e.deletedAt);
  for (const src of sources) {
    const id = autoId(src.key);
    const i = next.findIndex((e) => e.id === id);
    const old = i >= 0 ? next[i] : undefined;
    if (old?.deletedAt) continue;
    const rate = rateFor(t, src.money.currency, old);
    if (rate === null) {
      if (old) next.splice(i, 1);
      continue;
    }
    const people = (old?.people || who).filter((p) => who.includes(p));
    const e: Expense = {
      id,
      source: src.key,
      title: src.title,
      amount: src.money.amount,
      currency: src.money.currency,
      rate,
      payer: old && who.includes(old.payer) ? old.payer : who[0],
      people: people.length ? people : who,
      status: old?.status || "已付",
      category: src.category,
      date: src.date,
    };
    const sameMoney = old && old.amount === e.amount && old.currency === e.currency;
    if (old?.split && (old.split.mode === "percent" || sameMoney)) e.split = old.split;
    if (old) next[i] = e;
    else next.push(e);
  }
  if (JSON.stringify(next) === before) return false;
  t.expenses = next;
  return true;
}

export function syncAll(d: Data): boolean {
  let changed = false;
  for (const t of d.trips) if (!t.deletedAt && syncAuto(t)) changed = true;
  return changed;
}

/** Currencies of automatic prices that have no exchange rate yet, so they are not counted. */
export function missingRates(t: Trip) {
  return [...new Set(autoSources(t).map((s) => s.money.currency).filter((c) => rateFor(t, c, t.expenses.find((e) => e.source && e.currency === c)) === null))];
}

/** The currency most used on this trip, for new price fields. */
export function tripCurrency(t: Trip) {
  const n: Record<string, number> = {};
  const add = (c?: string) => {
    if (c && c !== "HKD") n[c] = (n[c] || 0) + 1;
  };
  for (const s of t.stops) {
    add(s.cost?.currency);
    add(s.fare?.currency);
  }
  for (const k of t.tickets || []) add(k.currency);
  for (const e of t.expenses) add(e.currency);
  return Object.entries(n).sort((a, b) => b[1] - a[1])[0]?.[0] || "HKD";
}

export function readMoney(f: FormData, prefix: string): Money | undefined {
  const raw = String(f.get(prefix + "-amount") || "").trim();
  const n = Number(raw);
  if (!raw || !Number.isFinite(n) || n <= 0) return undefined;
  return { amount: Math.round(n * 100) / 100, currency: String(f.get(prefix + "-currency") || "HKD") };
}

export function MoneyField({ prefix, label: text, value, fallback, hint }: { prefix: string; label: string; value?: Money; fallback: string; hint?: string }) {
  return (
    <label className="field money-field">
      <span>{text}</span>
      <span className="money-pair">
        <select name={prefix + "-currency"} defaultValue={value?.currency || fallback} aria-label={text + "幣種"}>
          {currencies.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <input name={prefix + "-amount"} type="number" min="0" step="0.01" inputMode="decimal" placeholder="金額（可留空）" defaultValue={value?.amount ?? ""} />
      </span>
      {hint && <small>{hint}</small>}
    </label>
  );
}

export const moneyText = (m?: Money) => (m && m.amount > 0 ? `${m.currency} ${amount(m.amount)}` : "");

/** The transport between two stops: pick how you go, how long, and what it costs. */
export function LegForm({ trip, stop, onSave, onCancel }: { trip: Trip; stop: Stop; onSave: (travel: string, minutes: number, fare?: Money) => void; onCancel: () => void }) {
  const [mode, setMode] = useState(stop.travel || "步行");
  const next = nextStop(trip, stop);
  const modes = LEG_MODES.includes(mode) ? LEG_MODES : [...LEG_MODES, mode];
  return (
    <form
      className="leg-form"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const m = Math.max(0, Math.min(1440, Math.round(Number(f.get("minutes")) || 0)));
        onSave(mode, m, readMoney(f, "fare"));
      }}
    >
      <h2>點樣去下一站？</h2>
      <p className="leg-route">
        {stop.title} <b>→</b> {next ? next.title : "下一站"}
      </p>
      <div className="leg-modes" role="radiogroup" aria-label="交通工具">
        {modes.map((k) => (
          <label key={k} className={mode === k ? "on" : ""}>
            <input type="radio" name="travel" value={k} checked={mode === k} onChange={() => setMode(k)} />
            <i aria-hidden="true">{travelIcon(k)}</i>
            {k}
          </label>
        ))}
      </div>
      <div className="form-grid">
        <MoneyField prefix="fare" label="車費（全單）" value={stop.fare} fallback={tripCurrency(trip)} />
        <label className="field">
          <span>預留分鐘</span>
          <input name="minutes" type="number" min="0" max="1440" defaultValue={stop.minutes} />
        </label>
      </div>
      <p className="leg-note">填咗車費會自動記入「旅費帳簿」交通類，預算即時扣減；清空就會自動移除。</p>
      <div className="modal-actions">
        <button type="button" className="secondary" onClick={onCancel}>
          取消
        </button>
        <button className="primary">儲存</button>
      </div>
    </form>
  );
}

const spentOf = (t: Trip) => {
  const by: Record<string, number> = {},
    auto: Record<string, number> = {};
  for (const e of t.expenses) {
    if (e.deletedAt || e.status === "未付") continue;
    const v = (e.status === "退款" ? -1 : 1) * e.amount * e.rate;
    by[e.category] = (by[e.category] || 0) + v;
    if (e.source) auto[e.category] = (auto[e.category] || 0) + v;
  }
  return { by, auto };
};

/** Budget per kind of spending (food, hotel, transport…) with what is used and what is left. */
export function CategoryBudgets({ trip, onEdit }: { trip: Trip; onEdit: () => void }) {
  const b = trip.budgets || {};
  const { by, auto } = spentOf(trip);
  const cats = [...Object.keys(kinds), ...Object.keys(by).filter((k) => !kinds[k])].filter((k) => (b[k] || 0) > 0 || Math.abs(by[k] || 0) > 0.005);
  const planned = Object.values(b).reduce((a, n) => a + n, 0);
  return (
    <section className="panel cat-budgets">
      <div className="cat-budgets-head">
        <h2>分類預算</h2>
        <button className="text-btn" onClick={onEdit}>
          設定分類預算
        </button>
      </div>
      {cats.length ? (
        <div className="cat-budget-list">
          {cats.map((k) => {
            const used = by[k] || 0,
              cap = b[k] || 0,
              pct = cap > 0 ? Math.min(100, Math.max(0, (used / cap) * 100)) : 0,
              over = cap > 0 && used > cap;
            return (
              <div key={k} className={"cat-budget-row " + (over ? "over" : "")} style={{ "--kc": colorOf(k) } as React.CSSProperties}>
                <div className="cat-budget-name">
                  <span aria-hidden="true">{kinds[k] || "💰"}</span>
                  <b>{label(k)}</b>
                </div>
                <div className="cat-budget-bar" aria-hidden="true">
                  <i style={{ width: (cap > 0 ? pct : used > 0 ? 100 : 0) + "%" }} />
                </div>
                <div className="cat-budget-nums">
                  <span>
                    已用 HKD {amount(used)}
                    {cap > 0 ? ` / ${amount(cap)}` : ""}
                  </span>
                  <strong>{cap > 0 ? (over ? `超出 ${amount(used - cap)}` : `剩 ${amount(cap - used)}`) : "未設預算"}</strong>
                  {(auto[k] || 0) > 0.005 && <small>當中自動計入 {amount(auto[k])}</small>}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="muted">未有支出。可以先幫餐飲、住宿、交通等各自設定預算。</p>
      )}
      {planned > 0 && Math.abs(planned - trip.budget) > 0.5 && (
        <small className="muted">
          分類預算加埋 HKD {amount(planned)}，全程預算係 HKD {amount(trip.budget)}。
        </small>
      )}
    </section>
  );
}

/** Asks for (and tries to fetch) exchange rates for automatic prices in a foreign currency. */
export function RateNotice({ trip, onRate }: { trip: Trip; onRate: (cur: string, rate: number) => void }) {
  const missing = missingRates(trip);
  const tried = useRef(new Set<string>());
  const [msg, setMsg] = useState("");
  useEffect(() => {
    for (const c of missing) {
      if (tried.current.has(c)) continue;
      tried.current.add(c);
      fetch("https://api.frankfurter.dev/v1/latest?base=" + encodeURIComponent(c) + "&symbols=HKD", { signal: AbortSignal.timeout(12000) })
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((x: { rates?: { HKD?: number } }) => {
          const n = x.rates?.HKD;
          if (n && Number.isFinite(n) && n > 0) onRate(c, Math.round(n * 1e6) / 1e6);
        })
        .catch(() => setMsg("未能自動取得匯率，請手動填寫。"));
    }
  }, [missing.join(",")]);
  if (!missing.length) return null;
  return (
    <section className="panel rate-notice">
      <b>有自動扣數嘅項目未有匯率，暫時未計入：</b>
      {missing.map((c) => (
        <form
          key={c}
          onSubmit={(e) => {
            e.preventDefault();
            const n = Number(new FormData(e.currentTarget).get("rate"));
            if (n > 0) onRate(c, n);
          }}
        >
          <span>1 {c} =</span>
          <input name="rate" type="number" step="any" min="0.000001" required placeholder="幾多 HKD" />
          <span>HKD</span>
          <button className="secondary">儲存匯率</button>
        </form>
      ))}
      {msg && <small>{msg}</small>}
    </section>
  );
}

export function autoTotal(t: Trip) {
  return t.expenses.filter((e) => e.source && !e.deletedAt && e.status !== "未付").reduce((a, e) => a + (e.status === "退款" ? -1 : 1) * e.amount * e.rate, 0);
}
