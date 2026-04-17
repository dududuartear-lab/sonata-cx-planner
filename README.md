# 📊 Sonata CX Capacity Planner & Analytics Hub

---

## 🌐 Live Demo & Testing

To see the dashboard in action, check out the live link below:

**Live Demo: https://sonata-cx-planner.vercel.app/**

**Seamless Onboarding (Built-in Template):** To ensure a smooth experience for CX professionals and operational managers, I implemented a "Download Sample Template" feature directly on the upload screen. This allows users to instantly download a properly formatted `.csv` file, enabling immediate validation of the dashboard's analytical engine and data requirements with minimal friction.

**Full Realistic Dataset:** For a comprehensive evaluation of the tool's processing power and KPI accuracy, use the `input_tickets_delivery.csv` file available in this repository.

> ⚠️ **SECURITY & PRIVACY (GDPR/LGPD):** This tool operates entirely on the client-side; no data is stored or processed on external servers. All mathematical parsing occurs within the browser. However, aggregated KPIs (non-PII) are transmitted to the Google Gemini API to generate strategic insights. Always ensure that sensitive columns such as names, emails, and IDs are masked or anonymized before uploading your CSV.

---

## 🏢 Project Context & Strategic Value

This project was developed as a systemic solution to a recurring bottleneck in Customer Experience (CX) operations.

In high-complexity and hyper-growth environments, Workforce Management (WFM) often faces a significant challenge: the heavy dependency on Data Engineering teams to translate raw support logs into actionable headcount planning and shift scheduling.

The Sonata CX Capacity Planner addresses this pain point by providing an **"Analytics Cockpit"** for support managers. It enables autonomous, complex analyses — such as First Contact Resolution (FCR) rates, thermal peak identification, and per-channel staffing projections — allowing for data-driven workforce sizing through a simplified data ingestion process.

---

## 🚀 Version History & Feature Evolution

What started as a functional MVP evolved through multiple structured iterations, each driven by real operational feedback and deeper WFM domain knowledge. The versioning below documents the product thinking behind each release.

---

### v4.8 — Initial Release: Core Analytics Engine

The first functional version established the foundational data pipeline and KPI framework:

- **CSV ingestion** with automatic delimiter detection and date parsing across multiple formats
- **Monthly volume trend** visualization (area chart)
- **Ideal headcount calculation** based on Average Handle Time (AHT), break deductions, and an 82% occupancy factor
- **FCR (First Contact Resolution) analysis** via a 14-day recontact window per client-subject pair. Note that the 14-day window is a reference benchmark — real-world recontact thresholds vary by company and operation type.
- **Analytical heatmap** showing ticket concentration by weekday and hour of day
- **AI-powered strategic report** via Google Gemini, translating KPIs into actionable CX recommendations
- **Secure API key management** via Vercel environment variables, replacing exposed credentials

---

### v4.9 — Custom Operational Window Engine

The core update in v4.9 shifted the tool from generic calculations to **business-specific modeling**, eliminating the misleading assumption that operations run 24/7 with uniform daily demand.

- **Operating Days selector:** Granular activation of individual weekdays (e.g., Monday–Friday, or any custom combination including weekends)
- **Operating Hours window:** Precise start/end time definition, including operations that cross midnight (e.g., 10pm–2am)
- **Business impact:** Ideal headcount is now calculated based on actual business availability, concentrating demand within active service windows rather than diluting it over a theoretical 30-day cycle

---

### v5.0 — Multi-Channel Decomposition & Shift Planning

Version 5.0 represented the most significant evolution of the calculation engine and visualization layer. Every prior version treated channels as a composite — v5.0 broke them apart.

**Calculation logic overhaul:**
- **TMA-only model:** Headcount is now calculated solely from Average Handle Time (AHT) per channel, in minutes, allowing decimal values (e.g., 0.5 min for fast email responses). This eliminates the previously overcomplicated SLA and reopen metrics, which were redundant inputs for capacity planning
- **Channel toggles:** Each channel (Phone, Chat, Email) can be individually activated or deactivated. A channel with AHT = 0 is automatically excluded from the calculation. This supports single-channel and dual-channel operations without distorting the output
- **Proportional HC distribution:** Headcount per channel is now proportional to actual volume share from the most recent month, correcting the previous bug where email (low-volume) was being assigned the majority of agents
- **Chat concurrency:** Chat agents can handle multiple simultaneous conversations; the model divides chat workload by the configured concurrency factor before applying AHT

**New visualizations:**
- **Stacked area chart by channel:** The volume trend chart now decomposes total tickets into Phone, Chat, and Email layers, making channel mix evolution immediately visible
- **Hourly staffing chart (new):** A stacked bar chart showing the estimated number of agents required per hour of operation, broken down by channel. Built from the last month's heatmap pattern, this chart is the primary tool for planning staggered shift entries and ensuring peak coverage without overstaffing off-peak hours. Operations crossing midnight are fully supported

**UX improvements:**
- Fixed a conflicting CSS class bug on the "Required Team" card that caused numbers to render invisibly in certain browsers
- Sidebar rebuilt with channel cards featuring individual toggles, replacing the previous monolithic performance section

---

### v5.1 — Shift Coverage Modeling & Operational Realism

Version 5.1 addressed what was arguably the most consequential gap in prior versions: **no analyst works 7 days a week**, but the headcount calculation was behaving as if they did.

**5×2 coverage factor:**

Under Brazilian labor law (CLT), the maximum workweek is 44 hours. In practice, most CX operations may run on a 5×2 schedule — analysts work 5 days and rest 2. This means that if an operation runs 7 days a week, it cannot be covered by the "base" headcount alone. On any given day, a fraction of the team is on their day off, and other analysts must cover the gap.

The model now applies a **coverage multiplier** to the base headcount:

```
Coverage Factor = max(operating days per week / 5, 1)
```

- 7-day operation → factor 1.40 → +40% over base headcount
- 6-day operation → factor 1.20 → +20% over base headcount
- 5-day operation → factor 1.00 → no adjustment needed
- ≤4-day operation → factor 1.00 → all analysts can cover all days within their own schedule

This single correction can materially change the staffing recommendation for weekend-operating teams and is especially relevant for e-commerce, delivery, and financial services, where Sunday volume is often non-trivial.

**Operational disclaimer (static, pre-report):**

Rather than burying this logic in the AI prompt or leaving it implicit, v5.1 surfaces it as a **visible disclaimer block** above the AI report section. It explains the 5×2 assumption, the weekly hour model (8h/day = 40h/week, 6h/day = 30h/week, 4h/day = 20h/week), and includes an explicit validation note: the headcount output is an estimate based on historical patterns and configured parameters. The operational manager must cross-reference with real-world absenteeism, turnover, and contract specifics.

**AI prompt refinement:**

The strategic report prompt was restructured to eliminate redundancy between sections. Each section now covers a distinct topic, and the conditional scenario logic (understaffed, overstaffed, balanced) is explicitly mutually exclusive — the model applies only the scenario that matches the actual data. The "Tier 0/1" jargon was replaced with plain-language equivalents accessible to any CX manager, not just those with a WFM background.

---

## 🐍 Data Engineering & Simulation (The Python Pipeline)

In real-world CX scenarios, data is rarely pristine. To validate the tool under high-growth conditions while adhering to privacy standards, I developed a robust synthetic data pipeline.

The script `input_tickets_delivery.py` programmatically generates a realistic dataset (`input_tickets_delivery.csv`) that mimics the complexities of a large-scale operation:

- **Weighted Distribution:** Simulates realistic contact volumes across various channels (Phone, Email, Chat) and subjects (Logistics, Payments, etc.)
- **Recurrence Modeling:** Artificially generates a percentage of "recontacts" by assigning the same `client_id` to multiple tickets within a 14-day window, stress-testing the FCR mathematical models
- **Data Normalization:** Handles string standardization and text cleaning to ensure high data integrity for the frontend application

This script demonstrates an end-to-end product skill: identifying a data gap, engineering a backend solution to fill it, and successfully integrating it into the final product.

---

## 🛠️ Strategic Problem-Solving Framework

The application's calculation engine is guided by industry best practices and operational logic:

- **Operational Scoping:** Users configure Average Handle Time (AHT) per channel in minutes (decimal values supported), chat concurrency, mandatory breaks (NR-17 compliant), operating days, and service hours
- **5×2 Coverage Modeling:** The system accounts for the fact that no analyst works every day of the week, applying a coverage multiplier that scales headcount to ensure full operational coverage across all configured days
- **"Snapshot" Headcount:** The algorithm calculates FTE based on the most recent month's data, ensuring that scaling decisions reflect current demand rather than diluted historical averages
- **Resolutivity Analysis (FCR):** The system cross-references `client_id` and subjects to flag friction points and deduce resolution effectiveness across a configurable time window
- **Analytical Heatmap:** Using a continuous HSL gradient, the dashboard identifies hourly and weekly peaks, providing clear visibility for shift optimization and break planning
- **Hourly Staffing Projection:** A dedicated bar chart translates raw volume patterns into per-hour agent requirements by channel, directly supporting shift design decisions for staggered entries
- **Synthetic Advisor (AI):** Integrated via structured prompt engineering with Google Gemini. The tool subjects KPIs to conditional business rules, generating scenario-specific strategic recommendations without generic filler

---

## 🚀 AI-Assisted Development & Methodology

The development of this React and Python ecosystem utilized an **"AI-Augmented"** product methodology. Acting as the Product Lead and Technical Architect, I leveraged generative AI to materialize complex business requirements into a functional software architecture:

- **Requirement Engineering:** I defined the technical scope, providing the AI with exact mathematical formulas for workload modeling, occupancy factors, coverage ratios, and shift scheduling logic
- **Domain-Driven Iteration:** Each version was driven by WFM domain knowledge — understanding CLT constraints, Brazilian labor law nuances, channel-specific productivity dynamics, and the operational reality of 5×2 shift schedules
- **Resilient Troubleshooting:** I managed the technical infrastructure, debugging build logs and resolving deployment hurdles related to TypeScript strict typing, unused variable errors, environment variable scoping, and API versioning during Vercel integration
- **User-Centric Refinement:** I iterated on the UI/UX across multiple sessions, progressing from single-channel visualizations to multi-channel decomposition, from a fixed 30-day average to business-day-aware calculations, and from a flat headcount output to a per-channel, per-hour staffing model

**⏱️ Time-to-Value:** The initial functional MVP was developed in approximately 8 hours (from scope prompt to deployment). Subsequent iterations were driven by operational rigor and real-world validation, resulting in a tool that reflects the kind of WFM depth typically reserved for enterprise workforce planning software.

---

## 💻 Tech Stack

| Layer | Technology |
|---|---|
| Data Engineering | Python (Pandas, Numpy) |
| Frontend | React.js + TypeScript |
| Styling | Tailwind CSS |
| Visualization | Recharts |
| AI Integration | Google Gemini API (gemini-2.5-flash) |
| Deployment | Vercel |

---

## 💼 Developer / Portfolio

**Project by: Eduardo Duarte e Araujo**

Role: CX Strategy & Data Analytics / AI-Augmented Product Development

> **Disclaimer:** This application is a Proof of Concept (PoC) developed to demonstrate proficiency in operational data architecture, workforce management modeling, product management, and the applied use of Artificial Intelligence in business contexts.
