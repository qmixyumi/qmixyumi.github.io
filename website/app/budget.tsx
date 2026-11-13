import { useEffect, useRef, useState } from "react";
import { kinds, dateAt, amount, tripPeople, type Data, type Trip, type Stop, type Expense, type Money } from "./model";
import { currencies } from "./extras";
import { colorOf, travelIcon } from "./plan-visual";
import type { QuestData, QuestEntry } from "./quest-model";
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
export function autoSources(t: Trip, d?: Data): Source[] {
  const out: Source[] = [];
  if (d?.quest) for (const e of d.quest.entries) for (const c of questCharges(e, d)) if (c.trip.id === t.id && !c.skip) out.push(c);
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

// ---------- 評分圖鑑 prices ----------
// Hotel price per night, spot tickets and food prices typed in the cross-trip atlas also become automatic
// expenses. An entry belongs to the trip it was imported from (entry.trip / entry.stop), or the trip the user
// picked, or else the only trip that has a stop with the same name. entry.trip === "none" keeps it out of the budget.
// When that stop already has its own price (stop.cost) the stop wins, so nothing is counted twice.
const QUEST_KIND: Record<string, string> = { hotel: "酒店", spot: "景點", food: "美食" };
const tripDays = (t: Trip) => Math.max(1, Math.round((Date.parse(t.end) - Date.parse(t.start)) / 86400000) + 1);
const sameName = (e: QuestEntry, s: Stop) => !!e.name && (e.name === s.title.slice(0, 100) || s.title.includes(e.name));
const matchStops = (e: QuestEntry, t: Trip) => liveStops(t).filter((s) => s.kind === QUEST_KIND[e.kind] && sameName(e, s));

export type QuestLink = { trip?: Trip; stops: Stop[]; how: "picked" | "imported" | "matched" | "none" | "many" | "unmatched" };
export function questLink(e: QuestEntry, d: Data): QuestLink {
  if (e.trip === "none") return { stops: [], how: "none" };
  const trips = d.trips.filter((t) => !t.deletedAt);
  if (e.trip) {
    const t = trips.find((x) => x.id === e.trip);
    if (t) {
      const own = e.stop ? liveStops(t).filter((s) => s.id === e.stop) : [];
      return { trip: t, stops: own.length ? [...own, ...matchStops(e, t).filter((s) => s.id !== e.stop)] : matchStops(e, t), how: e.stop ? "imported" : "picked" };
    }
  }
  const hits = trips.filter((t) => t.id !== "demo").map((t) => ({ trip: t, stops: matchStops(e, t) })).filter((x) => x.stops.length);
  if (hits.length === 1) return { ...hits[0], how: "matched" };
  return { stops: [], how: hits.length > 1 ? "many" : "unmatched" };
}

/** Reads a typed price such as "792.75", "HK$220", "¥120", "80元" or "CNY 80". "免費" or no number gives nothing. */
export function parsePrice(text: string, fallback: string): Money | undefined {
  const raw = (text || "").replace(/,/g, "").trim();
  const m = raw.match(/\d+(?:\.\d+)?/);
  if (!m) return undefined;
  const n = Math.round(Number(m[0]) * 100) / 100;
  if (!(n > 0)) return undefined;
  const up = raw.toUpperCase();
  const code = currencies.find((c) => new RegExp("(^|[^A-Z])" + c + "([^A-Z]|$)").test(up));
  let currency = code || "";
  if (!currency) {
    if (/HK\$|港幣|港元|港紙/.test(up)) currency = "HKD";
    else if (/NT\$|台幣|新台幣/.test(up)) currency = "TWD";
    else if (/US\$|美元|美金/.test(up)) currency = "USD";
    else if (/S\$|新加坡/.test(up)) currency = "SGD";
    else if (/A\$|澳元|澳幣/.test(up)) currency = "AUD";
    else if (/円|日圓|日元/.test(up)) currency = "JPY";
    else if (/₩|韓圜|韓元/.test(up)) currency = "KRW";
    else if (/฿|泰銖/.test(up)) currency = "THB";
    else if (/€|歐元/.test(up)) currency = "EUR";
    else if (/£|英鎊/.test(up)) currency = "GBP";
    else if (/RMB|人民幣/.test(up)) currency = "CNY";
    else if (/[¥￥]/.test(up)) currency = fallback === "JPY" ? "JPY" : "CNY";
    else if (/元|蚊/.test(up)) currency = ["CNY", "TWD", "HKD"].includes(fallback) ? fallback : "CNY";
    else currency = fallback;
  }
  return { amount: n, currency: currencies.includes(currency) ? currency : fallback };
}

/** Nights to charge for a hotel: the number typed on the entry, else the whole trip when it has one hotel, else the days the hotel is on the plan. */
export function hotelNights(e: QuestEntry, t: Trip, stops: Stop[]) {
  if (e.nights && e.nights > 0) return Math.min(365, Math.round(e.nights));
  const hotels = new Set(liveStops(t).filter((s) => s.kind === "酒店").map((s) => s.title));
  if (hotels.size <= 1 || stops.length === 0) return Math.max(1, tripDays(t) - 1);
  return Math.max(1, new Set(stops.map((s) => s.day)).size);
}

export type QuestCharge = Source & { trip: Trip; skip?: Stop; note: string };
/** What one atlas entry adds to a trip's budget. `skip` names the stop whose own price is counted instead. */
export function questCharges(e: QuestEntry, d: Data): QuestCharge[] {
  const link = questLink(e, d);
  const t = link.trip;
  if (!t || t.deletedAt) return [];
  const fallback = usualCurrency(t).currency;
  const picked = e.currency && currencies.includes(e.currency) ? e.currency : "";
  const read = (text: string) => {
    const m = parsePrice(text, fallback);
    return m && picked ? { ...m, currency: picked } : m;
  };
  const priced = link.stops.find((s) => s.cost && s.cost.amount > 0);
  const first = [...link.stops].sort((a, b) => a.day - b.day || a.time.localeCompare(b.time))[0];
  const date = first && first.day >= 1 ? dateAt(t, first.day) : t.start;
  const out: QuestCharge[] = [];
  const add = (key: string, title: string, price: Money | undefined, times: number, note: string) => {
    if (!price) return;
    out.push({ key, title, money: { amount: Math.round(price.amount * times * 100) / 100, currency: price.currency }, category: QUEST_KIND[e.kind], date, trip: t, skip: priced, note: times > 1 ? `${price.currency} ${amount(price.amount)} × ${note}` : "" });
  };
  if (e.kind === "hotel") {
    const n = hotelNights(e, t, link.stops);
    add("quest:" + e.id, `${e.name}（${n} 晚）`, read(e.price), n, n + " 晚");
  } else if (e.kind === "spot") {
    const n = tripPeople(t).length;
    add("quest:" + e.id, `門票：${e.name}`, read(e.ticket), n, n + " 人");
    add("questride:" + e.id, `遊玩項目：${e.name}`, read(e.ride), n, n + " 人");
  } else add("quest:" + e.id, e.name, read(e.price), 1, "");
  return out;
}

/** Currency an atlas price is counted in: the one picked, else a symbol typed in the price, else the trip's usual currency. */
export function questCurrency(e: QuestEntry, d?: Data) {
  if (e.currency && currencies.includes(e.currency)) return e.currency;
  const t = d ? questLink(e, d).trip : undefined;
  const fallback = t ? usualCurrency(t).currency : "HKD";
  const text = e.kind === "spot" ? e.ticket || e.ride : e.price;
  return parsePrice(text, fallback)?.currency || fallback;
}

/** Rows in the ledger that look like the same spending twice: same day and same HKD amount, or same day and same name. */
export function likelyDuplicates(t: Trip): Set<string> {
  const live = t.expenses.filter((e) => !e.deletedAt);
  const out = new Set<string>();
  const norm = (s: string) => s.replace(/[\s（）()：:·→>\-]/g, "").replace(/^(門票|遊玩項目)/, "").toLowerCase();
  for (let i = 0; i < live.length; i++)
    for (let j = i + 1; j < live.length; j++) {
      const a = live[i], b = live[j];
      if (a.date !== b.date) continue;
      const ha = a.amount * a.rate, hb = b.amount * b.rate;
      const sameMoney = ha >= 30 && Math.abs(ha - hb) <= Math.max(1, ha * 0.01);
      const na = norm(a.title), nb = norm(b.title);
      const sameName = na.length > 1 && (na === nb || na.includes(nb) && nb.length > 1 || nb.includes(na));
      if (sameMoney || sameName) out.add(a.id).add(b.id);
    }
  return out;
}

export const autoId = (key: string) => "auto-" + key.replace(":", "-");

/** Brings the automatic rows of one trip in line with its prices. Payer, people, split and status that someone changed are kept. */
export function syncAuto(t: Trip, d?: Data): boolean {
  const before = JSON.stringify(t.expenses);
  const who = tripPeople(t);
  const sources = autoSources(t, d);
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
  for (const t of d.trips) if (!t.deletedAt && syncAuto(t, d)) changed = true;
  return changed;
}

/** Currencies of automatic prices that have no exchange rate yet, so they are not counted. */
export function missingRates(t: Trip, d?: Data) {
  return [...new Set(autoSources(t, d).map((s) => s.money.currency).filter((c) => rateFor(t, c, t.expenses.find((e) => e.source && e.currency === c)) === null))];
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

/** Currency a new expense starts in: the one last used on this trip, else the one its prices use, else a guess from the time zone. */
const ZONE_CURRENCY: Record<string, string> = { "Asia/Tokyo": "JPY", "Asia/Taipei": "TWD", "Asia/Shanghai": "CNY", "Asia/Urumqi": "CNY", "Asia/Chongqing": "CNY", "Asia/Seoul": "KRW", "Asia/Bangkok": "THB", "Asia/Singapore": "SGD", "Asia/Kuala_Lumpur": "MYR", "Asia/Manila": "PHP", "Asia/Jakarta": "IDR", "Asia/Bali": "IDR", "Asia/Makassar": "IDR", "Asia/Kolkata": "INR", "Europe/London": "GBP", "Europe/Zurich": "CHF", "Europe/Stockholm": "SEK", "Europe/Oslo": "NOK", "Europe/Copenhagen": "DKK", "Europe/Prague": "CZK", "Europe/Budapest": "HUF", "Europe/Warsaw": "PLN", "Europe/Istanbul": "TRY", "Atlantic/Reykjavik": "ISK", "America/Mexico_City": "MXN", "America/Sao_Paulo": "BRL", "Africa/Johannesburg": "ZAR", "Pacific/Auckland": "NZD", "America/Toronto": "CAD", "America/Vancouver": "CAD" };
export function zoneCurrency(zone?: string) {
  if (!zone) return "";
  if (ZONE_CURRENCY[zone]) return ZONE_CURRENCY[zone];
  if (zone.startsWith("Australia/")) return "AUD";
  if (zone.startsWith("America/")) return "USD";
  if (zone.startsWith("Europe/")) return "EUR";
  return "";
}
export function usualCurrency(t: Trip): { currency: string; rate?: number } {
  const last = t.expenseCurrency || "";
  const used = tripCurrency(t);
  const currency = (last && currencies.includes(last) ? last : "") || (used !== "HKD" ? used : "") || zoneCurrency(t.timezone) || "HKD";
  if (currency === "HKD") return { currency };
  const seen = [...t.expenses].reverse().find((e) => e.currency === currency && e.rate > 0 && e.rate !== 1)?.rate;
  return { currency, rate: t.rates?.[currency] || seen };
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
export function RateNotice({ trip, data, onRate }: { trip: Trip; data?: Data; onRate: (cur: string, rate: number) => void }) {
  const missing = missingRates(trip, data);
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
