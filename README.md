# Job Hunt Cockpit

A focused, AI-augmented job-search workflow built as a single-page React app. Originally prototyped as a [Claude artifact](https://www.anthropic.com/news/claude-artifacts) during my own job hunt, then ported to a standalone Vite project.

Four tabs, one workflow:

| Tab | What it does |
| --- | --- |
| **Search Hub** | Pre-built queries across ClearanceJobs, ClearedJobs.net, LinkedIn, Indeed, and USAJOBS, with 30-day date filters where the boards support URL-based filtering. Plus direct career-page links to federal contractors with deep cleared-networking pipelines (Leidos, Booz Allen, CACI, SAIC, GDIT, ManTech, Peraton, WWT, et al.). |
| **JD Fit Analyzer** | Paste a job description, get back a fit score (0–100), specific strengths mapped to the embedded resume, gaps to address, keywords to mirror, talking points to surface, and red flags about the role itself. |
| **Tailor** | Generate a tailored cover letter or rewrite the full resume to mirror a JD's language, preserving all real employer / date / accomplishment data. Outputs downloadable HTML (opens cleanly in Word for export to .docx), plain text (ATS-friendly), and a print-to-PDF flow. |
| **Tracker** | Persistent application pipeline with status (Applied → Phone Screen → Interview → Offer → Accepted / Rejected / Withdrawn / Ghosted), inline notes, follow-up dates with overdue/today highlighting, and rollup stats. |

## Stack

- React 18 + Vite
- Anthropic Claude API (`claude-sonnet-4-20250514`) for the AI features
- Browser-native storage — `window.storage` in the Claude artifact env, falling back to `localStorage` standalone
- All styling in inline `<style>` blocks (no Tailwind, no CSS framework) — kept dependency-free intentionally

Single self-contained component file, ~1,800 LOC. The decision to keep it as one file is deliberate: the artifact origin meant single-file deliverable, and for a tool of this scope, splitting across a dozen modules would add navigation overhead without architectural benefit. Internal section dividers mark each logical area (constants, storage, API helpers, format converters, components, root).

## Architecture note: the AI calls

The app calls `https://api.anthropic.com/v1/messages` directly from the browser. Inside the Claude artifact environment, the sandbox injects credentials transparently — no API key in the client code. To deploy this standalone with full AI functionality, you'd front the API call with a small server-side proxy (a Next.js API route, single Express endpoint, or Cloudflare Worker) that holds the key and forwards requests. The Search and Tracker tabs work fully without any backend.

This is intentional. Shipping client-side API keys is a footgun — they leak via dev tools, get scraped from bundles, and there's no way to rotate per-deployment. The artifact pattern (run-time credential injection) is a clean separation that the proxy approach preserves.

## Running locally

```bash
npm install
npm run dev
```

- Search and Tracker work immediately
- Analyze / Tailor will fail without an API proxy (see above)

## Repo notes

- Personal contact info (phone, email, exact address) is redacted from the embedded resume. The professional content — employers, dates, roles, accomplishments — is preserved for demonstration purposes.
- The persistent storage layer is the same code path for both Claude-artifact and standalone deployment; `window.storage` is checked at call time, with `localStorage` as the fallback.

## Why I built it

I lost my job and needed to apply to a lot of cleared network engineering / architect roles quickly. Spray-and-pray with a generic resume produces a worse hit rate than fewer, well-tailored applications, but tailoring 30+ applications by hand is a time sink. The cockpit collapses that loop: paste the JD, get a fit read, generate the tailored materials, log the application, move to the next one.

## License

MIT
