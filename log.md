# 📝 Project Log: Group 1

**Sprint:** SCRUM Sprint 1

---

## 1. Meeting Minutes

### Meeting 1: Client kickoff meeting
- **Date:** Fri, Jan 30th  
- **Time:** 3:00 PM – 4:00 PM  

**Agenda**
- Review project requirements and Wanted features
- Discussed potential future directions
- Discussed realistic timelines and expectations 

**Decisions Made**
- **Big Stories** The "main ideas" and features that the app should fulfill
- **User stories** A few general ideas of specific wanted features in the app


**Action Items**
- Set up initial user story map for iteration 0

### **Meeting 2: Sprint Planning & Kickoff**
* **Date:** Tuesday, Feb 3rd
* **Time:** 6:00 PM - 7:00 PM
* **Agenda:**
    * Review project requirements and Vision Statement.
    * Select technology stack (Next.js vs. React + Python).
    * Define Epics and create initial backlog items.
    * Assign initial tasks for the "Walking Skeleton" (MVP).
* **Decisions Made:**
    * **Tech Stack:** Agreed to use **Next.js (App Router)** for both frontend and backend to keep the codebase unified.
    * **Database:** Selected **SQLite** for local development simplicity, to be migrated to Postgres if needed later.
    
* **Action Items:**
    * Set up User Auth (NextAuth).
    * Begin researching Shopify scraping logic.
    * Set up the database schema for Price History.
    * Handle system architecture documentation and Wiki setup.
 
### **Meeting 3: Mid-Sprint Check-in**
* **Date:** Tuesday, Feb 10th
* **Time:** 7:30 PM - 8:45 PM
* **Agenda:**
    * Review progress on Scrapers and Auth.
    * Discuss "Scope Creep" regarding the scraping engine.
    * **New Task:** Discussed adding a "CSV Export" feature requested by potential users.
* **Updates:**
    * Auth is functional.
    * Scraping is harder than expected due to anti-bot protections.
    * Architecture diagram needed immediately for the report.
* **Changes to Plan:**
    * Added **SCRUM-28 (Export to CSV)** to the sprint as a "Quick Win" feature.
    * Added **SCRUM-27 (Username Database)** to fix a bug where user profiles weren't saving correctly.

---

## 2. Big Stories & User Stories (Sprint 1)

### Big Story #0 (Added): User Authentication & Account Management  
*(SCRUM-22)*

**User Stories**
- SCRUM-23: Add / Retrieve Account Info  
- SCRUM-24: Login / Register Frontend  
- SCRUM-27: Add Username to Database  
- SCRUM-34: Login Page and Register Page UI  

---

### Big Story #1: Competitor Data Ingestion & Scraping Engine  
*(SCRUM-4)*

**User Stories Implemented**
- SCRUM-8: Scrape Competitor Product Price (Shopify / JSON)  
- SCRUM-14: Manual Competitor Configuration  

**User Stories Deprioritized**
- SCRUM-10: Schedule Periodic Scraping (Cron / Worker)  
- SCRUM-20: Implement Universal LLM + HTML-Based Scraping  

---

### Big Story #2: Competitive Intelligence & Analytics Platform  
*(SCRUM-5)*

**User Stories Implemented**
- SCRUM-11: Store and Query Price History  
- SCRUM-12: Price History and Data View (Basic UI)  
- SCRUM-28: Export Product Data to CSV  

**User Stories Planned**
- SCRUM-36: Graphing and Historical Price Trends of Products  

---

### Big Story #3: Pricing Decision Intelligence & Simulation Engine  
*(SCRUM-6)*

**User Stories Planned**
- SCRUM-15: Pricing Engine Scaffolding  
- SCRUM-35: Dynamic Pricing Integration with Ecommerce Services  
- SCRUM-38: Advanced Pricing Modelling – Demand Elasticity  

---

### Big Story #4: Alerts, Integrations & Merchant Workflow  
*(SCRUM-7)*

**User Stories Planned**
- SCRUM-13: Detect Price Changes Between Scrapes  
- SCRUM-37: Live Alerts of Product Pricing and Metadata Changes  

---

## 3. Task Assignments & Story Points (Sprint 1)

### User Authentication & Account Management  
*(Big Story: SCRUM-22)*

| Task ID  | Task Name                                | Story Points | Status |
|---------|-------------------------------------------|-------------:|--------|
| SCRUM-23 | Add / Retrieve Account Info               | 3            | Done   |
| SCRUM-24 | Login / Register Frontend                 | 3            | Done   |
| SCRUM-27 | Add Username to Database                  | 1            | Done   |
| SCRUM-34 | Login Page and Register Page UI           | 1            | Done   |

---

### Competitor Data Ingestion & Scraping Engine  
*(Big Story: SCRUM-4)*

| Task ID  | Task Name                                            | Story Points | Status |
|---------|-------------------------------------------------------|-------------:|--------|
| SCRUM-8  | Scrape Competitor Product Price (Shopify / JSON)      | 5            | Done   |
| SCRUM-9  | Normalize & Store Scraped Product Data                | 3            | Done   |
| SCRUM-14 | Manual Competitor Configuration                       | 3            | Done   |
| SCRUM-20 | Implement Universal LLM + HTML-Based Scraping         | 5            | Deprioritized |
| SCRUM-10 | Schedule Periodic Scraping (Cron / Worker)            | 5            | Deprioritized |

---

### Competitive Intelligence & Analytics Platform  
*(Big Story: SCRUM-5)*

| Task ID  | Task Name                                           | Story Points | Status |
|---------|------------------------------------------------------|-------------:|--------|
| SCRUM-11 | Store and Query Price History                        | 3            | Done   |
| SCRUM-12 | Price History and Data View (Basic UI)               | 3            | Done   |
| SCRUM-28 | Export Product Data to CSV                           | 1            | Done   |
| SCRUM-36 | Graphing and Historical Price Trends of Products     | 4            | Backlog |

---

### Pricing Decision Intelligence & Simulation Engine  
*(Big Story: SCRUM-6)*

| Task ID  | Task Name                                           | Story Points | Status |
|---------|------------------------------------------------------|-------------:|--------|
| SCRUM-15 | Pricing Engine Scaffolding                           | 4            | Deprioritized |
| SCRUM-35 | Dynamic Pricing Integration with Ecommerce Services  | 7            | Backlog |
| SCRUM-38 | Advanced Pricing Modelling: Demand Elasticity        | 6            | Backlog |


---

### Alerts, Integrations & Merchant Workflow  
*(Big Story: SCRUM-7)*

| Task ID  | Task Name                                           | Story Points | Status |
|---------|------------------------------------------------------|-------------:|--------|
| SCRUM-13 | Detect Price Changes Between Scrapes                 | 5            | Deprioritized |
| SCRUM-37 | Live Alerts of Product Pricing and Metadata Changes  | 4.5          | Backlog |



---

## 4. Iteration 2 Log (Sprint 2)

**Iteration Window:** Mon, Mar 9, 2026 - Fri, Mar 13, 2026  
**Sprint:** SCRUM Sprint 2

### 4.1 Meeting Minutes

### Meeting 1: Iteration 2 Planning
- **Date:** Monday, March 9, 2026
- **Time:** 7:00 PM - 8:15 PM

**Agenda**
- Re-prioritize carryover stories from earlier iterations.
- Confirm implementation/testing focus for Iteration 2.
- Break top stories into dev tasks with time estimates.

**Decisions Made**
- Promoted the following stories to active Iteration 2 scope:
- **SCRUM-36** Graphing and Historical Price Trends of Products (**4 SP**)
- **SCRUM-13** Detect Price Changes Between Scrapes (**5 SP**)
- **SCRUM-10** Schedule Periodic Scraping (Cron / Worker) (**5 SP**)
- Corrected Jira naming in notes from `RUM-*` to `SCRUM-*`.

**Action Items**
- Finalize unit/integration testing structure.
- Implement scheduler and tracking-run persistence integration.
- Finish competitor analytics visualization flow.

### Meeting 2: Mid-Iteration Technical Checkpoint
- **Date:** Wednesday, March 11, 2026
- **Time:** 6:30 PM - 7:45 PM

**Agenda**
- Review cron scheduling progress and failure handling.
- Validate scrape run persistence model with tracking runs.
- Confirm test plan split into unit and integration.

**Decisions Made**
- Scheduler runs daily at **01:00 UTC**.
- Single-product scheduled scrapes persist as product-targeted runs through existing save flow.
- Integration tests must run against a dedicated SQLite test DB file.

**Action Items**
- Add scheduler failure-isolation unit tests.
- Add integration tests for tracked products, tracking runs, and product detail history.

### Meeting 3: Documentation and Submission Readiness Review
- **Date:** Thursday, March 12, 2026
- **Time:** 8:00 PM - 9:00 PM

**Agenda**
- Review architecture documentation and UML alignment with current code.
- Verify README setup and test commands for TA reproducibility.
- Check open risks for iteration hand-in.

**Decisions Made**
- Update architecture docs to explicitly map Presentation/Business/Persistence boundaries.
- Keep `log.md` updated per sprint and include planned vs actual task effort.

**Action Items**
- Final pass on tests and docs before push.

### Meeting 4: Final Iteration 2 Triage
- **Date:** Friday, March 13, 2026
- **Time:** 4:30 PM - 5:10 PM

**Agenda**
- Confirm completion status for SCRUM-36, SCRUM-13, SCRUM-10.
- Confirm test execution and known risks.

**Decisions Made**
- Core implementation complete for all three stories.
- Risk accepted: full-repo lint includes legacy issues outside Iteration 2 scope.

---

### 4.2 Iteration 2 Stories and Story Points

| Story ID  | Story Name                                           | Story Points | Iteration 2 Status |
|----------|-------------------------------------------------------|-------------:|--------------------|
| SCRUM-36 | Graphing and Historical Price Trends of Products      | 4            | Completed |
| SCRUM-13 | Detect Price Changes Between Scrapes                  | 5            | Completed |
| SCRUM-10 | Schedule Periodic Scraping (Cron / Worker)           | 5            | Completed |

---

### 4.3 Rationale and Plan Changes for Iteration 2

- **From prior plan to current scope:**
- `SCRUM-36`, `SCRUM-13`, and `SCRUM-10` were moved from backlog/deprioritized to active implementation due customer priority on analytics visibility and automated tracking.

- **Key design decisions this iteration:**
- Kept normalized source model (`source_products`, `source_variants`, `product_observations`) and built analytics/read models on top.
- Added `tracking_runs` as execution/audit layer for scheduled tracking workflows.
- Standardized test organization into `test/unit` and `test/integration` to match iteration requirements.

- **Known concerns/open issues:**
- Some legacy lint issues remain in unrelated older UI files; this does not block execution of unit/integration test suites.

---

### 4.4 Iteration 2 Test/Release Notes

- Added dedicated scripts for test execution:
- `npm run test:unit`
- `npm run test:integration`
- Added integration DB isolation with a dedicated SQLite test file.
- Updated architecture/UML documentation to match current module boundaries and flows.

---

## 5. Iteration 3 Log (Sprint 3)

**Iteration Window:** Team to confirm: Iteration 3 window]  
**Sprint:** SCRUM Sprint 3

### 5.1 Meeting Minutes

### Meeting 1: Iteration 3 Planning
- **Date:** Sample: Friday, March 27, 2026
- **Time:** Sample: 5:00 PM - 6:00 PM

**Agenda**
- Review carryover backlog after Iteration 2.
- Confirm whether the next focus should be broader scraping support, alerting, or matching.
- Reassign work for higher-value end-to-end stories.

**Decisions Made**
- Promote universal scraping support into active scope.
- Prioritize user-facing workflows over additional low-level infrastructure.
- Treat competitor matching and matched-product analysis as the main Iteration 3 differentiators.
- Keep dynamic pricing integration and demand modelling in backlog.

**Action Items**
- Finalize task ownership for matching, tracking, alerts, and auth/account UX improvements.
- Update planning docs to reflect the Iteration 3 shift.

### Meeting 2: Mid-Iteration Technical Checkpoint
- **Date:** Sample: Friday, March 27, 2026
- **Time:** Sample: 5:00 PM - 6:00 PM

**Agenda**
- Review implementation status for matching and analysis workflows.
- Review tracking + alerting flow with scheduled scrapes.
- Review login/account UX issues affecting usability.

**Decisions Made**
- Approved-match persistence would be the source of truth for comparative analysis.
- Product detail pages would become the main drill-down surface for matched analytics.
- Analysis would be kept separate from the landing page to reduce UI confusion.
- Tracking and alerting would continue to reuse the existing scrape persistence model.

**Action Items**
- Finish matched-product comparison UI and unmatch actions.
- Stabilize registration/login feedback and session/logout UX.
- Tighten settings and tracking views.

### Meeting 3: Final Iteration 3 Review
- **Date:** Sample: Friday, March 27, 2026
- **Time:** Sample: 5:00 PM - 6:00 PM

**Agenda**
- Confirm completed Iteration 3 stories.
- Review outstanding backlog items.
- Verify unit/integration coverage and documentation updates.

**Decisions Made**
- Universal scraping, matching, comparative analytics, tracking workflows, and UX hardening counted as the major Iteration 3 outcomes.
- Dynamic pricing integration and advanced pricing modelling remain future work.
- The analysis page replaces a more generic overview direction for competitor comparison.

**Action Items**
- Finalize take-home assignment documentation.
- Update logs and iteration planning notes.

---

### 5.2 Iteration 3 Stories and Story Points

| Story ID / Name | Main Developer | Story Points | Iteration 3 Status |
| --- | --- | ---: | --- |
| Implement universal LLM + HTML-based scraping functionality | Abdelrahman Eissa | 5.0 | Completed |
| Competitor Matching System | Yousif Al-dakoki | 6.0 | Completed |
| Comparative Historical Analytics for Matched Products | Yousif Al-dakoki | 2.0 | Completed |
| Added tracking backend to track products in the database | Abdelrahman Eissa | 2.0 | Completed |
| Live alerts of product pricing and metadata changes | Abdelrahman Eissa | 4.5 | Partially Completed |
| Email Alerts | Abdelrahman Eissa | 3.0 | Completed |
| Update Login Component: Authentication UI Feedback & Routing Fix | sachin aingaran | Not estimated | Completed |
| Account Page UI/UX Improvements | Varrshan Preshanthan | 1.0 | Completed |
| Log Out Confirmation Pop Window | Varrshan Preshanthan | 1.0 | Completed |
| Overview on competitor catalogues / matched analysis | Yousif Al-dakoki | 2.0 | Completed |
| Pricing Engine Scaffolding | Yousif Al-dakoki | 3.0 | Completed |
| Dynamic pricing integration with ecommerce services | Unassigned | 7.0 | Backlog |
| Advanced pricing modelling: demand elasticity | Unassigned | 6.0 | Backlog |

---

### 5.3 Rationale and Plan Changes for Iteration 3

- **From prior plan to current scope:**
- Universal scraping was promoted because store support limited to Shopify/WooCommerce JSON was too restrictive for broader competitor coverage.
- Matching and matched-product analytics were promoted because raw product history alone was not enough to support direct competitor comparison.
- Tracking and alerting were expanded so the app could move from passive reporting into operational monitoring.
- A generic overview direction was narrowed into a more focused matched-analysis surface after usability feedback.

- **Key design decisions this iteration:**
- Reused the existing normalized product/history model rather than introducing a separate analytics datastore.
- Treated approved matches as the source of truth for comparative analysis.
- Used product detail pages as the main comparison drill-down for matched products and historical overlays.
- Kept alerting on top of scheduled scraping and tracked items instead of building a separate eventing subsystem.
- Preserved user-scoped data access throughout matching, tracking, product details, and analysis flows.

- **Known concerns / open issues:**
- Dynamic pricing integration is still not implemented end-to-end.
- Advanced demand modelling remains backlog work.
- Some reporting and documentation fields below still require final confirmation from the team.

---

### 5.4 Task Assignments and Development Tasks per User Story (Iteration 3)

| User Story | Main Developer | Development Tasks Completed |
| --- | --- | --- |
| Implement universal LLM + HTML-based scraping functionality | Abdelrahman Eissa | Added HTML/LLM scraping path, integrated it into scrape execution flow, persisted outputs through existing save pipeline |
| Competitor Matching System | Yousif Al-dakoki | Built matching workflow, match approval/unmatch flow, matching table updates, loading state improvements |
| Comparative Historical Analytics for Matched Products | Yousif Al-dakoki | Added matched-product table on details page, delta comparison, toggleable matched history overlays, dedicated analysis page |
| Added tracking backend to track products in the database | Abdelrahman Eissa | Added tracking persistence, tracked product/store flows, recent delta surfaces, tracking API support |
| Live alerts of product pricing and metadata changes / Email Alerts | Abdelrahman Eissa | Connected scheduled scrapes to email alert flow, compared old vs new tracked prices, handled alert dispatch paths |
| Update Login Component: Authentication UI Feedback & Routing Fix | sachin aingaran | Added login feedback messaging, improved auth route behavior, tightened registration/login UX |
| Account Page UI/UX Improvements / Add username to the database | Varrshan Preshanthan / Abdelrahman Eissa | Updated account display, username presentation, initials/avatar behavior, account detail polish |
| Log Out Confirmation Pop Window | Varrshan Preshanthan | Added logout confirmation flow in auth/account UI |
| Overview on competitor catalogues / matched analysis | Yousif Al-dakoki | Reframed overview into analysis page, added current gap sorting/filtering, unmatch action, comparison-focused table UX |
| Pricing Engine Scaffolding | Yousif Al-dakoki | Added pricing engine scaffolding/interfaces needed for future pricing automation |

---

### 5.5 Planned vs Actual Time by Development Task (Iteration 3)

> The values below are estimated planning and actual effort values based on the implemented Iteration 3 scope.

| User Story | Development Task | Originally Allocated Time | Actual Time Spent |
| --- | --- | ---: | ---: |
| Implement universal LLM + HTML-based scraping functionality | Research and support HTML/LLM scraping path | 6 | 8 |
| Implement universal LLM + HTML-based scraping functionality | Integrate persistence and scrape execution | 4 | 5 |
| Competitor Matching System | Matching retrieval, approval, and unmatch flow | 6 | 8 |
| Competitor Matching System | Matching page UI and loading-state work | 4 | 6 |
| Comparative Historical Analytics for Matched Products | Matched table and delta comparison in product details | 2 | 3 |
| Comparative Historical Analytics for Matched Products | History overlays and analysis page work | 2 | 4 |
| Added tracking backend to track products in the database | Tracking persistence and API routes | 3 | 4 |
| Added tracking backend to track products in the database | Recent delta views and tracking UI support | 2 | 3 |
| Live alerts of product pricing and metadata changes / Email Alerts | Email alert dispatch on tracked price changes | 4 | 5 |
| Update Login Component: Authentication UI Feedback & Routing Fix | Login/register feedback and routing fixes | 3 | 4 |
| Account Page UI/UX Improvements / Add username to the database | Account page polish and username display | 2 | 2 |
| Log Out Confirmation Pop Window | Confirmation modal and auth UX integration | 1 | 1.5 |
| Overview on competitor catalogues / matched analysis | Analysis-page table, filters, actions, and polish | 4 | 6 |
| Pricing Engine Scaffolding | Pricing interfaces and scaffolding support | 3 | 3 |

---

### 5.6 Iteration 3 Test / Release Notes

- Matching, analysis, tracking, and product-detail flows were expanded and refined during Iteration 3.
- Auth/account UX was tightened to reduce misleading navigation and improve session clarity.
- Recent maintenance work also removed hidden scheduler initialization side effects from the tracked-products API route and tightened the registration error flow.
- Final planned-vs-actual time accounting and meeting attendance still need to be filled in from the team's own records before submission.




