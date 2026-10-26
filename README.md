<div align="center">

<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />

# 🛡️ RONIGUARD REAL - Advanced Lua Script Obfuscation & Security Suite

**Next-Generation Lua Protection, Cloud Air-Gap Sentinel Gatekeeper, HWID Licensing & Discord Integration**

</div>

---

## ⚡ Overview

**RONIGUARD REAL** is an enterprise-grade Lua security framework designed to protect Lua scripts, exploit scripts, and game utilities from unauthorized decompilation, source leaks, and reverse-engineering.

### 🔒 Core Modules

1. **Military-Grade Lua Obfuscation Engine**
   - **Polymorphic Variable & Identifier Mangling**: Rewrites variables and tables into unreadable byte hashes and unicode noise.
   - **Bytecode Flattening & Control Flow Encryption**: Flattens execution graphs to break static analysis and decompilers.
   - **Dynamic String Encryption**: Encrypts all strings into multi-layer XOR and byte sequences resolved only at runtime.
   - **Dead Code & Junk Instruction Injection**: Injects deceptive control paths and fake conditionals.
   - **Anti-Tamper & Anti-Hook Protections**: Detects hook libraries, function environment modifications, and debug hooks.
   - **Anti-Debug / VM Integrity Verification**: Halts execution instantly if tamper is detected.

2. **Air-Gap Sentinel Cloud Gatekeeper (`/api/loader/raw/:id`)**
   - Scripts are protected by an air-gapped loader mechanism.
   - Access is restricted with owner verification (`ronizz.edit@gmail.com`).
   - Unauthorized attempts without the verified clearance token receive an immediate `401 Unauthorized - Access Denied` response, ensuring source code remains inaccessible to unauthorized users.

3. **Client-Side Drag & Drop File Obfuscation**
   - Upload any `.lua`, `.txt`, `.luau` files directly via file picker or drag-and-drop.
   - Immediate real-time obfuscation with downloadable outputs and live loadstring code generators.

4. **Discord Bot Guard Integration**
   - Discord Bot syncs directly with the RONIGUARD dashboard.
   - Slash commands for key generation, panel status, HWID resets, and blacklist enforcement.

5. **HWID Licensing & Key Manager**
   - Hardware ID locking with customizable reset limits.
   - Multi-tier panels (Standard, Premium, Enterprise).
   - Instant license invalidation and blacklist management.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ / Bun / npm

### Installation
```bash
# Clone the repository
git clone https://github.com/RONI711-glitch/RONIGUARDREAL.git

# Enter project directory
cd RONIGUARDREAL

# Install dependencies
npm install

# Start the full-stack server
npm run dev
```

### Environment Variables
Configure your `.env` file (see `.env.example`):
```env
PORT=3000
DISCORD_BOT_TOKEN=your_bot_token_here
OWNER_EMAIL=ronizz.edit@gmail.com
```

---

## 💻 Tech Stack
- **Frontend**: React 18, TypeScript, Tailwind CSS, Lucide Icons, Vite
- **Backend**: Node.js Express server, TSX runtime
- **Discord**: Discord.js REST & Gateway integration
- **Obfuscation**: Custom AST-like Lua transformation engine

---

## 🛡️ License
Private proprietary security software developed for RONIGUARD. Unauthorized distribution or copying is strictly prohibited.
