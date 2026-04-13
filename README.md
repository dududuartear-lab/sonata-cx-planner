📊 **Sonata CX Capacity Planner & Analytics Hub**

🌐 Live Demo & Testing

To see the dashboard in action, check out the live link below:

**Live Demo: https://sonata-cx-planner.vercel.app/**

**Seamless Onboarding (Built-in Template):** To ensure a smooth experience for CX professionals and operational managers, I implemented a "Download Sample Template" feature directly on the upload screen. This allows users to instantly download a properly formatted .csv file, enabling immediate validation of the dashboard's analytical engine and data requirements with minimal friction.

Full Realistic Dataset: For a comprehensive evaluation of the tool's processing power and KPI accuracy, use the input_tickets_delivery.csv file available in this repository.

⚠️ **SECURITY & PRIVACY (GDPR/LGPD): This tool operates entirely on the client-side; no data is stored or processed on external servers. All mathematical parsing occurs within the browser. However, aggregated KPIs (non-PII) are transmitted to the Google Gemini API to generate strategic insights. Always ensure that sensitive columns such as names, emails, and IDs are masked or anonymized before uploading your CSV.**

🏢 **Project Context & Strategic Value**

This project was developed as a systemic solution to a recurring bottleneck in Customer Experience (CX) operations.

In high-complexity and hyper-growth environments, Workforce Management (WFM) often faces a significant challenge: the heavy dependency on Data Engineering teams to translate raw support logs into actionable headcount planning and shift scheduling.

The Sonata CX Capacity Planner addresses this pain point by providing an "Analytics Cockpit" for support managers. It enables autonomous, complex analyses—such as First Contact Resolution (FCR) rates and thermal peak identification—allowing for data-driven workforce sizing through a simplified data ingestion process.

🚀 **Version 6.0: Enhanced Operational Logic**

The core update in version 6.0 is the introduction of the Custom Operational Window Engine, which shifts the tool from generic calculations to business-specific modeling.

Operating Days: Granular selection of active operational days (e.g., Monday to Friday).

Operating Hours: Precise definition of service start and end times.

Business Impact: This update ensures that the Ideal Headcount is calculated based on actual business availability. By concentrating demand within active service windows rather than diluting it over a theoretical 24/7 cycle, the tool provides a realistic view of staffing gaps and surpluses.

🐍 **Data Engineering & Simulation (The Python Pipeline)**

In real-world CX scenarios, data is rarely pristine. To validate the tool under high-growth conditions while adhering to privacy standards, I developed a robust synthetic data pipeline.

The script input_tickets_delivery.py programmatically generates a realistic dataset (input_tickets_delivery.csv) that mimics the complexities of a large-scale operation:

Weighted Distribution: Simulates realistic contact volumes across various channels (Phone, Email, Chat) and subjects (Logistics, Payments, etc.).

Recurrence Modeling: Artificially generates a percentage of "recontacts" by assigning the same client_id to multiple tickets within a 14-day window, stress-testing the FCR (First Contact Resolution) mathematical models.

Data Normalization: Handles string standardization and text cleaning to ensure high data integrity for the frontend application.

This script demonstrates an end-to-end product skill: identifying a data gap, engineering a backend solution to fill it, and successfully integrating it into the final product.

🛠️ **Strategic Problem-Solving Framework**

The application's calculation engine is guided by industry best practices and operational logic:

Operational Scoping: Users can configure business rules such as Average Handle Time (AHT), Average Wait Time (AWT), Chat Concurrency, and productivity deductions (including mandatory ergonomic breaks under Brazilian NR-17).

"Snapshot" Headcount: The algorithm calculates the FTE (Full-Time Equivalent) based on the most recent data trends, ensuring that scaling decisions are based on current demand rather than outdated historical averages.

Resolutivity Analysis (FCR): The system cross-references client_id and subjects to flag friction points and deduce resolution effectiveness.

Analytical Heatmap: Utilizing a continuous HSL gradient, the dashboard identifies hourly peaks, providing clear visibility for shift optimization and break planning.

Synthetic Advisor (AI): Integrated via Prompt Engineering with Google Gemini. The tool subjects KPIs to structured business rules, providing strategic recommendations (e.g., prioritizing automation over hiring when headcount gaps exceed specific thresholds).

🚀 **AI-Assisted Development & Methodology**

The development of this React and Python ecosystem utilized an "AI-Augmented" product methodology. Acting as the Product Lead and Technical Architect, I leveraged generative AI to materialize complex business requirements into a functional software architecture:

Requirement Engineering: I defined the technical scope, providing the AI with exact mathematical formulas for workload and shrinkage logic.

Resilient Troubleshooting: I managed the technical infrastructure, debugging build logs and resolving deployment hurdles related to CORS, TypeScript typings, and API versioning during the Vercel integration.

User-Centric Refinement: I iterated on the UI/UX to ensure a premium experience, moving from basic visualizations to fluid linear interpolations and implementing the dynamic CSV template generator to reduce user friction.

⏱️ Time-to-Value: This functional MVP was developed in approximately 8 hours. It stands as a testament to how rapid prototyping, combined with strong product management fundamentals, can leverage AI to deliver immediate business value and solve real-world operational problems.

💻 **Tech Stack**

Data Engineering: Python (Pandas, Numpy).

Frontend: React.js + TypeScript (for type-safety and scalability).

Styling: Tailwind CSS.

Visualization: Recharts.

AI Integration: Google Gemini API.

Deployment: Vercel.

💼 **Developer / Portfolio**

Project By: **Eduardo Duarte e Araujo**


Role: CX Strategy & Data Analytics / AI-Augmented Product Development

**Disclaimer: This application is a Proof of Concept (PoC) developed to demonstrate proficiency in operational data architecture, product management, and the applied use of Artificial Intelligence.**
