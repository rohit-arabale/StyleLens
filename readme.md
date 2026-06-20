<div align="center">
  <img src="./StyleLens_Logo.webp" alt="StyleLens Logo" width="200" height="200" style="margin: 20px 0;" />
  
  # StyleLens — AI Virtual Try-On SaaS
  ### Developed by Rohit Arabale

> **"See clothes on YOU before buying."**
> Reduce return rates by up to 30% and boost shopping confidence with our AI-powered virtual try-on experience.

</div>

---

[![Status](https://img.shields.io/badge/Status-R%26D_Complete-brightgreen)](#)
[![Version](https://img.shields.io/badge/Version-1.0_MVP-white)](#)
[![Platform](https://img.shields.io/badge/Platform-Chrome_Extension_%7C_Web-lightgreen)](#)

---

## 🚀 Experience Fashion, Reimagined

**StyleLens** is a comprehensive virtual try-on ecosystem designed for the modern online shopper. Whether you're browsing your favorite fashion store or managing your personal style gallery, **StyleLens** makes it seamless to visualize any garment on yourself instantly.

**Project Developer:** Rohit Arabale

### Core Features

- **✨ Instant Try-On**: Drag and drop any garment from any website directly into our Chrome Extension.
- **🖼️ Identity Preservation**: Our advanced AI pipeline (powered by Gemini & Vertex AI) keeps your face, pose, and lighting perfectly intact.
- **📱 Personal Dashboard**: Manage your selfies, generation history, and find "Shop Similar" affiliate links in our refined web app.
- **⚡ Performance First**: Optimized for < 3s generation speeds with smart caching and CDN delivery.

---

## 🛠️ The Ecosystem

### 🧩 [Chrome Extension](./extension/)

- **Manifest V3**: Fast, secure, and lightweight.
- **Zero-Friction**: Works on any fashion e-commerce site out of the box.
- **Preview & Save**: Download your styles or save them to your cloud history.

### 🌐 [Web Dashboard](./frontend/)

- **Onboarding**: Upload your secure base selfie for all future try-ons.
- **History Gallery**: A curated grid of your style experiments.
- **Account Management**: Full GDPR-compliant data export and deletion.

### ⚙️ [Backend Orchestration](./backend/)

- **AI Engine**: Gemini 2.5 Flash Image orchestration with custom vision parsers.
- **Storage**: GCS-backed media lifecycle with Cloud CDN optimization.
- **Database**: Firestore-powered user and generation metadata.

---

## 📅 Roadmap (Coming Soon)

- [ ] **B2B API Integration**: Letting merchants embed StyleLens directly into their product pages.
- [ ] **Advanced Fit Analysis**: AI-powered size recommendations based on try-on results.
- [ ] **OOTDiffusion Fallback**: Open-source high-fidelity generation when primary models are busy.
- [ ] **Multi-Garment Layering**: Try on a full outfit (top + bottom + accessories) simultaneously.

---

## 🔒 Security & Privacy

We hash biometric data and never store raw face embeddings. All data is handled via TLS 1.3, and users have complete control over their data lifecycle, including instant deletion of selfies and history.

---

## 🚧 Status: Coming Soon

**StyleLens** is currently in active development. We are refining the AI vision pipeline to ensure the highest fidelity garment replication.

- **Target Public Alpha**: Q1 2026
- **Current Status**: Backend orchestrator and Extension scaffold complete.

---

<div align="center">
  <p>© 2026 StyleLens Virtual Try-On. Developed by Rohit Arabale.</p>
</div>
