import { useEffect, useState } from "react";
import { ErrorNote } from "@bookmystylo/ui";
import { formatPhone, initials, normalizePhone, type ShopDTO, type StylistDTO } from "@bookmystylo/shared";
import { api } from "../api";
import { useAuth } from "../auth";

export function ChairsPage() {
  const { me, setMe } = useAuth();
  const shop = me!.shop;
  const [err, setErr] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [np, setNp] = useState({ name: "", phone: "" });
  const [editing, setEditing] = useState<string | null>(null);
  const apply = (s: ShopDTO) => setMe({ ...me!, shop: s });
  async function run(fn: () => Promise<ShopDTO>) { setErr(null); try { apply(await fn()); } catch (e) { setErr((e as Error).message); } }

  return (
    <>
      <h1 className="h-xl">Chairs &amp; team</h1>
      <p className="sub">{shop.name} · {shop.chairs.length} chairs · {shop.stylists.length} people</p>
      {err && <div style={{ marginBottom: 12 }}><ErrorNote>{err}</ErrorNote></div>}

      <div className="card">
        <div className="row row-b" style={{ marginBottom: 6 }}><span className="label" style={{ margin: 0 }}>Chairs</span><button className="btn ghost sm" onClick={() => run(() => api.post<ShopDTO>("/partner/chairs"))}>＋ Add chair</button></div>
        {shop.chairs.map((c) => {
          const st = shop.stylists.find((s) => s.id === c.staffId);
          return (
            <div key={c.id} className="chair-row">
              <span className="mini-avatar">{st ? initials(st.name) : "＋"}</span>
              <div><div className="name">{c.label}</div><div className="muted">{st?.name ?? "Unassigned"}</div></div>
              <div className="field" style={{ width: 150 }}><select value={c.staffId ?? ""} onChange={(e) => run(() => api.patch<ShopDTO>(`/partner/chairs/${c.id}`, { staffId: e.target.value || null }))}><option value="">Unassigned</option>{shop.stylists.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
              <button className="icon-btn" aria-label={`Remove ${c.label}`} onClick={() => run(() => api.del<ShopDTO>(`/partner/chairs/${c.id}`))}>✕</button>
            </div>
          );
        })}
      </div>

      <div className="card">
        <span className="label">Team</span>
        {shop.stylists.map((s) => (
          <div key={s.id} className="team-row">
            <span className="mini-avatar">{initials(s.name)}</span>
            <div className="grow"><div className="name">{s.name} {s.isAdmin && <span className="pill p-new no-dot">★ Admin</span>}</div><div className="muted">{s.chairLabel ?? "No chair"}{s.ratingCount > 0 ? ` · ★ ${s.ratingAvg.toFixed(1)} (${s.ratingCount})` : ""}</div></div>
            <button className="btn ghost sm" onClick={() => setEditing(editing === s.id ? null : s.id)}>{editing === s.id ? "Close" : "Profile"}</button>
            {!s.isAdmin && <button className="btn danger sm" onClick={() => run(() => api.del<ShopDTO>(`/partner/staff/${s.id}`))}>Remove</button>}
          </div>
        ))}
        {adding ? (
          <form className="grid-2" style={{ gridTemplateColumns: "1fr 1fr auto", alignItems: "center", marginTop: 10 }} onSubmit={(e) => { e.preventDefault(); run(() => api.post<ShopDTO>("/partner/staff", np)).then(() => { setAdding(false); setNp({ name: "", phone: "" }); }); }}>
            <input className="input" placeholder="Name" value={np.name} onChange={(e) => setNp({ ...np, name: e.target.value })} />
            <input className="input" placeholder="Mobile" inputMode="tel" value={np.phone} onChange={(e) => setNp({ ...np, phone: e.target.value })} />
            <button className="btn sm" disabled={!np.name.trim() || normalizePhone(np.phone).length !== 10}>Add</button>
          </form>
        ) : <button className="btn ghost block" style={{ marginTop: 10 }} onClick={() => setAdding(true)}>＋ Add person</button>}
      </div>

      {editing && <StylistProfileEditor stylist={shop.stylists.find((s) => s.id === editing)!} onSaved={(s) => { apply(s); }} />}
    </>
  );
}

/** Experience, speciality and skills — shown to customers on the booking screen. Rating is read-only here. */
export function StylistProfileEditor({ stylist, onSaved, self = false }: { stylist: StylistDTO; onSaved: (s: ShopDTO) => void; self?: boolean }) {
  const [exp, setExp] = useState<string>(stylist.experienceYears?.toString() ?? "");
  const [spec, setSpec] = useState(stylist.speciality ?? "");
  const [skills, setSkills] = useState<string[]>(stylist.skills);
  const [newSkill, setNewSkill] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { setExp(stylist.experienceYears?.toString() ?? ""); setSpec(stylist.speciality ?? ""); setSkills(stylist.skills); }, [stylist.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const dirty = exp !== (stylist.experienceYears?.toString() ?? "") || spec !== (stylist.speciality ?? "") || skills.join(",") !== stylist.skills.join(",");
  async function save() {
    setBusy(true); setErr(null);
    try { onSaved(await api.patch<ShopDTO>(`/partner/staff/${stylist.id}`, { experienceYears: exp === "" ? null : Number(exp), speciality: spec || null, skills })); }
    catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }
  return (
    <div className="card">
      <div className="row row-b"><span className="name">{self ? "My stylist profile" : `Stylist profile — ${stylist.name}`}</span>{stylist.ratingCount > 0 && <span className="rating pill-r">★ {stylist.ratingAvg.toFixed(1)} <span className="rc">· {stylist.ratingCount}</span></span>}</div>
      <p className="muted" style={{ margin: "4px 0 12px" }}>Shown to customers on the booking screen. The rating is computed from customer reviews — read-only here.</p>
      <label className="label">Experience (yrs)</label>
      <input className="input" style={{ marginBottom: 10, maxWidth: 140 }} inputMode="numeric" value={exp} onChange={(e) => setExp(e.target.value.replace(/\D/g, ""))} />
      <label className="label">Speciality (one line)</label>
      <input className="input" style={{ marginBottom: 10 }} placeholder="Skin fades & sharp beard sculpting" value={spec} onChange={(e) => setSpec(e.target.value)} />
      <label className="label">Skills</label>
      <div className="chips" style={{ marginBottom: 8 }}>
        {skills.map((k) => <button key={k} type="button" className="sel on" onClick={() => setSkills(skills.filter((x) => x !== k))}>{k} ✕</button>)}
        <form onSubmit={(e) => { e.preventDefault(); const k = newSkill.trim(); if (k && !skills.includes(k)) setSkills([...skills, k]); setNewSkill(""); }} style={{ display: "inline-flex", gap: 6 }}>
          <input className="input" style={{ width: 130, padding: "7px 10px" }} placeholder="＋ Add skill" value={newSkill} onChange={(e) => setNewSkill(e.target.value)} />
        </form>
      </div>
      {err && <ErrorNote>{err}</ErrorNote>}
      {dirty && (
        <div className="savebar"><span className="muted">Unsaved changes to {self ? "your" : `${stylist.name}'s`} profile</span><div className="btn-row"><button className="btn ghost sm" onClick={() => { setExp(stylist.experienceYears?.toString() ?? ""); setSpec(stylist.speciality ?? ""); setSkills(stylist.skills); }}>Discard</button><button className="btn sm" disabled={busy} onClick={save}>Save profile</button></div></div>
      )}
    </div>
  );
}
