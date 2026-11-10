import { useEffect, useRef, useState } from 'react'
import { supabase } from './supabase'
import { SEC } from './data'
import { useContent, buildQA } from './content'

const SUGGESTIONS = ['What are his skills?', 'Tell me about his experience', 'How can I contact him?', 'Is he open to work?']
const HREF = { Email: v => `mailto:${v}`, Phone: v => `tel:${v.replace(/\s/g, '')}`, Website: v => (/^https?:/.test(v) ? v : `https://${v}`) }
const CtVal = ({ c }) => { const h = HREF[c[0]]; return h ? <a href={h(c[1])} {...(c[0] === 'Website' ? { target: '_blank', rel: 'noopener' } : {})}>{c[1]}</a> : <span>{c[1]}</span> }

const Html = ({ h }) => <span dangerouslySetInnerHTML={{ __html: h }} />
const Tags = ({ a }) => <div className="chips">{a.map(t => <span key={t}>{t}</span>)}</div>
const Arrow = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
const Sun = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
const Moon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>

function Entry({ x, i = 0, reveal = true }) {
  const p = reveal ? { 'data-a': 'up', style: { '--d': `${i * 0.08}s` } } : {}
  return (
    <div className="card" {...p}>
      <div className="hd"><div><h3>{x[0]}</h3><small>{x[1]}</small></div><span className={`dt${x[3] ? ' cu' : ''}`}>{x[2]}</span></div>
      <p><Html h={x[4]} /></p>
      <Tags a={x[5]} />
    </div>
  )
}

function Stat({ s }) {
  const ref = useRef(null)
  const [n, setN] = useState(s[0])
  useEffect(() => {
    const reduce = matchMedia('(prefers-reduced-motion:reduce)').matches
    let raf = 0
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return
      io.disconnect()
      if (reduce) return
      const t0 = performance.now()
      const f = t => { const p = Math.min(1, (t - t0) / 1400); setN(Math.round(s[0] * (1 - Math.pow(1 - p, 3)))); if (p < 1) raf = requestAnimationFrame(f) }
      raf = requestAnimationFrame(f)
    }, { threshold: 0.5 })
    io.observe(ref.current)
    return () => { io.disconnect(); cancelAnimationFrame(raf) }
  }, [s])
  return <div ref={ref}><b>{n}{s[1]}</b><span>{s[2]}</span></div>
}

function ChatWidget({ C }) {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([{ role: 'assistant', content: 'Hi! I’m Llyd-Bot. Ask me about John’s skills, experience or how to reach him.' }])
  const [loading, setLoading] = useState(false)
  const bottom = useRef(null)
  const field = useRef(null)

  useEffect(() => { if (bottom.current) bottom.current.scrollTop = bottom.current.scrollHeight }, [messages, loading, open])
  useEffect(() => { if (open) field.current?.focus() }, [open])
  useEffect(() => {
    const esc = e => e.key === 'Escape' && setOpen(false)
    addEventListener('keydown', esc)
    return () => removeEventListener('keydown', esc)
  }, [])

  const offline = q => {
    const hit = buildQA(C).find(a => a[0].test(q.toLowerCase()))
    return hit ? hit[1] : 'I can answer questions about John’s skills, experience, education, projects and contact details. Try one of those.'
  }

  async function send(text = input) {
    const q = text.trim()
    if (!q || loading) return
    setInput('')
    const next = [...messages, { role: 'user', content: q }]
    setMessages(next)
    setLoading(true)
    let reply
    try {
      if (!supabase) throw new Error('no-supabase')
      const { data, error } = await supabase.functions.invoke('chat', { body: { messages: next.slice(-10) } })
      if (error) throw error
      reply = data.reply
    } catch {
      reply = offline(q) // falls back to built-in answers if the function is unavailable
    }
    setMessages(m => [...m, { role: 'assistant', content: reply }])
    setLoading(false)
  }

  return (
    <>
      <button id="fab" aria-label="Chat with Llyd-Bot" aria-expanded={open} onClick={() => setOpen(v => !v)}>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" /></svg>
      </button>
      <section id="cw" className={open ? 'open' : ''} role="dialog" aria-label="Llyd-Bot chat">
        <div className="ch">Llyd-Bot<small>Ask about John’s skills and experience</small></div>
        <div id="ms" ref={bottom} aria-live="polite">
          {messages.map((m, i) => <div key={i} className={`m ${m.role === 'user' ? 'u' : 'b'}`}>{m.content}</div>)}
          {loading && <div className="m b">…</div>}
        </div>
        {!messages.some(m => m.role === 'user') && (
          <div className="sg">{SUGGESTIONS.map(s => <button type="button" key={s} onClick={() => send(s)}>{s}</button>)}</div>
        )}
        <form id="cf" onSubmit={e => { e.preventDefault(); send() }}>
          <input ref={field} value={input} onChange={e => setInput(e.target.value)} placeholder="Ask something…" maxLength={500} aria-label="Your question" />
          <button aria-label="Send" disabled={loading || !input.trim()}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4z" /></svg></button>
        </form>
      </section>
    </>
  )
}

function ContactForm({ email }) {
  const [f, setF] = useState({ name: '', email: '', subject: '', message: '' })
  const [note, setNote] = useState('')
  const set = k => e => setF(v => ({ ...v, [k]: e.target.value }))
  const mailto = () => { location.href = `mailto:${email}?subject=${encodeURIComponent(f.subject)}&body=${encodeURIComponent(`${f.message}\n\n— ${f.name} (${f.email})`)}` }

  async function submit(e) {
    e.preventDefault()
    const v = Object.fromEntries(Object.entries(f).map(([k, x]) => [k, x.trim()]))
    if (!v.name || !v.email || !v.subject || !v.message) return setNote('Please complete all fields.')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)) return setNote('Enter a valid email address.')
    if (!supabase) { setNote('Opening your email app. Press send there to finish.'); return mailto() }
    const { error } = await supabase.from('contact_messages').insert(v)
    if (error) { setNote(`Could not send (${error.message}). Opening your email app instead.`); return mailto() }
    setNote('Message sent. John will get back to you soon.')
    setF({ name: '', email: '', subject: '', message: '' })
  }

  return (
    <form className="card" data-a="right" onSubmit={submit} noValidate>
      <h3>Send a message</h3>
      <label htmlFor="n">Your name</label><input id="n" autoComplete="name" placeholder="e.g. Maria Santos" value={f.name} onChange={set('name')} required />
      <label htmlFor="e">Email address</label><input id="e" type="email" autoComplete="email" placeholder="maria@example.com" value={f.email} onChange={set('email')} required />
      <label htmlFor="s">Subject</label><input id="s" placeholder="Internship inquiry, project idea…" value={f.subject} onChange={set('subject')} required />
      <label htmlFor="m">Message</label><textarea id="m" rows={4} placeholder="Tell me what you have in mind…" value={f.message} onChange={set('message')} required />
      <div style={{ marginTop: 20 }}><button className="btn p" type="submit">Send message <Arrow /></button></div>
      <div id="note" role="status" aria-live="polite">{note}</div>
    </form>
  )
}

export default function App() {
  const [dark, setDark] = useState(() => {
    const t = localStorage.getItem('theme')
    return t ? t === 'dark' : matchMedia('(prefers-color-scheme:dark)').matches
  })
  const [menu, setMenu] = useState(false)
  const [active, setActive] = useState('')
  const prog = useRef(null)
  const tl = useRef(null)
  const C = useContent()
  useEffect(() => { document.title = `${C.HERO.name} — ${C.HERO.role}` }, [C])

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light'
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])

  useEffect(() => {
    const R = document.documentElement
    R.classList.add('js')
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target) } }), { threshold: 0.15, rootMargin: '0px 0px -6% 0px' })
    document.querySelectorAll('[data-a]').forEach(el => io.observe(el))

    const spy = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) setActive(e.target.id) }), { rootMargin: '-45% 0px -50% 0px' })
    document.querySelectorAll('main section').forEach(s => spy.observe(s))

    let tick = false
    const upd = () => {
      tick = false
      const h = R.scrollHeight - innerHeight
      if (prog.current) prog.current.style.transform = `scaleX(${h > 0 ? scrollY / h : 0})`
      const t = tl.current
      if (t) {
        const r = t.getBoundingClientRect()
        t.style.setProperty('--p', Math.max(0, Math.min(1, (innerHeight * 0.6 - r.top) / r.height)))
        t.querySelectorAll('article').forEach(a => a.classList.toggle('in', a.getBoundingClientRect().top < innerHeight * 0.6))
      }
    }
    const onScroll = () => { if (!tick) { tick = true; requestAnimationFrame(upd) } }
    addEventListener('scroll', onScroll, { passive: true })
    const esc = e => e.key === 'Escape' && setMenu(false)
    addEventListener('keydown', esc)
    upd()
    return () => { io.disconnect(); spy.disconnect(); removeEventListener('scroll', onScroll); removeEventListener('keydown', esc) }
  }, [])

  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <header>
        <div className="wrap bar">
          <a className="logo" href="#home" aria-label={`${C.HERO.name}, home`}><i>{C.HERO.name.split(' ').map(w => w[0]).join('').slice(0, 2)}</i>{C.HERO.name.split(' ').slice(-1)[0]}</a>
          <nav id="nav" className={menu ? 'open' : ''} aria-label="Main">
            <ul>{SEC.map(s => (
              <li key={s}><a href={`#${s}`} className={active === s ? 'on' : ''} aria-current={active === s ? 'location' : undefined} onClick={() => setMenu(false)}>{s[0].toUpperCase() + s.slice(1)}</a></li>
            ))}</ul>
          </nav>
          <button className="ib" aria-label="Switch colour theme" onClick={() => setDark(d => !d)}>{dark ? <Sun /> : <Moon />}</button>
          <button className="ib" id="menu" aria-label="Open menu" aria-expanded={menu} aria-controls="nav" onClick={() => setMenu(m => !m)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
          </button>
        </div>
        <div id="prog" ref={prog} />
      </header>

      <main id="main">
        <section className="hero" id="home"><div className="wrap hg"><div className="hi">
          <span className="tag"><b />{C.HERO.badge}</span>
          <div className="sel"><h1>{C.HERO.name}</h1><s /><s /><s /><s />
            <div className="cur" aria-hidden="true"><svg width="20" height="22" viewBox="0 0 20 22" fill="currentColor"><path d="M1 1l17 8.5-7.2 2L8 19z" /></svg><span>{C.HERO.chip}</span></div>
          </div>
          <p className="role">{C.HERO.role}</p>
          <p className="lead">{C.HERO.tagline}</p>
          <div className="acts">
            <a className="btn p" href="#contact">Get in touch <Arrow /></a>
            <a className="btn" href="#projects">View my work</a>
          </div>
          <div className="stats">{C.ST.map(s => <Stat key={s[2]} s={s} />)}</div>
          </div>
          <figure className="pf">
            <img src={C.HERO.photo || `${import.meta.env.BASE_URL}images/id.webp`} alt={`Portrait of ${C.HERO.name}`} width="720" height="720" fetchPriority="high" />
          </figure>
        </div></section>

        <section className="s" id="about"><div className="wrap">
          <h2 className="h2" data-a="up">The person behind the pixels</h2>
          <div className="ab">
            <div className="card big" data-a="left">
              <h3>My story</h3>
              {C.ABOUT.map((t, i) => <p key={i}><Html h={t} /></p>)}
            </div>
            <div>
              <div className="card" data-a="right"><h3>Quick facts</h3><ul className="facts">{C.FACTS.map(f => <li key={f[0]}><span>{f[0]}</span><span>{f[1]}</span></li>)}</ul></div>
              <div className="card" data-a="right" style={{ '--d': '.12s' }}><h3>Interests</h3><Tags a={C.INT} /></div>
            </div>
          </div>
        </div></section>

        <section className="s" id="experience"><div className="wrap">
          <h2 className="h2" data-a="up">Where I’ve put the work in</h2>
          <div className="tl" ref={tl}>{C.EXP.map(x => <article key={x[0]} data-a="up"><Entry x={x} reveal={false} /></article>)}</div>
        </div></section>

        <section className="s" id="skills"><div className="wrap">
          <h2 className="h2" data-a="up">Tools I reach for</h2>
          <div className="sk">
            {C.SK.map((g, i) => (
              <div className="card" data-a="zoom" style={{ '--d': `${i * 0.1}s` }} key={g[0]}>
                <h3>{g[0]}</h3>
                {g[1].map((r, j) => (
                  <div className="row" style={{ '--d': `${0.2 + j * 0.12}s` }} key={r[0]}>
                    <span>{r[0]}</span><i style={{ '--w': `${r[1]}%` }} role="img" aria-label={`${r[1]} percent`} /><em>{r[1]}%</em>
                  </div>
                ))}
              </div>
            ))}
            <div className="card" data-a="zoom" style={{ '--d': '.3s' }}><h3>Soft skills</h3><ul className="soft">{C.SOFT.map(s => <li key={s}>{s}</li>)}</ul></div>
          </div>
        </div></section>

        <section className="s" id="education"><div className="wrap">
          <h2 className="h2" data-a="up">Education &amp; training</h2>
          <div className="ed">{C.ED.map((x, i) => <Entry key={x[0]} x={x} i={i} />)}</div>
          <h3 className="sub" data-a="up">Certifications</h3>
          <div className="cert">
            {C.CERT.map((c, i) => <div className="card" data-a="up" style={{ '--d': `${i * 0.1}s` }} key={c[0]}><strong>{c[0]}</strong><span>{c[1]}</span></div>)}
            <a className="card" href="#contact" data-a="up" style={{ '--d': '.2s', borderStyle: 'dashed' }}><strong>Add certification</strong><span>Contact to update</span></a>
          </div>
        </div></section>

        <section className="s" id="projects"><div className="wrap">
          <h2 className="h2" data-a="up">Selected projects</h2>
          <div className="pj">{C.PJ.map((p, i) => (
            <article className="card" data-a="zoom" style={{ '--d': `${(i % 2) * 0.12}s` }} key={p[0]}>
              <div className="th" style={{ '--g': `linear-gradient(135deg,${p[3]})` }} />
              <div className="pb"><h3>{p[0]}</h3><p>{p[1]}</p><Tags a={p[2]} /></div>
            </article>
          ))}</div>
        </div></section>

        <section className="s" id="contact"><div className="wrap">
          <h2 className="h2" data-a="up">Let’s build something together</h2>
          <div className="ct">
            <div className="card" data-a="left">
              <h3>Let’s connect</h3>
              <p>I’m open to internships, freelance projects and collaborations. Reach out and I’ll reply soon.</p>
              <ul>{C.CT.map(c => <li key={c[0]}><div><small>{c[0]}</small><CtVal c={c} /></div></li>)}</ul>
              <div className="soc">{C.SOCIAL.map(x => <a key={x[0]} href={x[1]} aria-label={x[0]} {...(x[1] !== '#' ? { target: '_blank', rel: 'noopener' } : {})}>{x[0]}</a>)}</div>
            </div>
            <ContactForm email={(C.CT.find(c => c[0] === 'Email') || [])[1] || ''} />
          </div>
        </div></section>
      </main>

      <footer><div className="wrap"><span>© 2026 {C.HERO.name}. Calbayog City, Samar, PH.</span><a href="#home">Back to top ↑</a></div></footer>
      <ChatWidget C={C} />
    </>
  )
}
