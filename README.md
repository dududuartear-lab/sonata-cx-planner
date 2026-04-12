📊 Sonata CX Capacity Planner & Analytics Hub

🌐 Live Demo & Testing

**To see the dashboard in action, check out the live link below:**

Live Demo: https://sonata-cx-planner.vercel.app/

Test Data: Use the input_tickets_sample.csv spreadsheet provided in this repository to interact with the Dashboard.

**Frictionless Testing (Built-in Template):** Understanding that the primary users of this tool (CX professionals and operational managers) might not be familiar with navigating GitHub repositories, I implemented a dynamic "Download Sample Template" button directly on the app's upload screen. This allows any user to instantly download a properly formatted .csv test file, test the dashboard's capabilities, and understand the required data structure with absolutely zero friction.

⚠️ SECURITY & PRIVACY DISCLAIMER (GDPR/LGPD): > This tool does not store any data. All mathematical processing and data parsing occur entirely locally within your browser (Client-side). However, do not upload databases containing real PII (Personally Identifiable Information). The aggregated indicators (numbers and KPIs) are transmitted to an external Artificial Intelligence API (Google Gemini) to generate the strategic report. Always ensure that sensitive columns like client_id, names, emails, and social security numbers (CPFs) are heavily masked or anonymized before uploading your CSV.

🏢 **Project Context & Origin (The Business Value)**

This project was designed not merely as a coding exercise, but as a systemic solution to a classic Customer Experience (CX) bottleneck.

Throughout my career managing high-complexity and hyper-growth operations, the challenge of Workforce Management (WFM) has always been glaring: CX teams often rely heavily on Data Engineers to translate raw support logs into actionable Ideal Headcount and shift scheduling.

The Sonata CX Capacity Planner solves this pain point. It acts as an "Analytics Cockpit" that empowers support managers, allowing them to perform complex analyses, evaluate First Contact Resolution (FCR) rates, understand hourly bottlenecks (Thermal Heatmaps), and instantly size their required workforce using nothing more than a simple CSV upload.

🛠️ **The Strategic Problem-Solving Framework**

The calculation engine of this application reflects deep analytical and operational knowledge, guided by market best practices:

Operational Scope Definition: The user configures their specific business rules, defining Average Handle Time (AHT), Average Wait Time (AWT), Chat Concurrency, and vital deductions (such as mandatory ergonomic breaks mandated by Brazilian NR-17 labor laws).

The "Snapshot" (Smart Headcount): The mathematical algorithm was designed to calculate the FTE (Full-Time Equivalent) strictly based on the most recent month in the dataset. Fast-growing operations shouldn't size their current teams based on volume from 6 months ago; they must address the present bottleneck.

Recontact Visibility (FCR): The application scans and cross-references client_id + subject, flagging repeated contacts within a 14-day window to deduce resolution friction (FCR).

Actionable Heatmap: Going beyond "pretty charts," the app utilizes a thermal map (continuous HSL gradient) crossing days of the week vs. hours of the day. The business goal is crystal clear: identifying absolute hourly peaks to accurately allocate shifts and breaks.

Synthetic Advisor (AI): Integrated via Prompt Engineering with Google Gemini. The code submits the KPIs to strict business rules (e.g., "If the ideal headcount is 15% higher than the current one, strongly suggest investing in self-service and automation (Tier 1) rather than just mass hiring").

🚀 **The "Vibecoding" Journey: From Concept to Production**

The most compelling aspect of this project is its methodology. This complex React system was developed without me typing a single line of traditional source code. As a Business and Product professional (not a front-end developer), I took on the role of Product Manager / Tech Lead, leveraging Generative AI and the Vibecoding technique to materialize my mental architecture into functional software:

**Requirements Architecture (Prompt Engineering):** The project began with a rigorous technical scope. I instructed the AI with exact mathematical specifications (Workload formulas, shrinkage deductions, CMGR calculations) that would form the core business logic.

**Advanced Troubleshooting & Resilience:** The biggest challenge wasn't generating the UI, but mastering the infrastructure. When facing roadblocks in the StackBlitz/Vite environment—such as CORS blocks, HTML parsing failures, Tailwind CSS injection bugs, and API version deprecations (models/gemini is not found)—I relied on my analytical framework. Instead of freezing, I read terminal logs, formulated highly contextual questions, and guided the AI to refactor root configuration files (tailwind.config.js, postcss.config.js) directly, successfully debugging the environment.

**Leading the AI:** I treated the AI as a junior developer. When code snippets failed or environments crashed, I provided exact feedback loops, steering the technology back on track to solve structural and deployment issues.

**UX/UI Refinement:** I refused to accept "standard, out-of-the-box charts." I demanded iterations focused on the end-user. I forced the transition from basic bichromatic heatmaps to fluid linear interpolations (HSL) and requested the removal of overlapping charts that created misleading correlations in data reading.

**Time-to-Value & The No-Code Milestone:** It is worth highlighting that this entire functional MVP was built from scratch in approximately 6 hours of dedicated work. While I acknowledge that any software has room for future enhancements and optimizations, going from a blank slate to a fully usable, complex enterprise tool without writing a single line of code is a significant achievement. It demonstrates how rapid prototyping and strong product management fundamentals can leverage AI to deliver immediate business value and solve real-world problems.

The result is an Enterprise-Grade application that not only functions flawlessly in production but perfectly adheres to strict business rules and CX user experience standards.

💻 Tech Stack & Justification

Frontend Framework: React.js (Chosen for componentization and instant reactivity for Single Page Applications).

Styling & UI: Tailwind CSS (Ensures a premium, responsive design that rivals leading SaaS tools on the market).

Data Visualization: Recharts (A lightweight, powerful library for plotting dynamic charts based on memory state).

Artificial Intelligence: Google Gemini API (gemini-1.5-flash) (A fast, highly capable model smoothly embedded via REST API).

Deployment: Vercel / StackBlitz (For agile, serverless Continuous Integration and live testing).

💼 Developer / Portfolio

Project By: Eduardo Duarte e Araujo

Role: CX Strategy & Data Analytics / Vibecoder

Methodology: AI-Assisted Product Development (Vibecoding)

Disclaimer: This application is a Proof of Concept (PoC) developed to demonstrate proficiency in operational data architecture, software project management, problem-solving, and the applied use of Generative Artificial Intelligence.
