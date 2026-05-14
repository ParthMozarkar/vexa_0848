# VEXA Enterprise Fashion Intelligence

![VEXA Architecture](docs/diagrams/architecture.png)

VEXA is an enterprise-grade AI infrastructure platform designed to power the next generation of virtual try-on, automated styling, and intelligent wardrobe management. Built on a serverless-first, edge-optimized architecture, VEXA decouples product experiences from underlying AI providers to create a resilient, highly scalable platform.

## 📚 Engineering Documentation

The complete VEXA engineering documentation hub is located in the `/docs` directory. It contains production-grade architecture overviews, scaling strategies, and onboarding guides.

👉 **[Go to the Documentation Hub](docs/README.md)**

### Quick Links for Investors & Advisors
- [Technical Overview & Strategic Infrastructure](docs/TECHNICAL_OVERVIEW.md)
- [System Capabilities](docs/SYSTEM_CAPABILITIES.md)

### Quick Links for Engineering
- [System Architecture Topology](docs/architecture/SYSTEM_ARCHITECTURE.md)
- [AI Pipeline & Orchestration](docs/ai/AI_PIPELINE_DOCS.md)
- [Database ER Diagrams](docs/architecture/DATABASE_ARCHITECTURE.md)
- [Local Setup & Onboarding](docs/onboarding/LOCAL_SETUP.md)

## 📁 Repository Structure

- **`/frontend`**: Core Next.js 15 App Router application (Client, API edge, Orchestration).
- **`/docs`**: Comprehensive architectural documentation and diagrams.
- **`/supabase`**: Database migrations and configuration.
- **`/vexa-mobile-sdk`**: Embeddable mobile tools.

## 🚀 Getting Started Locally

Please refer to the [Local Setup Guide](docs/onboarding/LOCAL_SETUP.md) for full instructions on configuring your environment variables, installing dependencies, and running the development server.

```bash
cd frontend
npm install
npm run dev
```

---
*VEXA — Scalable Fashion Intelligence.*