import { useEffect, useRef, useState } from 'react'
import { legacyMarkup } from './legacyMarkup'
import { supabase } from './supabase'
import './app.css'

const suggestions = ['What are his skills?', 'Tell me about his experience', 'How can I contact him?', 'Is he open to work?']
const sectionIds = ['home', 'about', 'experience', 'skills', 'education', 'projects', 'contact']

function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([{ role: 'assistant', content: "👋 Hi! Si Llyd-Bot toh. Ask me anything about Lloyd's skills, experience, or how to get in touch!" }])
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, open])

  async function send(text = input) {
    const question = text.trim()
    if (!question || loading) return
    setInput('')
    const next = [...messages, { role: 'user', content: question }]
    setMessages(next)
    setLoading(true)
    try {
      if (!supabase) throw new Error('Add your Supabase URL and anon key to .env to enable the chatbot.')
      const { data, error } = await supabase.functions.invoke('chat', { body: { messages: next.slice(-10) } })
      if (error) throw error
      setMessages(m => [...m, { role: 'assistant', content: data.reply }])
    } catch (e) {
      setMessages(m => [...m, { role: 'error', content: `⚠️ ${e.message || 'Unable to get a reply.'}` }])
    } finally { setLoading(false) }
  }

  return <>
    <button id="chat-fab" aria-label="Open chat with Llyd-Bot" onClick={() => setOpen(v => !v)}><i className="fas fa-robot"/><span className="fab-badge"/></button>
    <section id="chat-window" className={open ? 'open' : ''} role="dialog" aria-label="Llyd-Bot chat">
      <div className="chat-header"><div className="avatar"><i className="fas fa-robot"/></div><div className="info"><strong>Llyd-Bot</strong><span><span className="status-dot"/>Ask about Lloyd</span></div><button id="chat-close" onClick={() => setOpen(false)} aria-label="Close chat"><i className="fas fa-times"/></button></div>
      <div id="chat-messages">{messages.map((m,i) => <div key={i} className={`msg ${m.role === 'user' ? 'user' : m.role === 'error' ? 'error' : 'bot'}`}>{m.content}</div>)}{loading && <div className="msg bot typing-indicator"><span/><span/><span/></div>}<div ref={bottomRef}/></div>
      {!messages.some(m => m.role === 'user') && <div className="suggestions">{suggestions.map(s => <button className="suggestion-btn" key={s} onClick={() => send(s)}>{s}</button>)}</div>}
      <form className="chat-input-bar" onSubmit={e => { e.preventDefault(); send() }}><textarea id="chat-input" rows="1" maxLength="500" placeholder="Ask something…" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if(e.key === 'Enter' && !e.shiftKey){e.preventDefault();send()} }}/><button id="chat-send" aria-label="Send message" disabled={loading || !input.trim()}><i className="fas fa-paper-plane"/></button></form>
    </section>
  </>
}

export default function App() {
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark')
  const [formNote, setFormNote] = useState('')

  useEffect(() => {
    document.body.classList.toggle('dark', dark)
    document.querySelectorAll('#themeIcon').forEach(icon => {
      icon.classList.toggle('fa-sun', dark)
      icon.classList.toggle('fa-moon', !dark)
    })
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])

  useEffect(() => {
    const root = document.getElementById('legacy-root')
    const navLinks = [...root.querySelectorAll('.nav-item')]
    const scrollToSection = (id) => {
      const target = root.querySelector(`#${id}`)
      if (!target) return
      target.scrollIntoView({ behavior: 'smooth', block: 'start' })
      window.history.replaceState(null, '', `#${id}`)
    }

    const click = (e) => {
      const nav = e.target.closest('.nav-item')
      if (nav) {
        e.preventDefault()
        scrollToSection(nav.dataset.page)
        return
      }
      const inline = e.target.closest('[onclick*="navigateTo"]')
      if (inline) {
        e.preventDefault()
        const match = inline.getAttribute('onclick').match(/navigateTo\('([^']+)'\)/)
        if (match) scrollToSection(match[1])
      }
      if (e.target.closest('#themeToggle')) setDark(v => !v)
      if (e.target.closest('#sendMsgBtn')) submitContact()
    }

    async function submitContact() {
      const name = root.querySelector('#contact-name')?.value.trim()
      const email = root.querySelector('#contact-email')?.value.trim()
      const subject = root.querySelector('#contact-subject')?.value.trim()
      const message = root.querySelector('#contact-message')?.value.trim()
      if (!name || !email || !subject || !message) { setFormNote('Please complete all fields.'); return }
      if (!supabase) { setFormNote('Configure Supabase in .env before sending messages.'); return }
      const { error } = await supabase.from('contact_messages').insert({ name, email, subject, message })
      setFormNote(error ? `Could not send: ${error.message}` : '✅ Message sent! John will get back to you soon.')
      if (!error) ['#contact-name', '#contact-email', '#contact-subject', '#contact-message'].forEach(selector => {
        const field = root.querySelector(selector)
        if (field) field.value = ''
      })
    }

    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter(entry => entry.isIntersecting).sort((a,b) => b.intersectionRatio - a.intersectionRatio)[0]
      if (!visible) return
      navLinks.forEach(link => {
        const active = link.dataset.page === visible.target.id
        link.classList.toggle('active', active)
        if (active) link.setAttribute('aria-current', 'location')
        else link.removeAttribute('aria-current')
      })
    }, { rootMargin: '-20% 0px -60% 0px', threshold: [0, 0.1, 0.25, 0.5] })

    sectionIds.forEach(id => {
      const section = root.querySelector(`#${id}`)
      if (section) observer.observe(section)
    })
    root.addEventListener('click', click)

    const hash = window.location.hash.slice(1)
    if (sectionIds.includes(hash)) {
      requestAnimationFrame(() => root.querySelector(`#${hash}`)?.scrollIntoView())
    }

    return () => {
      root.removeEventListener('click', click)
      observer.disconnect()
    }
  }, [])

  useEffect(() => {
    const note = document.getElementById('formNote')
    if (note) note.textContent = formNote
  }, [formNote])

  return <><div id="legacy-root" dangerouslySetInnerHTML={{ __html: legacyMarkup }} /><ChatWidget /></>
}
