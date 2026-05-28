/**
 * Job Hunt Cockpit
 * ────────────────
 * Single-page React app for an AI-augmented job search workflow.
 * Originally built as a Claude artifact during my own job hunt; ported here
 * for showcase. Four tabs:
 *
 *   - Search Hub      ── pre-built queries across cleared/federal job boards
 *   - JD Fit Analyzer ── score a JD against the embedded resume
 *   - Tailor          ── rewrite cover letter / full resume to a specific JD
 *   - Tracker         ── application pipeline with status, notes, follow-ups
 *
 * Notes:
 *   • AI features (Analyze, Tailor) call api.anthropic.com directly. In the
 *     Claude artifact env, credentials are injected transparently. For a
 *     standalone deploy, you'd front this with a small API proxy
 *     (Next.js route, Express endpoint, etc.) that holds the key server-side.
 *   • Search + Tracker work without any backend.
 *   • Personal contact info (phone/email) is redacted in this public repo.
 */

import React, { useState, useEffect, useRef } from "react";

// ─────────────────────────────────────────────────────────────
// CANDIDATE PROFILE — embedded so every AI call has context
// ─────────────────────────────────────────────────────────────

const RESUME_TEXT = `JOSHUA M. LING
Washington, DC | [phone redacted in public repo] | [email redacted in public repo]
Active TS/SCI Clearance | CCNA | Security+CE | Cisco ENCOR Specialist | A+

PROFESSIONAL SUMMARY
Senior Network Engineer with 8+ years of progressive IT infrastructure experience, including 6 years of USAF service. Proven track record supporting classified and unclassified enterprise environments for DHS, Department of State, and DoD agencies. Deep expertise in Aruba SDN architectures, multi-vendor routing and switching (Cisco, Arista, Juniper), BGP/OSPF, SD-WAN, and network security. Veteran with active TS/SCI clearance — ready to contribute on Day 1.

EXPERIENCE

Senior Consultant — Information Technology | Aqua IT | Washington, DC | Aug 2025 – Present
- Engineered enterprise transport network for DHS HQ and U.S. Coast Guard across classified and unclassified multi-tenant environments.
- Managed Aruba SDN spine-and-leaf (CX 6300M, 8K, 10K), improving network resiliency and operational performance.
- Led modernization from legacy Cisco to Aruba, executing configuration and migration with minimal disruption.
- Leveraged Aruba Fabric Composer and NetEdit to automate configuration management across enterprise.
- Maintained VSX pair configurations and BGP peering in large-scale routing environments.
- Led migration from legacy RADIUS to Cisco ISE, enhancing authentication and policy enforcement.
- Supported Secret and TS network environments with full compliance.

Senior Network Engineer | MetroStar | Washington, DC | Dec 2024 – Aug 2025
- Led deployment of ClassNET and OpenNET networks for the Secretary of State at the UN General Assembly.
- Directed ExecTech network services for Department of State VIP customers under S/ES program.
- Architected solutions integrating BGP, OSPF, MPLS, and VPN across multi-site environments.
- Automated network performance reporting, providing real-time visibility into system metrics.

Network Architect | Nakupuna Companies | Arlington, VA | Jun 2024 – Dec 2024
- Created and standardized network architecture artifacts aligned to DoD and Federal Architecture frameworks.
- Conducted legacy environment discovery to inform SD-WAN architecture transition.
- Developed long-term strategic roadmaps for sub-enterprise network architectures.
- Documented secure WAN designs including underlay, overlay, and COI transport.
- Collaborated with IA teams to deliver accreditation artifacts.

Field Deployment Engineer | PUNCH Cyber Analytics Group | Silver Spring, MD (Remote) | Dec 2023 – Jun 2024
- Deployed enterprise network monitoring using Docker on Ubuntu Linux.
- Installed physical network taps across multiple data centers for real-time traffic monitoring.
- Configured Garland Technology aggregators for traffic capture.
- Built Elasticsearch queries and Kibana visualizations for security analytics.
- Led integration, testing, and deployment for CND solutions.

Network Engineer | GDIT | The Pentagon, Washington, DC | Jul 2023 – Dec 2023
- Designed and built communications networks at The Pentagon — routers, switches, firewalls for LAN/WAN.
- Configured multi-vendor infrastructure: Aruba, Arista, Cisco, Juniper.
- Used Wireshark for traffic capture and Python for automation.

Network Engineer (24/7/365) | USAF — AFMC Business & Enterprise Systems | Gunter AFS, AL | Aug 2017 – Aug 2023
- 6 years as Cyber Infrastructure Technician supporting a $5M+ classified network and $35M+ IT infrastructure.
- Configured STP, VLAN, OSPF, BGP across enterprise environments.
- Implemented firewalls, IDS/IPS, VPNs; monitored with Wireshark, Nagios, SolarWinds.
- Maintained Cisco Unified Call Manager, SIP trunking, VoIP gateways.
- Led base-wide upgrade chartering 761 application interface links across 51 PMOs; methodology adopted by AFMC.
- Led SIPR user creation team. Honorable discharge after 6 years.

EDUCATION & CERTIFICATIONS
BS, Network Engineering & Security — Western Governors University (Expected Dec 2026)
CompTIA Security+CE | Cisco CCNA | Cisco Certified Specialist — ENCOR | CompTIA A+`;

const PROFILE = {
  name: "Joshua Ling",
  clearance: "TS/SCI",
  location: "Washington, DC",
  targetRoles: ["Senior Network Engineer", "Network Architect"],
  workStyle: "Remote / Hybrid / Onsite",
};

// ─────────────────────────────────────────────────────────────
// JOB SEARCH HUB — pre-built queries
// ─────────────────────────────────────────────────────────────

// Links carry an optional `filter` tag — shown as a small badge.
// "30d" = pre-filtered by URL params to last 30 days.
// "sort:new" = lands on date-sorted results but you may need to apply the in-page
//   "Posted Within" filter to tighten further (these sites are SPAs that don't
//   expose date filters reliably through the URL).
const SEARCH_BOARDS = [
  {
    name: "ClearanceJobs",
    tag: "PRIMARY",
    desc: "Deepest pool of cleared roles. Default sort is newest first — apply the in-page \"Posted Within: 30 days\" filter once you land. Heads up: this site is known to repost old listings as new, so verify dates on the actual job page.",
    links: [
      { label: "Senior Network Engineer", url: "https://www.clearancejobs.com/jobs?keywords=senior+network+engineer", filter: "sort:new" },
      { label: "Network Architect", url: "https://www.clearancejobs.com/jobs?keywords=network+architect", filter: "sort:new" },
      { label: "Aruba / SDN cleared", url: "https://www.clearancejobs.com/jobs?keywords=aruba+sdn", filter: "sort:new" },
      { label: "Remote — cleared", url: "https://www.clearancejobs.com/jobs?keywords=senior+network+engineer&remote=true", filter: "sort:new" },
    ],
  },
  {
    name: "ClearedJobs.net",
    tag: "PRIMARY",
    desc: "Second cleared-only board. Click the \"Date\" sort header on landing to surface freshest postings — date filter isn't URL-addressable.",
    links: [
      { label: "Senior Network Engineer", url: "https://www.clearedjobs.net/jobs/?q=senior+network+engineer", filter: "sort:new" },
      { label: "Network Engineer", url: "https://www.clearedjobs.net/jobs/?q=network+engineer", filter: "sort:new" },
      { label: "Network Architect", url: "https://www.clearedjobs.net/jobs/?q=network+architect", filter: "sort:new" },
    ],
  },
  {
    name: "LinkedIn",
    tag: "BROAD",
    desc: "Pre-filtered to past 30 days. Better for warm intros via past coworkers than easy-apply spam.",
    links: [
      { label: "Sr. Net Eng + TS/SCI, DC", url: "https://www.linkedin.com/jobs/search/?keywords=Senior%20Network%20Engineer%20TS%2FSCI&location=Washington%2C%20District%20of%20Columbia&f_TPR=r2592000", filter: "30d" },
      { label: "Network Architect + TS/SCI", url: "https://www.linkedin.com/jobs/search/?keywords=Network%20Architect%20TS%2FSCI&f_TPR=r2592000", filter: "30d" },
      { label: "Remote — TS/SCI", url: "https://www.linkedin.com/jobs/search/?keywords=Network%20Engineer%20TS%2FSCI&f_WT=2&f_TPR=r2592000", filter: "30d" },
    ],
  },
  {
    name: "Indeed",
    tag: "BROAD",
    desc: "Pre-filtered to past 30 days. Catches roles the cleared boards miss.",
    links: [
      { label: "TS/SCI Senior Network Eng", url: "https://www.indeed.com/jobs?q=%22TS%2FSCI%22+senior+network+engineer&l=Washington%2C+DC&fromage=30", filter: "30d" },
      { label: "TS/SCI Network Architect", url: "https://www.indeed.com/jobs?q=%22TS%2FSCI%22+network+architect&l=Remote&fromage=30", filter: "30d" },
    ],
  },
  {
    name: "USAJOBS",
    tag: "FEDERAL",
    desc: "Direct federal positions, sorted newest first. Slower hiring process but stable.",
    links: [
      { label: "Network Engineer (newest)", url: "https://www.usajobs.gov/Search/Results?k=network%20engineer&hp=public&s=PostingStartDate&sd=desc", filter: "sort:new" },
    ],
  },
];

const TARGET_COMPANIES = [
  { name: "Leidos", url: "https://careers.leidos.com/", note: "Massive cleared footprint." },
  { name: "Booz Allen Hamilton", url: "https://careers.boozallen.com/", note: "Heavy IC/DoD presence." },
  { name: "CACI", url: "https://careers.caci.com/", note: "Strong networking groups." },
  { name: "SAIC", url: "https://jobs.saic.com/", note: "DoD + civilian agencies." },
  { name: "GDIT", url: "https://www.gdit.com/careers/", note: "You worked here — leverage old contacts." },
  { name: "ManTech", url: "https://careers.mantech.com/", note: "Cyber + network focus." },
  { name: "Peraton", url: "https://careers.peraton.com/", note: "Big networking practice." },
  { name: "MetroStar", url: "https://www.metrostar.com/careers/", note: "Recent employer — boomerang potential." },
  { name: "Nakupuna", url: "https://nakupuna.com/careers/", note: "Recent employer — same." },
  { name: "World Wide Tech", url: "https://www.wwt.com/careers", note: "Network-centric, lots of Cisco/Aruba." },
  { name: "Lockheed Martin", url: "https://www.lockheedmartinjobs.com/", note: "Large cleared programs." },
  { name: "Northrop Grumman", url: "https://www.northropgrumman.com/jobs/", note: "Cyber + networks." },
];

// ─────────────────────────────────────────────────────────────
// STORAGE — persistent application tracker
// ─────────────────────────────────────────────────────────────

const STORAGE_KEY = "applications:list";

// Storage layer: this app was originally built as a Claude artifact, where
// `window.storage` is provided by the sandbox. Outside that environment we
// fall back to localStorage so the tracker still persists when cloned.
const storage = {
  async get(key) {
    if (typeof window !== "undefined" && window.storage) {
      return window.storage.get(key);
    }
    if (typeof localStorage === "undefined") return null;
    const v = localStorage.getItem(key);
    return v == null ? null : { key, value: v };
  },
  async set(key, value) {
    if (typeof window !== "undefined" && window.storage) {
      return window.storage.set(key, value);
    }
    if (typeof localStorage === "undefined") return null;
    localStorage.setItem(key, value);
    return { key, value };
  },
};

async function loadApplications() {
  try {
    const r = await storage.get(STORAGE_KEY);
    return r ? JSON.parse(r.value) : [];
  } catch {
    return [];
  }
}

async function saveApplications(apps) {
  try {
    await storage.set(STORAGE_KEY, JSON.stringify(apps));
    return true;
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────
// CLAUDE API — analysis + generation
// ─────────────────────────────────────────────────────────────

async function callClaude(prompt, maxTokens = 2000) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  const data = await res.json();
  return data.content.filter((b) => b.type === "text").map((b) => b.text).join("\n");
}

function stripFences(s) {
  return s.replace(/```json\s*/g, "").replace(/```\s*$/g, "").trim();
}

async function analyzeFit(jd) {
  const prompt = `You are analyzing a job description for fit with this candidate.

CANDIDATE RESUME:
${RESUME_TEXT}

CANDIDATE CONTEXT:
- Active TS/SCI clearance
- Targeting Senior Network Engineer / Network Architect roles
- Open to remote, hybrid, or onsite
- Based in Washington, DC

JOB DESCRIPTION:
${jd}

Respond with ONLY a valid JSON object (no markdown fences, no preamble, no explanation):
{
  "fit_score": <integer 0-100>,
  "verdict": "<one of: Strong Match, Good Match, Stretch, Weak Match>",
  "summary": "<one-sentence overall assessment>",
  "strengths": ["<3-5 bullets mapping his experience to JD requirements>"],
  "gaps": ["<2-4 bullets on weak/missing areas, or empty array>"],
  "keywords_to_emphasize": ["<5-10 specific JD terms to mirror in cover letter/resume>"],
  "talking_points": ["<3-5 specific accomplishments to surface in this application>"],
  "red_flags": ["<0-3 concerns about the role itself — e.g. clearance mismatch, location, comp signals>"]
}`;
  const raw = await callClaude(prompt, 2000);
  return JSON.parse(stripFences(raw));
}

async function generateCoverLetter(jd, company, role) {
  const prompt = `Write a tailored cover letter for this candidate.

CANDIDATE RESUME:
${RESUME_TEXT}

COMPANY: ${company || "(unspecified)"}
ROLE: ${role || "(unspecified)"}

JOB DESCRIPTION:
${jd}

Guidelines:
- 3 paragraphs, 250-350 words total
- Open with a specific hook tied to the role — NOT "I am writing to apply for..."
- Middle: 2-3 concrete accomplishments from the resume that match the JD's specific requirements (use the JD's own terminology)
- Close: mention TS/SCI clearance naturally, state availability, invite a conversation
- No clichés ("passionate", "perfect fit", "team player")
- Sign off "Joshua Ling"

Respond with just the letter text, no preamble or commentary.`;
  return callClaude(prompt, 1500);
}

async function tailorFullResume(jd) {
  const prompt = `Tailor this candidate's full resume to the specific job description. Preserve all factual content — do not fabricate experience, dates, employers, or accomplishments. Rewrite bullets to mirror the JD's terminology and emphasize matching skills.

CANDIDATE RESUME:
${RESUME_TEXT}

JOB DESCRIPTION:
${jd}

Rules:
- Keep all employers, dates, titles, and locations EXACTLY as they appear in the source resume.
- You may rephrase, reorder, or merge bullets within a single role, but every claim must trace back to the source.
- Do not invent new bullets that aren't supported by the source resume.
- The professional summary may be rewritten to align with the JD's priorities.
- Mirror specific keywords from the JD where his experience genuinely matches (e.g. if the JD says "Aruba CX" and he has Aruba CX experience, use that exact phrasing).
- 4-7 bullets per role. Concise, achievement-focused. Start each with a strong action verb.
- Keep numbers/metrics that exist in the source ($35M, 761 links, 6 years, etc.).

Respond with ONLY a valid JSON object (no markdown fences, no preamble):
{
  "header": {
    "name": "Joshua M. Ling",
    "location": "Washington, DC",
    "phone": "[redacted]",
    "email": "[redacted]",
    "credentials": "Active TS/SCI Clearance | CCNA | Security+CE | Cisco ENCOR Specialist | A+"
  },
  "summary": "<3-5 sentence professional summary tailored to the JD>",
  "experience": [
    {
      "title": "<exact title from source>",
      "company": "<exact company from source>",
      "location": "<exact location from source>",
      "dates": "<exact dates from source>",
      "bullets": ["<tailored bullet>", "..."]
    }
  ],
  "education": "BS, Network Engineering & Security — Western Governors University (Expected Dec 2026)",
  "certifications": "CompTIA Security+CE | Cisco CCNA | Cisco Certified Specialist — ENCOR | CompTIA A+",
  "changes_summary": ["<bullet on what was emphasized>", "<bullet on what was de-emphasized or reframed>", "<one more if relevant>"]
}`;
  const raw = await callClaude(prompt, 4000);
  return JSON.parse(stripFences(raw));
}

// ─────────────────────────────────────────────────────────────
// RESUME FORMAT CONVERTERS + DOWNLOAD HELPER
// ─────────────────────────────────────────────────────────────

function resumeToText(r) {
  let out = `${r.header.name}\n`;
  out += `${r.header.location} | ${r.header.phone} | ${r.header.email}\n`;
  out += `${r.header.credentials}\n\n`;
  out += `PROFESSIONAL SUMMARY\n${r.summary}\n\n`;
  out += `EXPERIENCE\n\n`;
  for (const j of r.experience) {
    out += `${j.title}\n${j.company} — ${j.location} | ${j.dates}\n`;
    for (const b of j.bullets) out += `- ${b}\n`;
    out += `\n`;
  }
  out += `EDUCATION\n${r.education}\n\n`;
  out += `CERTIFICATIONS\n${r.certifications}\n`;
  return out;
}

function escapeHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function resumeToHTML(r) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(r.header.name)} — Resume</title>
<style>
  @page { margin: 0.6in; }
  body {
    font-family: 'Calibri', 'Helvetica Neue', Arial, sans-serif;
    color: #1a1a1a;
    line-height: 1.42;
    font-size: 11pt;
    max-width: 7.5in;
    margin: 0 auto;
    padding: 0.5in;
    background: #fff;
  }
  h1 { font-size: 22pt; margin: 0 0 4px 0; letter-spacing: 0.5px; font-weight: 700; }
  .contact { color: #333; font-size: 10pt; margin-bottom: 3px; }
  .creds { color: #1a1a1a; font-size: 10pt; font-weight: 600; margin-bottom: 16px; }
  h2 {
    font-size: 11.5pt;
    text-transform: uppercase;
    letter-spacing: 1.2px;
    border-bottom: 1.2px solid #1a1a1a;
    padding-bottom: 3px;
    margin: 14px 0 8px;
    font-weight: 700;
  }
  p.summary { margin: 0 0 4px 0; }
  .job { margin-bottom: 10px; }
  .job-line {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 1px;
  }
  .job-title { font-weight: 700; font-size: 11pt; }
  .job-dates { color: #444; font-size: 10pt; font-style: italic; }
  .job-meta { color: #444; font-size: 10pt; font-style: italic; margin-bottom: 3px; }
  ul { margin: 3px 0 8px; padding-left: 18px; }
  li { margin-bottom: 2px; }
  @media print { body { padding: 0; max-width: none; } }
</style>
</head>
<body>
<h1>${escapeHtml(r.header.name)}</h1>
<div class="contact">${escapeHtml(r.header.location)} | ${escapeHtml(r.header.phone)} | ${escapeHtml(r.header.email)}</div>
<div class="creds">${escapeHtml(r.header.credentials)}</div>

<h2>Professional Summary</h2>
<p class="summary">${escapeHtml(r.summary)}</p>

<h2>Experience</h2>
${r.experience.map(j => `<div class="job">
  <div class="job-line">
    <span class="job-title">${escapeHtml(j.title)} — ${escapeHtml(j.company)}</span>
    <span class="job-dates">${escapeHtml(j.dates)}</span>
  </div>
  <div class="job-meta">${escapeHtml(j.location)}</div>
  <ul>${j.bullets.map(b => `<li>${escapeHtml(b)}</li>`).join("")}</ul>
</div>`).join("\n")}

<h2>Education</h2>
<p>${escapeHtml(r.education)}</p>

<h2>Certifications</h2>
<p>${escapeHtml(r.certifications)}</p>
</body>
</html>`;
}

function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

function slugify(s) {
  return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "company";
}

// ─────────────────────────────────────────────────────────────
// UI — DESIGN TOKENS
// ─────────────────────────────────────────────────────────────

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&family=Inter+Tight:wght@400;500;600&display=swap');

  :root {
    --bg-base: #0a0d12;
    --bg-surface: #131820;
    --bg-surface-2: #1a1f29;
    --bg-elevated: #232a35;
    --border: #232a35;
    --border-strong: #2f3845;
    --text-primary: #ebebe5;
    --text-secondary: #8a93a3;
    --text-muted: #5a6373;
    --accent: #ffb648;
    --accent-hover: #ffc46d;
    --accent-dim: #6b4a1d;
    --success: #7ee787;
    --warning: #ffa657;
    --danger: #ff7b72;
    --info: #79c0ff;
    --font-display: 'Instrument Sans', system-ui, sans-serif;
    --font-body: 'Inter Tight', system-ui, sans-serif;
    --font-mono: 'JetBrains Mono', monospace;
  }

  .jhc { 
    background: var(--bg-base); 
    color: var(--text-primary); 
    font-family: var(--font-body);
    min-height: 100vh;
    font-size: 14px;
    line-height: 1.5;
  }

  .jhc * { box-sizing: border-box; }

  .jhc .mono { font-family: var(--font-mono); }
  .jhc .display { font-family: var(--font-display); }

  /* Header */
  .jhc-header {
    border-bottom: 1px solid var(--border);
    background: linear-gradient(180deg, var(--bg-surface) 0%, var(--bg-base) 100%);
    padding: 20px 32px 0;
  }
  .jhc-header-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 24px;
  }
  .jhc-brand {
    display: flex;
    align-items: baseline;
    gap: 16px;
  }
  .jhc-brand-name {
    font-family: var(--font-display);
    font-weight: 700;
    font-size: 22px;
    letter-spacing: -0.02em;
  }
  .jhc-brand-tag {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.12em;
  }
  .jhc-badge {
    font-family: var(--font-mono);
    font-size: 11px;
    padding: 4px 10px;
    border: 1px solid var(--accent-dim);
    color: var(--accent);
    border-radius: 2px;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }
  .jhc-meta {
    display: flex;
    gap: 24px;
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  .jhc-meta span strong { color: var(--text-secondary); font-weight: 500; }

  .jhc-tabs {
    display: flex;
    gap: 4px;
  }
  .jhc-tab {
    background: none;
    border: none;
    color: var(--text-muted);
    font-family: var(--font-mono);
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    padding: 12px 18px;
    cursor: pointer;
    border-bottom: 2px solid transparent;
    transition: color 0.15s, border-color 0.15s;
  }
  .jhc-tab:hover { color: var(--text-secondary); }
  .jhc-tab.active {
    color: var(--accent);
    border-bottom-color: var(--accent);
  }
  .jhc-tab-count {
    margin-left: 6px;
    background: var(--bg-elevated);
    padding: 1px 6px;
    border-radius: 2px;
    font-size: 10px;
  }

  /* Main content */
  .jhc-main { padding: 32px; max-width: 1400px; margin: 0 auto; }
  .jhc-section-head { margin-bottom: 24px; }
  .jhc-section-title {
    font-family: var(--font-display);
    font-size: 28px;
    font-weight: 600;
    letter-spacing: -0.02em;
    margin: 0 0 6px 0;
  }
  .jhc-section-sub {
    color: var(--text-secondary);
    font-size: 14px;
  }

  /* Cards & panels */
  .jhc-card {
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 20px;
  }
  .jhc-card-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
  }
  .jhc-card-title {
    font-family: var(--font-display);
    font-weight: 600;
    font-size: 16px;
  }
  .jhc-card-tag {
    font-family: var(--font-mono);
    font-size: 10px;
    padding: 3px 8px;
    border-radius: 2px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }
  .jhc-card-tag.primary { background: var(--accent-dim); color: var(--accent); }
  .jhc-card-tag.broad { background: var(--bg-elevated); color: var(--text-secondary); }
  .jhc-card-tag.federal { background: rgba(121, 192, 255, 0.15); color: var(--info); }

  .jhc-card-desc {
    color: var(--text-secondary);
    font-size: 13px;
    margin-bottom: 16px;
  }

  .jhc-link-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 0;
    border-top: 1px solid var(--border);
    text-decoration: none;
    color: var(--text-primary);
    transition: color 0.15s;
  }
  .jhc-link-row:hover { color: var(--accent); }
  .jhc-link-row:hover .jhc-link-arrow { transform: translateX(3px); color: var(--accent); }
  .jhc-link-arrow {
    color: var(--text-muted);
    font-family: var(--font-mono);
    transition: transform 0.15s, color 0.15s;
  }
  .jhc-link-label {
    display: inline-flex;
    align-items: center;
    gap: 10px;
  }
  .jhc-link-filter {
    font-family: var(--font-mono);
    font-size: 10px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    padding: 2px 6px;
    border-radius: 2px;
    background: var(--bg-elevated);
    color: var(--text-muted);
    border: 1px solid var(--border);
  }
  .jhc-link-filter.is-strong {
    background: var(--accent-dim);
    color: var(--accent);
    border-color: transparent;
  }

  /* Grids */
  .jhc-grid-3 {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
    gap: 16px;
  }
  .jhc-grid-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
  }
  @media (max-width: 900px) {
    .jhc-grid-2 { grid-template-columns: 1fr; }
  }

  /* Company chips */
  .jhc-chip-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 10px;
  }
  .jhc-chip {
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: 3px;
    padding: 12px 14px;
    text-decoration: none;
    color: var(--text-primary);
    transition: all 0.15s;
    display: block;
  }
  .jhc-chip:hover {
    border-color: var(--accent);
    background: var(--bg-surface-2);
  }
  .jhc-chip-name {
    font-weight: 600;
    font-size: 14px;
    margin-bottom: 3px;
  }
  .jhc-chip-note {
    color: var(--text-muted);
    font-size: 11px;
    font-family: var(--font-mono);
  }

  /* Form elements */
  .jhc-textarea, .jhc-input {
    width: 100%;
    background: var(--bg-surface);
    border: 1px solid var(--border-strong);
    border-radius: 3px;
    color: var(--text-primary);
    font-family: var(--font-body);
    font-size: 14px;
    padding: 12px;
    resize: vertical;
  }
  .jhc-textarea:focus, .jhc-input:focus {
    outline: none;
    border-color: var(--accent);
  }
  .jhc-textarea { min-height: 220px; font-family: var(--font-mono); font-size: 12px; line-height: 1.6; }
  .jhc-label {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    display: block;
    margin-bottom: 8px;
  }

  /* Buttons */
  .jhc-btn {
    font-family: var(--font-mono);
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    padding: 10px 18px;
    border-radius: 3px;
    border: 1px solid transparent;
    cursor: pointer;
    transition: all 0.15s;
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }
  .jhc-btn-primary {
    background: var(--accent);
    color: #1a1208;
    font-weight: 600;
  }
  .jhc-btn-primary:hover { background: var(--accent-hover); }
  .jhc-btn-primary:disabled { background: var(--bg-elevated); color: var(--text-muted); cursor: not-allowed; }
  .jhc-btn-ghost {
    background: transparent;
    color: var(--text-secondary);
    border-color: var(--border-strong);
  }
  .jhc-btn-ghost:hover { color: var(--text-primary); border-color: var(--text-muted); }
  .jhc-btn-danger { color: var(--danger); border-color: transparent; background: transparent; padding: 6px 8px; font-size: 11px; }
  .jhc-btn-danger:hover { background: rgba(255,123,114,0.1); }

  /* Analysis result */
  .jhc-score-card {
    background: linear-gradient(135deg, var(--bg-surface) 0%, var(--bg-surface-2) 100%);
    border: 1px solid var(--border-strong);
    padding: 24px;
    border-radius: 4px;
  }
  .jhc-score-head {
    display: flex;
    align-items: flex-end;
    gap: 24px;
    margin-bottom: 16px;
  }
  .jhc-score-num {
    font-family: var(--font-display);
    font-size: 64px;
    font-weight: 700;
    line-height: 1;
    letter-spacing: -0.04em;
  }
  .jhc-score-num.strong { color: var(--success); }
  .jhc-score-num.good { color: var(--accent); }
  .jhc-score-num.stretch { color: var(--warning); }
  .jhc-score-num.weak { color: var(--danger); }
  .jhc-score-meta {
    padding-bottom: 8px;
  }
  .jhc-score-verdict {
    font-family: var(--font-mono);
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.15em;
    color: var(--text-muted);
    margin-bottom: 4px;
  }
  .jhc-score-summary {
    font-size: 16px;
    color: var(--text-primary);
    max-width: 600px;
  }

  .jhc-analysis-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    margin-top: 24px;
  }
  @media (max-width: 800px) {
    .jhc-analysis-grid { grid-template-columns: 1fr; }
  }
  .jhc-analysis-block h4 {
    font-family: var(--font-mono);
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--text-muted);
    margin: 0 0 12px 0;
  }
  .jhc-analysis-block ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  .jhc-analysis-block li {
    padding: 8px 0 8px 18px;
    position: relative;
    font-size: 13px;
    line-height: 1.55;
    border-top: 1px solid var(--border);
  }
  .jhc-analysis-block li:first-child { border-top: none; }
  .jhc-analysis-block li::before {
    content: '';
    position: absolute;
    left: 0;
    top: 16px;
    width: 6px;
    height: 6px;
  }
  .jhc-analysis-block.strengths li::before { background: var(--success); }
  .jhc-analysis-block.gaps li::before { background: var(--warning); }
  .jhc-analysis-block.keywords { grid-column: 1 / -1; }
  .jhc-analysis-block.talking li::before { background: var(--accent); }
  .jhc-analysis-block.flags li::before { background: var(--danger); }

  .jhc-keyword {
    display: inline-block;
    font-family: var(--font-mono);
    font-size: 11px;
    background: var(--bg-elevated);
    color: var(--text-primary);
    padding: 4px 10px;
    border-radius: 2px;
    margin: 0 6px 6px 0;
    border: 1px solid var(--border);
  }

  /* Letter output */
  .jhc-letter {
    background: var(--bg-surface);
    border: 1px solid var(--border-strong);
    border-radius: 3px;
    padding: 24px;
    font-size: 14px;
    line-height: 1.7;
    white-space: pre-wrap;
    color: var(--text-primary);
    font-family: var(--font-body);
  }

  .jhc-bullet-card {
    background: var(--bg-surface-2);
    border: 1px solid var(--border);
    border-radius: 3px;
    padding: 14px 16px;
    margin-bottom: 10px;
  }
  .jhc-bullet-label {
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: 4px;
  }
  .jhc-bullet-original {
    color: var(--text-muted);
    font-size: 13px;
    margin-bottom: 10px;
    padding-bottom: 10px;
    border-bottom: 1px solid var(--border);
  }
  .jhc-bullet-tailored {
    color: var(--text-primary);
    font-size: 14px;
    line-height: 1.5;
    margin-bottom: 8px;
  }
  .jhc-bullet-rationale {
    color: var(--accent);
    font-size: 11px;
    font-family: var(--font-mono);
    font-style: italic;
  }

  /* Tailored resume — download bar + preview */
  .jhc-download-bar {
    background: var(--bg-surface);
    border: 1px solid var(--border-strong);
    border-radius: 3px;
    padding: 18px 20px;
    margin-bottom: 20px;
  }
  .jhc-download-label {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.12em;
    margin-bottom: 12px;
  }
  .jhc-download-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 12px;
  }
  .jhc-download-hint {
    font-size: 12px;
    color: var(--text-muted);
    font-family: var(--font-mono);
    line-height: 1.5;
  }

  .jhc-changes {
    background: rgba(255, 182, 72, 0.06);
    border: 1px solid var(--accent-dim);
    border-radius: 3px;
    padding: 14px 18px;
    margin-bottom: 20px;
  }
  .jhc-changes-label {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--accent);
    text-transform: uppercase;
    letter-spacing: 0.12em;
    margin-bottom: 8px;
  }
  .jhc-changes ul { margin: 0; padding-left: 18px; list-style: none; }
  .jhc-changes li {
    padding: 4px 0 4px 14px;
    position: relative;
    font-size: 13px;
    color: var(--text-primary);
  }
  .jhc-changes li::before {
    content: '→';
    position: absolute;
    left: 0;
    color: var(--accent);
    font-family: var(--font-mono);
  }

  /* Resume preview — mimics the actual document */
  .jhc-resume-preview {
    background: #fafaf6;
    color: #1a1a1a;
    padding: 48px 56px;
    border-radius: 3px;
    border: 1px solid var(--border);
    font-family: 'Calibri', 'Helvetica Neue', Arial, sans-serif;
    font-size: 13px;
    line-height: 1.45;
  }
  .jhc-resume-preview .rp-name {
    font-size: 26px;
    margin: 0 0 4px 0;
    letter-spacing: 0.3px;
    font-weight: 700;
    color: #1a1a1a;
    font-family: 'Calibri', 'Helvetica Neue', Arial, sans-serif;
  }
  .jhc-resume-preview .rp-contact {
    color: #444;
    font-size: 12px;
    margin-bottom: 3px;
  }
  .jhc-resume-preview .rp-creds {
    font-size: 12px;
    font-weight: 600;
    margin-bottom: 18px;
  }
  .jhc-resume-preview .rp-sect {
    font-size: 13px;
    text-transform: uppercase;
    letter-spacing: 1.2px;
    border-bottom: 1.2px solid #1a1a1a;
    padding-bottom: 3px;
    margin: 18px 0 8px;
    font-weight: 700;
    color: #1a1a1a;
    font-family: 'Calibri', 'Helvetica Neue', Arial, sans-serif;
  }
  .jhc-resume-preview .rp-summary { margin: 0 0 6px 0; }
  .jhc-resume-preview .rp-job { margin-bottom: 12px; }
  .jhc-resume-preview .rp-job-line {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }
  .jhc-resume-preview .rp-job-title { font-weight: 700; font-size: 13px; }
  .jhc-resume-preview .rp-job-dates { color: #555; font-size: 12px; font-style: italic; }
  .jhc-resume-preview .rp-job-meta { color: #555; font-size: 12px; font-style: italic; margin-bottom: 4px; }
  .jhc-resume-preview ul { margin: 4px 0 8px; padding-left: 20px; }
  .jhc-resume-preview li { margin-bottom: 3px; }
  .jhc-resume-preview p { margin: 0 0 6px 0; }

  /* Tracker */
  .jhc-app-row {
    display: grid;
    grid-template-columns: 1fr 1fr 140px 130px 80px;
    gap: 16px;
    padding: 14px 16px;
    border-bottom: 1px solid var(--border);
    align-items: center;
  }
  .jhc-app-row.head {
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.12em;
    border-bottom: 1px solid var(--border-strong);
    padding-top: 8px;
    padding-bottom: 12px;
  }
  .jhc-app-row:not(.head):hover { background: var(--bg-surface-2); }
  .jhc-app-company { font-weight: 600; }
  .jhc-app-role { color: var(--text-secondary); font-size: 13px; }
  .jhc-app-date { font-family: var(--font-mono); font-size: 11px; color: var(--text-muted); }
  .jhc-status-select {
    font-family: var(--font-mono);
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    padding: 5px 22px 5px 10px;
    border-radius: 2px;
    border: 1px solid transparent;
    background-color: var(--bg-elevated);
    color: var(--text-primary);
    cursor: pointer;
    appearance: none;
    -webkit-appearance: none;
    -moz-appearance: none;
    background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8' viewBox='0 0 8 8'%3E%3Cpath d='M1 2.5l3 3 3-3' stroke='currentColor' stroke-width='1.2' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 7px center;
    font-weight: 500;
    transition: filter 0.15s;
  }
  .jhc-status-select:hover { filter: brightness(1.15); }
  .jhc-status-select:focus { outline: none; box-shadow: 0 0 0 1px var(--border-strong); }
  .jhc-status-select.applied    { background-color: rgba(121, 192, 255, 0.15); color: var(--info); }
  .jhc-status-select.screen     { background-color: rgba(255, 182, 72, 0.15);  color: var(--accent); }
  .jhc-status-select.interview  { background-color: rgba(255, 166, 87, 0.18);  color: var(--warning); }
  .jhc-status-select.offer      { background-color: rgba(126, 231, 135, 0.15); color: var(--success); }
  .jhc-status-select.accepted {
    background-color: rgba(126, 231, 135, 0.28);
    color: var(--success);
    border-color: var(--success);
    font-weight: 700;
  }
  .jhc-status-select.rejected   { background-color: rgba(255, 123, 114, 0.15); color: var(--danger); }
  .jhc-status-select.withdrawn  { background-color: var(--bg-elevated); color: var(--text-secondary); font-style: italic; }
  .jhc-status-select.ghosted    { background-color: var(--bg-elevated); color: var(--text-muted); }
  .jhc-status-select option {
    background-color: var(--bg-surface);
    color: var(--text-primary);
    font-weight: 400;
    font-style: normal;
  }

  /* Stats bar */
  .jhc-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 1px;
    background: var(--border);
    margin-bottom: 24px;
    border: 1px solid var(--border);
    border-radius: 3px;
    overflow: hidden;
  }
  .jhc-stat {
    background: var(--bg-surface);
    padding: 14px 18px;
  }
  .jhc-stat-label {
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.12em;
    margin-bottom: 4px;
  }
  .jhc-stat-value {
    font-family: var(--font-display);
    font-size: 24px;
    font-weight: 600;
    color: var(--text-primary);
  }
  .jhc-stat-value.accent { color: var(--accent); }
  .jhc-stat-value.warning { color: var(--warning); }
  .jhc-stat-value.success { color: var(--success); }

  /* Empty state */
  .jhc-empty {
    text-align: center;
    padding: 64px 24px;
    color: var(--text-muted);
    border: 1px dashed var(--border-strong);
    border-radius: 4px;
  }
  .jhc-empty h3 {
    font-family: var(--font-display);
    color: var(--text-secondary);
    margin: 0 0 8px 0;
    font-size: 18px;
  }

  /* Loading */
  .jhc-loading {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: var(--accent);
    font-family: var(--font-mono);
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }
  .jhc-spinner {
    width: 12px;
    height: 12px;
    border: 2px solid var(--accent-dim);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* Error */
  .jhc-error {
    background: rgba(255, 123, 114, 0.08);
    border: 1px solid rgba(255, 123, 114, 0.3);
    border-radius: 3px;
    padding: 12px 14px;
    color: var(--danger);
    font-size: 13px;
    font-family: var(--font-mono);
  }

  /* Subtle row in track tab for add form */
  .jhc-add-row {
    display: grid;
    grid-template-columns: 1fr 1fr auto;
    gap: 10px;
    margin-bottom: 24px;
  }

  /* Copy button */
  .jhc-copy-row {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 12px;
  }
`;

// ─────────────────────────────────────────────────────────────
// COMPONENTS
// ─────────────────────────────────────────────────────────────

function Header({ tab, setTab, appCount }) {
  const tabs = [
    { id: "search", label: "Search" },
    { id: "analyze", label: "Analyze JD" },
    { id: "tailor", label: "Tailor" },
    { id: "track", label: "Tracker", count: appCount },
  ];
  return (
    <div className="jhc-header">
      <div className="jhc-header-top">
        <div className="jhc-brand">
          <div className="jhc-brand-name">{PROFILE.name}</div>
          <div className="jhc-brand-tag">// JOB HUNT COCKPIT</div>
        </div>
        <div className="jhc-meta">
          <span><strong>CLR</strong> <span className="jhc-badge">{PROFILE.clearance}</span></span>
          <span><strong>LOC</strong> {PROFILE.location}</span>
          <span><strong>MODE</strong> {PROFILE.workStyle}</span>
        </div>
      </div>
      <div className="jhc-tabs">
        {tabs.map((t) => (
          <button
            key={t.id}
            className={`jhc-tab ${tab === t.id ? "active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
            {typeof t.count === "number" && <span className="jhc-tab-count">{t.count}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

function SearchTab() {
  return (
    <div>
      <div className="jhc-section-head">
        <h2 className="jhc-section-title">Search Hub</h2>
        <p className="jhc-section-sub">
          Pre-built queries targeting Senior Network Engineer / Architect roles with TS/SCI. Open in new tabs — don't try to do all of them in one session.
        </p>
      </div>

      <div className="jhc-grid-3" style={{ marginBottom: 32 }}>
        {SEARCH_BOARDS.map((b) => (
          <div key={b.name} className="jhc-card">
            <div className="jhc-card-head">
              <div className="jhc-card-title">{b.name}</div>
              <span className={`jhc-card-tag ${b.tag.toLowerCase()}`}>{b.tag}</span>
            </div>
            <div className="jhc-card-desc">{b.desc}</div>
            {b.links.map((l) => (
              <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer" className="jhc-link-row">
                <span className="jhc-link-label">
                  {l.label}
                  {l.filter && <span className={`jhc-link-filter ${l.filter === "30d" ? "is-strong" : ""}`}>{l.filter}</span>}
                </span>
                <span className="jhc-link-arrow">→</span>
              </a>
            ))}
          </div>
        ))}
      </div>

      <div className="jhc-section-head">
        <h3 className="jhc-section-title" style={{ fontSize: 22 }}>Target Companies — Direct Apply</h3>
        <p className="jhc-section-sub">
          Federal contractors with deep cleared-networking pipelines. Many have referral bonuses — leverage your old GDIT/MetroStar/Nakupuna contacts.
        </p>
      </div>

      <div className="jhc-chip-grid">
        {TARGET_COMPANIES.map((c) => (
          <a key={c.name} href={c.url} target="_blank" rel="noopener noreferrer" className="jhc-chip">
            <div className="jhc-chip-name">{c.name}</div>
            <div className="jhc-chip-note">{c.note}</div>
          </a>
        ))}
      </div>
    </div>
  );
}

function AnalyzeTab({ onUseJD }) {
  const [jd, setJd] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  async function run() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const r = await analyzeFit(jd);
      setResult(r);
    } catch (e) {
      setError(e.message || "Analysis failed. Try again or check the JD format.");
    } finally {
      setLoading(false);
    }
  }

  function verdictClass(v) {
    if (!v) return "";
    const s = v.toLowerCase();
    if (s.includes("strong")) return "strong";
    if (s.includes("good")) return "good";
    if (s.includes("stretch")) return "stretch";
    return "weak";
  }

  return (
    <div>
      <div className="jhc-section-head">
        <h2 className="jhc-section-title">Fit Analyzer</h2>
        <p className="jhc-section-sub">
          Paste a full job description. Get a fit score, strengths/gaps mapped to your resume, keywords to mirror, and red flags to watch for.
        </p>
      </div>

      <label className="jhc-label">Job Description</label>
      <textarea
        className="jhc-textarea"
        placeholder="Paste the full JD here — title, responsibilities, required qualifications, everything..."
        value={jd}
        onChange={(e) => setJd(e.target.value)}
      />
      <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
        <button className="jhc-btn jhc-btn-primary" onClick={run} disabled={!jd.trim() || loading}>
          {loading ? <><span className="jhc-spinner" />Analyzing</> : "Analyze Fit"}
        </button>
        {result && (
          <button className="jhc-btn jhc-btn-ghost" onClick={() => onUseJD && onUseJD(jd)}>
            Send to Tailor →
          </button>
        )}
      </div>

      {error && <div className="jhc-error" style={{ marginTop: 16 }}>{error}</div>}

      {result && (
        <div style={{ marginTop: 32 }}>
          <div className="jhc-score-card">
            <div className="jhc-score-head">
              <div className={`jhc-score-num ${verdictClass(result.verdict)}`}>{result.fit_score}</div>
              <div className="jhc-score-meta">
                <div className="jhc-score-verdict">{result.verdict}</div>
                <div className="jhc-score-summary">{result.summary}</div>
              </div>
            </div>
          </div>

          <div className="jhc-analysis-grid">
            {result.strengths?.length > 0 && (
              <div className="jhc-analysis-block strengths">
                <h4>Strengths · Why You Fit</h4>
                <ul>{result.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
              </div>
            )}
            {result.gaps?.length > 0 && (
              <div className="jhc-analysis-block gaps">
                <h4>Gaps · Address These</h4>
                <ul>{result.gaps.map((s, i) => <li key={i}>{s}</li>)}</ul>
              </div>
            )}
            {result.talking_points?.length > 0 && (
              <div className="jhc-analysis-block talking">
                <h4>Surface These</h4>
                <ul>{result.talking_points.map((s, i) => <li key={i}>{s}</li>)}</ul>
              </div>
            )}
            {result.red_flags?.length > 0 && (
              <div className="jhc-analysis-block flags">
                <h4>Red Flags</h4>
                <ul>{result.red_flags.map((s, i) => <li key={i}>{s}</li>)}</ul>
              </div>
            )}
            {result.keywords_to_emphasize?.length > 0 && (
              <div className="jhc-analysis-block keywords">
                <h4>Keywords · Mirror Verbatim</h4>
                <div>
                  {result.keywords_to_emphasize.map((k, i) => (
                    <span key={i} className="jhc-keyword">{k}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function TailorTab({ presetJD }) {
  const [jd, setJd] = useState(presetJD || "");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [mode, setMode] = useState("letter"); // 'letter' | 'resume'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [letter, setLetter] = useState(null);
  const [resume, setResume] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (presetJD) setJd(presetJD);
  }, [presetJD]);

  async function runLetter() {
    setLoading(true); setError(null); setLetter(null);
    try {
      const t = await generateCoverLetter(jd, company, role);
      setLetter(t);
    } catch (e) { setError(e.message || "Generation failed."); }
    finally { setLoading(false); }
  }

  async function runResume() {
    setLoading(true); setError(null); setResume(null);
    try {
      const r = await tailorFullResume(jd);
      setResume(r);
    } catch (e) { setError("Generation failed — the model may have returned malformed JSON. Try again."); }
    finally { setLoading(false); }
  }

  function copy(text) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function fileBase() {
    const co = company ? `_${slugify(company)}` : "";
    return `Joshua_Ling_Resume${co}`;
  }

  function downloadResume(fmt) {
    if (!resume) return;
    if (fmt === "html") {
      downloadFile(resumeToHTML(resume), `${fileBase()}.html`, "text/html");
    } else if (fmt === "txt") {
      downloadFile(resumeToText(resume), `${fileBase()}.txt`, "text/plain");
    }
  }

  function printResume() {
    if (!resume) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(resumeToHTML(resume));
    win.document.close();
    setTimeout(() => { win.focus(); win.print(); }, 250);
  }

  return (
    <div>
      <div className="jhc-section-head">
        <h2 className="jhc-section-title">Tailor Application</h2>
        <p className="jhc-section-sub">
          Generate a tailored cover letter, or rewrite your full resume to mirror the JD's language while keeping all real employers, dates, and accomplishments intact.
        </p>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button
          className={`jhc-btn ${mode === "letter" ? "jhc-btn-primary" : "jhc-btn-ghost"}`}
          onClick={() => setMode("letter")}
        >Cover Letter</button>
        <button
          className={`jhc-btn ${mode === "resume" ? "jhc-btn-primary" : "jhc-btn-ghost"}`}
          onClick={() => setMode("resume")}
        >Tailored Resume</button>
      </div>

      {mode === "letter" && (
        <div className="jhc-grid-2" style={{ marginBottom: 12 }}>
          <div>
            <label className="jhc-label">Company</label>
            <input className="jhc-input" placeholder="e.g. Leidos" value={company} onChange={(e) => setCompany(e.target.value)} />
          </div>
          <div>
            <label className="jhc-label">Role Title</label>
            <input className="jhc-input" placeholder="e.g. Senior Network Architect" value={role} onChange={(e) => setRole(e.target.value)} />
          </div>
        </div>
      )}

      {mode === "resume" && (
        <div style={{ marginBottom: 12 }}>
          <label className="jhc-label">Company (used in download filename)</label>
          <input className="jhc-input" placeholder="e.g. Leidos" value={company} onChange={(e) => setCompany(e.target.value)} />
        </div>
      )}

      <label className="jhc-label">Job Description</label>
      <textarea
        className="jhc-textarea"
        placeholder="Paste the JD..."
        value={jd}
        onChange={(e) => setJd(e.target.value)}
      />
      <div style={{ marginTop: 12 }}>
        <button
          className="jhc-btn jhc-btn-primary"
          onClick={mode === "letter" ? runLetter : runResume}
          disabled={!jd.trim() || loading}
        >
          {loading
            ? <><span className="jhc-spinner" />Generating</>
            : (mode === "letter" ? "Generate Letter" : "Tailor My Resume")}
        </button>
      </div>

      {error && <div className="jhc-error" style={{ marginTop: 16 }}>{error}</div>}

      {letter && mode === "letter" && (
        <div style={{ marginTop: 24 }}>
          <div className="jhc-letter">{letter}</div>
          <div className="jhc-copy-row">
            <button className="jhc-btn jhc-btn-ghost" onClick={() => copy(letter)}>
              {copied ? "Copied ✓" : "Copy Letter"}
            </button>
          </div>
        </div>
      )}

      {resume && mode === "resume" && (
        <div style={{ marginTop: 24 }}>
          <div className="jhc-download-bar">
            <div className="jhc-download-label">Download tailored resume</div>
            <div className="jhc-download-actions">
              <button className="jhc-btn jhc-btn-primary" onClick={() => downloadResume("html")}>
                .html (open in Word)
              </button>
              <button className="jhc-btn jhc-btn-ghost" onClick={() => downloadResume("txt")}>
                .txt (ATS plain text)
              </button>
              <button className="jhc-btn jhc-btn-ghost" onClick={printResume}>
                Print → PDF
              </button>
              <button className="jhc-btn jhc-btn-ghost" onClick={() => copy(resumeToText(resume))}>
                {copied ? "Copied ✓" : "Copy Text"}
              </button>
            </div>
            <div className="jhc-download-hint">
              HTML opens directly in Word (File → Open → select the .html) — save as .docx from there. Or print to PDF straight from the preview.
            </div>
          </div>

          {resume.changes_summary?.length > 0 && (
            <div className="jhc-changes">
              <div className="jhc-changes-label">What changed</div>
              <ul>{resume.changes_summary.map((c, i) => <li key={i}>{c}</li>)}</ul>
            </div>
          )}

          <div className="jhc-resume-preview">
            <h1 className="rp-name">{resume.header.name}</h1>
            <div className="rp-contact">{resume.header.location} | {resume.header.phone} | {resume.header.email}</div>
            <div className="rp-creds">{resume.header.credentials}</div>

            <h2 className="rp-sect">Professional Summary</h2>
            <p className="rp-summary">{resume.summary}</p>

            <h2 className="rp-sect">Experience</h2>
            {resume.experience.map((j, i) => (
              <div className="rp-job" key={i}>
                <div className="rp-job-line">
                  <span className="rp-job-title">{j.title} — {j.company}</span>
                  <span className="rp-job-dates">{j.dates}</span>
                </div>
                <div className="rp-job-meta">{j.location}</div>
                <ul>{j.bullets.map((b, k) => <li key={k}>{b}</li>)}</ul>
              </div>
            ))}

            <h2 className="rp-sect">Education</h2>
            <p>{resume.education}</p>

            <h2 className="rp-sect">Certifications</h2>
            <p>{resume.certifications}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper: returns 'overdue' | 'today' | 'upcoming' | null
function followUpStatus(dateStr) {
  if (!dateStr) return null;
  const today = new Date().toISOString().slice(0, 10);
  if (dateStr < today) return "overdue";
  if (dateStr === today) return "today";
  return "upcoming";
}

// Helper: relative time string like "5m ago", "2d ago", or full date if older
function formatRelative(iso) {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  const now = Date.now();
  const sec = Math.max(0, Math.round((now - then) / 1000));
  if (sec < 60) return `${sec}s ago`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 14) return `${day}d ago`;
  return new Date(iso).toLocaleDateString();
}

const STATUS_LIST = ["applied", "screen", "interview", "offer", "accepted", "rejected", "withdrawn", "ghosted"];
const STATUS_LABELS = {
  applied: "Applied",
  screen: "Phone Screen",
  interview: "Interview",
  offer: "Offer Received",
  accepted: "Accepted ✓",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
  ghosted: "Ghosted",
};

// Expanded row component — owns its notes draft locally so we save on blur,
// not on every keystroke (avoids hammering window.storage)
function AppExpandedPanel({ app, onUpdate }) {
  const [notesDraft, setNotesDraft] = useState(app.notes || "");
  const [dirty, setDirty] = useState(false);

  // If the app's notes change externally (e.g. on initial expand), sync.
  useEffect(() => {
    if (!dirty) setNotesDraft(app.notes || "");
  }, [app.notes, dirty]);

  function saveNotes() {
    if (notesDraft !== (app.notes || "")) {
      onUpdate({ notes: notesDraft });
    }
    setDirty(false);
  }

  return (
    <div className="jhc-app-expanded">
      <div className="jhc-expanded-grid">
        <div>
          <label className="jhc-label">Follow-up Date</label>
          <input
            type="date"
            className="jhc-input"
            value={app.followUp || ""}
            onChange={(e) => onUpdate({ followUp: e.target.value })}
          />
        </div>
        <div>
          <label className="jhc-label">Last Updated</label>
          <div className="jhc-app-updated">
            {app.updatedAt ? formatRelative(app.updatedAt) : "—"}
          </div>
        </div>
        <div>
          <label className="jhc-label">Logged</label>
          <div className="jhc-app-updated">{app.date}</div>
        </div>
      </div>
      <label className="jhc-label" style={{ marginTop: 14 }}>Notes</label>
      <textarea
        className="jhc-textarea"
        style={{ minHeight: 110, fontFamily: "var(--font-body)", fontSize: 13 }}
        placeholder="Recruiter name & contact, who you spoke with, salary discussed, interview format, what they cared about, what to follow up on..."
        value={notesDraft}
        onChange={(e) => { setNotesDraft(e.target.value); setDirty(true); }}
        onBlur={saveNotes}
      />
      {dirty && <div className="jhc-app-saving">Notes save when you click away</div>}
    </div>
  );
}

function TrackTab({ apps, setApps }) {
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [expandedId, setExpandedId] = useState(null);

  async function addApp() {
    if (!company.trim() || !role.trim()) return;
    const now = new Date().toISOString();
    const next = [
      ...apps,
      {
        id: `app_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        company: company.trim(),
        role: role.trim(),
        date: now.slice(0, 10),
        status: "applied",
        notes: "",
        followUp: "",
        updatedAt: now,
      },
    ];
    setApps(next);
    await saveApplications(next);
    setCompany("");
    setRole("");
  }

  async function updateApp(id, patch) {
    const next = apps.map((a) =>
      a.id === id ? { ...a, ...patch, updatedAt: new Date().toISOString() } : a
    );
    setApps(next);
    await saveApplications(next);
  }

  async function removeApp(id) {
    if (!confirm("Delete this application from the tracker? This cannot be undone.")) return;
    const next = apps.filter((a) => a.id !== id);
    setApps(next);
    await saveApplications(next);
    if (expandedId === id) setExpandedId(null);
  }

  const counts = STATUS_LIST.reduce(
    (acc, s) => ({ ...acc, [s]: apps.filter((a) => a.status === s).length }),
    {}
  );
  const followUpsDue = apps.filter((a) => {
    const fs = followUpStatus(a.followUp);
    return fs === "overdue" || fs === "today";
  }).length;

  return (
    <div>
      <div className="jhc-section-head">
        <h2 className="jhc-section-title">Application Tracker</h2>
        <p className="jhc-section-sub">
          Saved locally in your browser. Change status from the dropdown, expand a row to add notes or a follow-up date. Aim for 5–10 quality apps per week, not 50 sloppy ones.
        </p>
      </div>

      {apps.length > 0 && (
        <div className="jhc-stats">
          <div className="jhc-stat"><div className="jhc-stat-label">Total</div><div className="jhc-stat-value accent">{apps.length}</div></div>
          <div className="jhc-stat"><div className="jhc-stat-label">Applied</div><div className="jhc-stat-value">{counts.applied}</div></div>
          <div className="jhc-stat"><div className="jhc-stat-label">Interview</div><div className="jhc-stat-value">{counts.interview}</div></div>
          <div className="jhc-stat"><div className="jhc-stat-label">Offers</div><div className="jhc-stat-value">{counts.offer}</div></div>
          <div className="jhc-stat">
            <div className="jhc-stat-label">Accepted</div>
            <div className={`jhc-stat-value ${counts.accepted > 0 ? "success" : ""}`}>{counts.accepted}</div>
          </div>
          <div className="jhc-stat">
            <div className="jhc-stat-label">Follow-ups Due</div>
            <div className={`jhc-stat-value ${followUpsDue > 0 ? "warning" : ""}`}>{followUpsDue}</div>
          </div>
        </div>
      )}

      <div className="jhc-add-row">
        <input className="jhc-input" placeholder="Company" value={company} onChange={(e) => setCompany(e.target.value)} />
        <input className="jhc-input" placeholder="Role" value={role} onChange={(e) => setRole(e.target.value)} />
        <button className="jhc-btn jhc-btn-primary" onClick={addApp} disabled={!company.trim() || !role.trim()}>
          + Log Application
        </button>
      </div>

      {apps.length === 0 ? (
        <div className="jhc-empty">
          <h3>No applications logged yet</h3>
          <div>Once you submit a few, track them here.</div>
        </div>
      ) : (
        <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 3 }}>
          <div className="jhc-app-row head">
            <div>Company</div>
            <div>Role</div>
            <div>Logged</div>
            <div>Status</div>
            <div></div>
          </div>
          {apps.slice().reverse().map((a) => {
            const isExpanded = expandedId === a.id;
            const fuStatus = followUpStatus(a.followUp);
            return (
              <div key={a.id} className={`jhc-app-block ${isExpanded ? "expanded" : ""}`}>
                <div className="jhc-app-row">
                  <div className="jhc-app-company">
                    <span>{a.company}</span>
                    {a.notes && <span className="jhc-app-marker" title="Has notes">●</span>}
                    {fuStatus && (
                      <span className={`jhc-app-fu jhc-fu-${fuStatus}`} title={`Follow up ${a.followUp}`}>
                        ↻ {fuStatus === "overdue" ? "overdue" : fuStatus === "today" ? "today" : a.followUp.slice(5)}
                      </span>
                    )}
                  </div>
                  <div className="jhc-app-role">{a.role}</div>
                  <div className="jhc-app-date">{a.date}</div>
                  <div>
                    <select
                      className={`jhc-status-select ${a.status}`}
                      value={a.status}
                      onChange={(e) => updateApp(a.id, { status: e.target.value })}
                    >
                      {STATUS_LIST.map((s) => (
                        <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                      ))}
                    </select>
                  </div>
                  <div className="jhc-row-actions">
                    <button
                      className="jhc-icon-btn"
                      onClick={() => setExpandedId(isExpanded ? null : a.id)}
                      title={isExpanded ? "Collapse" : "Edit notes & follow-up"}
                      aria-label={isExpanded ? "Collapse" : "Expand"}
                    >
                      {isExpanded ? "▴" : "▾"}
                    </button>
                    <button
                      className="jhc-icon-btn jhc-icon-btn-danger"
                      onClick={() => removeApp(a.id)}
                      title="Delete"
                      aria-label="Delete"
                    >×</button>
                  </div>
                </div>
                {isExpanded && (
                  <AppExpandedPanel
                    app={a}
                    onUpdate={(patch) => updateApp(a.id, patch)}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// APP ROOT
// ─────────────────────────────────────────────────────────────

export default function App() {
  const [tab, setTab] = useState("search");
  const [apps, setApps] = useState([]);
  const [hydrated, setHydrated] = useState(false);
  const [tailorJD, setTailorJD] = useState("");

  useEffect(() => {
    loadApplications().then((a) => {
      setApps(a);
      setHydrated(true);
    });
  }, []);

  function sendToTailor(jd) {
    setTailorJD(jd);
    setTab("tailor");
  }

  return (
    <>
      <style>{STYLES}</style>
      <div className="jhc">
        <Header tab={tab} setTab={setTab} appCount={apps.length} />
        <div className="jhc-main">
          {tab === "search" && <SearchTab />}
          {tab === "analyze" && <AnalyzeTab onUseJD={sendToTailor} />}
          {tab === "tailor" && <TailorTab presetJD={tailorJD} />}
          {tab === "track" && hydrated && <TrackTab apps={apps} setApps={setApps} />}
        </div>
      </div>
    </>
  );
}
