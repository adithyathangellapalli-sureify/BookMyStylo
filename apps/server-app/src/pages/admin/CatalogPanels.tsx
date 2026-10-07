import { useEffect, useState } from "react";
import { ErrorNote } from "@bookmystylo/ui";
import type { LocalityDTO, ServiceDTO } from "@bookmystylo/shared";
import { api } from "../../api";

/** The global catalog every shop draws from — toggled active/inactive with a staged save bar. */
export function ServicesPanel({ onChange }: { onChange: () => void }) {
  const [saved, setSaved] = useState<ServiceDTO[]>([]);
  const [draft, setDraft] = useState<ServiceDTO[]>([]);
  const [name, setName] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const load = () => api.get<ServiceDTO[]>("/admin/services").then((s) => { setSaved(s); setDraft(s); });
  useEffect(() => { load(); }, []);
  const changes = draft.filter((d) => saved.find((s) => s.id === d.id)?.active !== d.active);
  async function save() { setErr(null); try { await api.put("/admin/services", { services: changes.map((c) => ({ id: c.id, active: c.active })) }); await load(); onChange(); } catch (e) { setErr((e as Error).message); } }
  async function add() { setErr(null); try { await api.post("/admin/services", { name }); setName(""); await load(); onChange(); } catch (e) { setErr((e as Error).message); } }
  return (
    <div className="subgroup">
      <div className="subgroup-head"><span className="subgroup-title">✂️ Services catalog <span className="muted">{saved.length} total</span></span>
        <form className="row" onSubmit={(e) => { e.preventDefault(); add(); }}><input className="input" placeholder="New service" value={name} onChange={(e) => setName(e.target.value)} style={{ width: 180 }} /><button className="btn sm" disabled={name.trim().length < 2}>Add</button></form>
      </div>
      <div className="chips">{draft.map((s) => <button key={s.id} type="button" className={`sel ${s.active ? "on" : ""}`} onClick={() => setDraft(draft.map((d) => d.id === s.id ? { ...d, active: !d.active } : d))}>{s.active ? "✓ " : ""}{s.name}</button>)}</div>
      <p className="note" style={{ margin: "10px 0 0" }}>Toggle services on or off, then Save. Only active services can be picked by shops.</p>
      {err && <ErrorNote>{err}</ErrorNote>}
      {changes.length > 0 && <div className="savebar"><span className="muted">{changes.length} unsaved change{changes.length === 1 ? "" : "s"}</span><div className="btn-row"><button className="btn ghost sm" onClick={() => setDraft(saved)}>Discard</button><button className="btn sm" onClick={save}>Save changes</button></div></div>}
    </div>
  );
}

/** The master list of cities & localities that shops and customers pick from. */
export function CitiesPanel({ onChange }: { onChange: () => void }) {
  const [list, setList] = useState<LocalityDTO[]>([]);
  const [form, setForm] = useState({ name: "", city: "Bengaluru", state: "Karnataka" });
  const [err, setErr] = useState<string | null>(null);
  const load = () => api.get<LocalityDTO[]>("/admin/localities").then(setList);
  useEffect(() => { load(); }, []);
  async function add() { setErr(null); try { await api.post("/admin/localities", form); setForm({ ...form, name: "" }); await load(); onChange(); } catch (e) { setErr((e as Error).message); } }
  async function del(id: string) { setErr(null); try { await api.del(`/admin/localities/${id}`); await load(); onChange(); } catch (e) { setErr((e as Error).message); } }
  return (
    <div className="subgroup">
      <div className="subgroup-head"><span className="subgroup-title">🏙️ Cities &amp; localities <span className="muted">{list.length} total</span></span></div>
      <form className="grid-2" style={{ gridTemplateColumns: "1fr 1fr 1fr auto", alignItems: "center", marginBottom: 12 }} onSubmit={(e) => { e.preventDefault(); add(); }}>
        <input className="input" placeholder="Locality" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input className="input" placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
        <input className="input" placeholder="State" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
        <button className="btn sm" disabled={form.name.trim().length < 2}>Add</button>
      </form>
      {err && <ErrorNote>{err}</ErrorNote>}
      <div className="chips">{list.map((l) => <span key={l.id} className="sel">{l.name}, {l.state} <span className="muted">· {l.shopCount ?? 0}</span>{!l.shopCount && <button className="link" style={{ marginLeft: 4 }} aria-label={`Delete ${l.name}`} onClick={() => del(l.id)}>✕</button>}</span>)}</div>
    </div>
  );
}
