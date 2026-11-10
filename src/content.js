import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import * as D from './data'

export const KEYS = ['HERO', 'ABOUT', 'FACTS', 'INT', 'EXP', 'SK', 'SOFT', 'ED', 'CERT', 'PJ', 'CT', 'ST', 'SOCIAL']
export const DEFAULTS = Object.fromEntries(KEYS.map(k => [k, D[k]]))
export const merge = d => ({ ...DEFAULTS, ...(d || {}), HERO: { ...DEFAULTS.HERO, ...(d?.HERO || {}) } })

// Public site: show built-in content instantly, then swap in what you saved from the dashboard.
export function useContent() {
  const [c, setC] = useState(DEFAULTS)
  useEffect(() => {
    if (!supabase) return
    supabase.from('portfolio_content').select('data').eq('id', 1).maybeSingle().then(({ data }) => { if (data?.data) setC(merge(data.data)) })
  }, [])
  return c
}

// Offline chatbot answers, built from the current content.
export function buildQA(C) {
  const get = k => (C.CT.find(c => c[0] === k) || [])[1] || ''
  const first = C.HERO.name.split(' ')[0]
  return [
    [/skill|tech|stack|tool/, `${first}’s skills include ${C.SK.flatMap(g => g[1].map(r => r[0])).join(', ')}.`],
    [/experience|work|job|intern/, C.EXP.map(x => `${x[0]} at ${x[1]} (${x[2]})`).join('; ') + '.'],
    [/contact|reach|email|phone|touch/, `Email ${get('Email')}, call ${get('Phone')}, or use the contact form on this page.`],
    [/open|available|hire|opportun/, `${C.HERO.badge}. Use the contact form to get in touch.`],
    [/educ|school|study|universit|course|degree/, C.ED.map(x => `${x[0]}, ${x[1]} (${x[2]})`).join('; ') + '.'],
    [/project|portfolio|built/, `Projects: ${C.PJ.map(p => p[0]).join(', ')}.`],
    [/where|locat|live|from/, `${first} is based at ${get('Location')}.`],
  ]
}
