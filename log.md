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
