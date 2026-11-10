import { useEffect, useId, useState } from 'react'
import { supabase } from './supabase'
import { DEFAULTS, KEYS, merge } from './content'
import './admin.css'

/* ---- what each tab edits ("Label|type": text (default), area, num, bool, tags, img) ---- */
const EXP = ['Role', 'Company', 'Period', 'Current role|bool', 'Description|area', 'Tags|tags']
const SPEC = {
  HERO: { t: 'Hero', f: { name: 'Name', role: 'Role / title', chip: 'Cursor label (short)', tagline: 'Tagline|area', badge: 'Availability badge', photo: 'Photo|img' } },
  ABOUT: { t: 'About: story', list: 'Paragraph|area' },
  FACTS: { t: 'About: quick facts', cols: ['Label', 'Value'] },
  INT: { t: 'About: interests', list: 'Interest' },
  EXP: { t: 'Experience', cols: EXP },
  SK: { t: 'Skills', cols: ['Group', { l: 'Skills', cols: ['Skill', 'Level (0–100)|num'] }] },
  SOFT: { t: 'Soft skills', list: 'Skill' },
  ED: { t: 'Education', cols: ['Program', 'School', 'Period', 'Current|bool', 'Description|area', 'Tags|tags'] },
  CERT: { t: 'Certifications', cols: ['Name', 'Details'] },
  PJ: { t: 'Projects', cols: ['Title', 'Description|area', 'Tags|tags', 'Thumbnail colours (two hex codes, comma-separated)'] },
  CT: { t: 'Contact details', cols: ['Label (Email, Phone, Location, Website)', 'Value'] },
  ST: { t: 'Hero stats', cols: ['Number|num', 'Suffix (+, rd…)', 'Label'] },
  SOCIAL: { t: 'Social links', cols: ['Name', 'URL (use # to hide the link target)'] },
}
const parse = s => { const [l, t = 'text'] = s.split('|'); return { l, t } }
const blank = c => (typeof c === 'object' ? [] : ({ bool: 0, num: 0, tags: [] }[parse(c).t] ?? ''))

/* ---- field editors ---- */
function TagsIn({ v, set, id }) {
  const [s, setS] = useState((v || []).join(', '))
  return <input id={id} value={s} onChange={e => setS(e.target.value)} onBlur={() => set(s.split(',').map(x => x.trim()).filter(Boolean))} />
}

function ImgIn({ v, set, id }) {
  const [note, setNote] = useState('')
  async function up(file) {
    if (!file) return
    setNote('Uploading…')
    const path = `hero-${Date.now()}.${file.name.split('.').pop()}`
    const { error } = await supabase.storage.from('portfolio').upload(path, file, { contentType: file.type })
    if (error) return setNote(`Upload failed: ${error.message}`)
    set(supabase.storage.from('portfolio').getPublicUrl(path).data.publicUrl)
    setNote('Uploaded.')
  }
  return (
    <div className="img">
      <div className="thumb">{v ? <img src={v} alt="" /> : <span>Default photo</span>}</div>
      <div>
        <input id={id} placeholder="Image URL (leave empty for the default photo)" value={v || ''} onChange={e => set(e.target.value)} />
        <input type="file" accept="image/png,image/webp,image/jpeg" aria-label="Upload photo" onChange={e => up(e.target.files[0])} />
        <small>Use a PNG or WebP with a transparent background so it blends into the page. {note}</small>
      </div>
    </div>
  )
}

function Leaf({ spec, v, set }) {
  const id = useId()
  const { l, t } = parse(spec)
  if (t === 'bool') return <label className="ck"><input type="checkbox" checked={!!v} onChange={e => set(e.target.checked ? 1 : 0)} />{l}</label>
  let c
  if (t === 'tags') c = <TagsIn key={String(v)} v={v} set={set} id={id} />
  else if (t === 'img') c = <ImgIn v={v} set={set} id={id} />
  else if (t === 'area') c = <textarea id={id} rows={4} value={v ?? ''} onChange={e => set(e.target.value)} />
  else c = <input id={id} type={t === 'num' ? 'number' : 'text'} value={v ?? ''} onChange={e => set(t === 'num' ? +e.target.value : e.target.value)} />
  return <div className="fld"><label htmlFor={id}>{l}{t === 'tags' && <small> (comma-separated)</small>}</label>{c}</div>
}

function Rows({ spec, v, set }) {
  const rows = v || []
  const put = (i, x) => set(rows.map((r, a) => (a === i ? x : r)))
  const cell = (i, j, x) => put(i, rows[i].map((c, b) => (b === j ? x : c)))
  const move = (i, d) => { const n = [...rows], j = i + d; if (j < 0 || j >= n.length) return;[n[i], n[j]] = [n[j], n[i]]; set(n) }
  return (
    <div className="rows">
      {rows.map((row, i) => (
        <div className="itm" key={i}>
          <div className="rh">
            <b>{spec.list ? `${parse(spec.list).l} ${i + 1}` : String(row[0] || `Item ${i + 1}`)}</b>
            <span>
              <button type="button" onClick={() => move(i, -1)} aria-label="Move up" disabled={i === 0}>↑</button>
              <button type="button" onClick={() => move(i, 1)} aria-label="Move down" disabled={i === rows.length - 1}>↓</button>
              <button type="button" className="del" onClick={() => set(rows.filter((_, a) => a !== i))} aria-label="Remove">Remove</button>
            </span>
          </div>
          {spec.list
            ? <Leaf spec={spec.list} v={row} set={x => put(i, x)} />
            : spec.cols.map((c, j) => typeof c === 'object'
              ? <div className="sub" key={j}><h4>{c.l}</h4><Rows spec={c} v={row[j]} set={x => cell(i, j, x)} /></div>
              : <Leaf key={j} spec={c} v={row[j]} set={x => cell(i, j, x)} />)}
        </div>
      ))}
      <button type="button" className="add" onClick={() => set([...rows, spec.list ? blank(spec.list) : spec.cols.map(blank)])}>+ Add</button>
    </div>
  )
}

function Editor({ k, v, set }) {
  const spec = SPEC[k]
  if (spec.f) return <>{Object.entries(spec.f).map(([f, s]) => <Leaf key={f} spec={s} v={v[f]} set={x => set({ ...v, [f]: x })} />)}</>
  return <Rows spec={spec} v={v} set={set} />
}

function Inbox() {
  const [items, setItems] = useState(null), [err, setErr] = useState('')
  const load = () => supabase.from('contact_messages').select('*').order('created_at', { ascending: false }).then(({ data, error }) => { if (error) setErr(error.message); setItems(data || []) })
  useEffect(() => { load() }, [])
  const del = async id => { await supabase.from('contact_messages').delete().eq('id', id); load() }
  if (err) return <p className="bad">Could not load messages: {err}</p>
  if (!items) return <p>Loading…</p>
  if (!items.length) return <p>No messages yet.</p>
  return items.map(m => (
    <article className="itm" key={m.id}>
      <div className="rh"><b>{m.subject}</b><span><button type="button" className="del" onClick={() => del(m.id)}>Delete</button></span></div>
      <p className="meta">{m.name} · <a href={`mailto:${m.email}`}>{m.email}</a>{m.created_at && ` · ${new Date(m.created_at).toLocaleString()}`}</p>
      <p style={{ whiteSpace: 'pre-wrap' }}>{m.message}</p>
    </article>
  ))
}

function Login() {
  const [f, setF] = useState({ email: '', password: '' }), [err, setErr] = useState('')
  async function go(e) {
    e.preventDefault()
    const { error } = await supabase.auth.signInWithPassword(f)
    if (error) setErr(error.message)
  }
  return (
    <main className="adm login">
      <form className="card" onSubmit={go}>
        <h1>Admin sign in</h1>
        <div className="fld"><label htmlFor="ae">Email</label><input id="ae" type="email" autoComplete="username" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} required /></div>
        <div className="fld"><label htmlFor="ap">Password</label><input id="ap" type="password" autoComplete="current-password" value={f.password} onChange={e => setF({ ...f, password: e.target.value })} required /></div>
        <button className="btn p" type="submit">Sign in</button>
        <p className="bad" role="alert">{err}</p>
        <a href="#">← Back to site</a>
      </form>
    </main>
  )
}

function Dash() {
  const [draft, setDraft] = useState(null), [saved, setSaved] = useState(''), [tab, setTab] = useState('HERO'), [msg, setMsg] = useState(''), [busy, setBusy] = useState(false)
  useEffect(() => {
    supabase.from('portfolio_content').select('data').eq('id', 1).maybeSingle().then(({ data, error }) => {
      const d = merge(data?.data); setDraft(d); setSaved(JSON.stringify(d))
      if (error) setMsg(`Could not load saved content: ${error.message}. Did you run supabase/setup.sql?`)
    })
  }, [])
  const dirty = draft && JSON.stringify(draft) !== saved
  useEffect(() => {
    const f = e => { if (dirty) e.preventDefault() }
    addEventListener('beforeunload', f)
    return () => removeEventListener('beforeunload', f)
  }, [dirty])
  if (!draft) return <main className="adm"><p>Loading…</p></main>

  async function save() {
    setBusy(true)
    const { error } = await supabase.from('portfolio_content').upsert({ id: 1, data: draft, updated_at: new Date().toISOString() })
    setBusy(false)
    if (error) return setMsg(`Save failed: ${error.message}`)
    setSaved(JSON.stringify(draft)); setMsg('Saved. Your site now shows these changes.')
  }
  const exportJson = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(draft, null, 2)], { type: 'application/json' })); a.download = 'portfolio-content.json'; a.click() }
  const importJson = f => f && f.text().then(t => { try { setDraft(merge(JSON.parse(t))); setMsg('Imported. Review it, then press Save.') } catch { setMsg('That file is not valid JSON.') } })
  const tabs = [...KEYS.map(k => [k, SPEC[k].t]), ['INBOX', 'Messages'], ['BACKUP', 'Backup']]

  return (
    <div className="adm">
      <div className="top">
        <strong>Portfolio admin</strong>
        <span className="sp" />
        <a className="btn" href="#">View site</a>
        <button className="btn p" onClick={save} disabled={busy || !dirty}>{busy ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}</button>
        <button className="btn" onClick={() => supabase.auth.signOut()}>Sign out</button>
      </div>
      <div className="body">
        <div className="tabs" role="navigation" aria-label="Sections">{tabs.map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} aria-current={tab === k ? 'page' : undefined} onClick={() => setTab(k)}>{l}</button>)}</div>
        <main>
          <p className="msg" role="status" aria-live="polite">{msg}</p>
          {tab === 'INBOX' ? <><h1>Messages</h1><Inbox /></>
            : tab === 'BACKUP' ? (
              <>
                <h1>Backup</h1>
                <p>Download everything as a file, restore from one, or go back to the original content. Nothing changes on your site until you press Save.</p>
                <div className="acts">
                  <button className="btn" onClick={exportJson}>Export JSON</button>
                  <label className="btn">Import JSON<input type="file" accept="application/json" hidden onChange={e => importJson(e.target.files[0])} /></label>
                  <button className="btn" onClick={() => confirm('Replace the draft with the original built-in content?') && setDraft(merge(null))}>Reset to original</button>
                </div>
              </>
            ) : <><h1>{SPEC[tab].t}</h1><Editor k={tab} v={draft[tab]} set={x => setDraft({ ...draft, [tab]: x })} /></>}
        </main>
      </div>
    </div>
  )
}

export default function Admin() {
  const [session, setSession] = useState(undefined)
  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])
  if (!supabase) return <main className="adm login"><div className="card"><h1>Supabase isn’t configured</h1><p>Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to your <code>.env</code> file, run <code>supabase/setup.sql</code>, then restart the dev server.</p><a href="#">← Back to site</a></div></main>
  if (session === undefined) return null
  return session ? <Dash /> : <Login />
}
