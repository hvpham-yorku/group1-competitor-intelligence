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
* **Date:** Monday, Feb 3rd
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


