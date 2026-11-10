# John Lloyd Portfolio — React + Supabase

This project migrates the uploaded static portfolio into a Vite + React frontend with Supabase for contact submissions and a Supabase Edge Function for the AI chatbot.

## 1. Install and run

```bash
npm install
cp .env.example .env
npm run dev
```

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env` using your Supabase project's Project URL and anon/public key.

## 2. Set up Supabase

1. Create a Supabase project.
2. Open **SQL Editor** and run `supabase/schema.sql`.
3. Deploy the chatbot Edge Function:

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase secrets set GROQ_API_KEY=YOUR_NEW_GROQ_API_KEY
supabase functions deploy chat
```

The contact form inserts into `public.contact_messages`. Row Level Security permits public inserts only; public reads/updates/deletes are not allowed.

The chatbot calls the `chat` Edge Function. The Groq key is stored as a server-side Supabase secret and is never bundled into the browser.

## 3. Security notes

- The original `chatbot.js` contained a Groq API key in browser JavaScript. Treat that key as exposed: revoke/rotate it in Groq and use a newly generated key as the `GROQ_API_KEY` Supabase secret.
- Never put the Groq key, Supabase service-role key, or other server secrets in `VITE_*` variables.
- Before production, add rate limiting / abuse protection to the Edge Function and consider CAPTCHA on the public contact form.
- Update the portfolio text, links, and personal details in `src/legacyMarkup.js` (content is currently retained from the uploaded site).

## Stack

- React 18 + Vite
- Supabase JS client
- Supabase Postgres (contact messages)
- Supabase Edge Function (Groq-powered chatbot)
