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


