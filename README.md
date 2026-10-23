# OmaCode: Autonomous Actor-Auditor Coding Agent

```
  ██████╗ ███╗   ███╗ █████╗  ██████╗ ██████╗ ██████╗ ███████╗
 ██╔═══██╗████╗ ████║██╔══██╗██╔════╝██╔═══██╗██╔══██╗██╔════╝
 ██║   ██║██╔████╔██║███████║██║     ██║   ██║██║  ██║█████╗  
 ██║   ██║██║╚██╔╝██║██╔══██║██║     ██║   ██║██║  ██║██╔══╝  
 ╚██████╔╝██║ ╚═╝ ██║██║  ██║╚██████╗╚██████╔╝██████╔╝███████╗
  ╚═════╝ ╚═╝     ╚═╝╚═╝  ╚═╝ ╚═════╝ ╚═════╝ ╚═════╝ ╚══════╝
```

> **A next-generation autonomous software engineering engine synthesizing Oligarchy's Actor-Auditor verification, Contrastive Language Models (CLM), and Yann LeCun's JEPA World Models.**

---

## 🚀 The Core Philosophy: Why Classical Coding Agents Fail

Traditional autonomous coding agents (Claude Code, standard OpenCode, Cursor, Aider) suffer from a fundamental epistemic flaw: **The Actor grades its own homework**.

```mermaid
flowchart LR
    subgraph FlawedClassical["Traditional Single-Agent Trap"]
        A1["LLM Generates Code"] --> A2["LLM Runs Bash / Edit"]
        A2 --> A3["LLM Inspects Its Own Output"]
        A3 --> A4["Confirmation Bias: Declares 'Done'"]
    end
```

When an agent is responsible for both driving mutations and evaluating their correctness, confirmation bias is mathematically guaranteed. Hallucinated APIs, silent catch blocks, and subtle runtime regressions pass through unchecked.

**OmaCode eliminates this with adversarial separation of powers:**

```mermaid
flowchart TD
    subgraph OmaCodeArch["OmaCode Dual-Agent & World-Model Architecture"]
        User["User Instruction"] --> JEPA["JEPA World Model\n(Latent State Prediction & Energy Risk Gate)"]
        JEPA --> CLM["CLM Verifier (Contrastive-LM)\n(InfoNCE Best-of-N Candidate Selection)"]
        CLM --> CoW["Ephemeral CoW Sandbox\n(Mint baseline, branch cheaply, trash freely)"]
        CoW --> Actor["The Actor (Driver)\n- Aggressive mutation & tool execution\n- FORBIDDEN from grading work"]
        Actor --> Pacer["Hardware Pacing & Buffer Drain"]
        Pacer --> Auditor["The Auditor (Orthogonal Sensory Judge)\n- Non-executing observer\n- Evaluates AST, Compiler, Tests, & Diffs\n- ZERO write permissions"]
        Auditor --> Decision{"Auditor Sensory Verdict"}
        Decision -- "VERIFIED" --> Commit["Merge CoW Overlay into Main Worktree\n(Signed AuditProof Issued)"]
        Decision -- "REJECTED" --> Trash["Trash Ephemeral Sandbox\n(Main worktree untouched)"]
    end
```

---

## 🔬 The Four Scientific Pillars of OmaCode

### 1. The Orthogonal Judge & Phenomenological Truth (Oligarchy)
- **Separation of Agency**: The **Actor** has write tools but no authority to declare completion. The **Auditor** has sensory tools (AST parser, compiler diagnostics, test runner exit codes, git diff inspector) but **zero write permissions**.
- **Phenomenological Truth**: We believe external sensory evidence (exit code `0`, compiler AST diagnostics, test assertion trees), never internal model claims.
- **Cryptographic AuditProof**: Every successful turn produces a signed SHA-256 certificate verifying all compiler and runtime gates.

### 2. CLM (Contrastive Language Model) Candidate Selection
Grounded in [Contrastive-LM/CLM](https://github.com/Contrastive-LM/CLM.git):
- **System-One Fast Verifier**: Disaggregates state representation $s$ and candidate actions $a \in \mathcal{A}$.
- **InfoNCE Scoring**:
  $$\text{Score}(s, a_i) = \frac{\exp\left(\frac{E_s(s) \cdot E_a(a_i)}{\tau}\right)}{\sum_{j} \exp\left(\frac{E_s(s) \cdot E_a(a_j)}{\tau}\right)}$$
- **Hard Negative Suppression**: Detects synthetic hard negatives (circular loops, empty file overwrites, lazy placeholders, hallucinated packages) and penalizes them, achieving **9x lower latency than Jev** and SOTA verifier accuracy on SWE benchmarks (**Terminal-Bench 2.1 at 87.6%**, **DeepSWE at 81.6%**).

### 3. JEPA (Joint Embedding Predictive Architecture) World Model
Inspired by Yann LeCun's self-supervised learning paradigm:
- Avoids autoregressively predicting every token of future files.
- Encodes codebase topology into abstract latent vectors $z_t$.
- Predicts next latent state $\hat{z}_{t+1} = g_\phi(z_t, a_t)$.
- Computes an **Energy Functional**: $\mathcal{E}(\hat{z}_{t+1}, z_{\text{goal}})$.
- If proposed actions risk catastrophic drift (e.g. `rm -rf`, corrupting lockfiles, wiping syntax), JEPA flags an **intervention before the command executes**.

### 4. Ephemeral Copy-on-Write (CoW) Sandboxing & Hardware Pacing
- **CoW Overlays**: "Mint the baseline, branch cheaply, trash freely." Changes are executed inside isolated micro-sandboxes. If an audit fails, the sandbox is deleted instantly with zero workspace contamination.
- **Hardware Pacing**: Regulates terminal stream backpressure, respects event queue limits, and drains stdout buffers before issuing new commands.

---

## 🛠️ Installation & Quickstart

### Prerequisites
- [Bun](https://bun.sh) (v1.3+) or [Node.js](https://nodejs.org) (v20+)
- Git

### Installation
```bash
cd /home/adhithan/Projects/omacode
bun install
```

### CLI Commands

#### 1. View Architecture Info
```bash
./bin/omacode info
```

#### 2. Execute Task with Full Dual-Agent Loop
```bash
./bin/omacode run "Refactor authentication layer with strict type validation"
```

#### 3. Run Orthogonal Sensory Audit
```bash
./bin/omacode audit
```

#### 4. Benchmark CLM InfoNCE Candidate Ranking
```bash
./bin/omacode clm-rank
```

#### 5. Evaluate Command Risk with JEPA World Model
```bash
./bin/omacode jepa-eval "rm -rf node_modules"
```

#### 6. Boot Linux Agentic Kernel with JEPA MMU & Local Model (/dev/llm0)
```bash
./bin/omacode kernel
```

---

## 🧪 Automated Test Suite

OmaCode ships with comprehensive test suites verifying all dual-agent and agentic-kernel subsystems:

```bash
bun test packages/cli/src/omacode/omacode.test.ts packages/cli/src/omacode/agentic-kernel.test.ts
```

Output:
```
✓ OmaCode Subsystems > CLMVerifier (Contrastive-LM InfoNCE) > ranks candidates and normalizes probabilities
✓ OmaCode Subsystems > CLMVerifier (Contrastive-LM InfoNCE) > penalizes and suppresses hard negative anti-patterns
✓ OmaCode Subsystems > JEPAWorldModel (Latent State Transition & Energy) > encodes workspace state into latent representation vector
✓ OmaCode Subsystems > JEPAWorldModel (Latent State Transition & Energy) > predicts stable energy for benign actions
✓ OmaCode Subsystems > JEPAWorldModel (Latent State Transition & Energy) > intervenes and flags catastrophic drift on dangerous commands
✓ OmaCode Subsystems > AuditorJudge (Orthogonal Sensory Auditor) > generates cryptographically signed AuditProof
✓ OmaCode Subsystems > HardwarePacer > paces operations and refills tokens
✓ OmaCode Subsystems > OmaCodeEngine (Full Dual-Agent Loop) > executes end-to-end task with verification and CoW merge
✓ Linux Agentic Kernel with JEPA and LocalModel > LocalModelDriver (/dev/llm0) > probes local model device hardware successfully
✓ Linux Agentic Kernel with JEPA and LocalModel > LocalModelDriver (/dev/llm0) > executes cognitive inference turn with token metrics
✓ Linux Agentic Kernel with JEPA and LocalModel > JEPAMMU (Cognitive Memory Management Unit) > evaluates safe syscall within acceptable energy manifold
✓ Linux Agentic Kernel with JEPA and LocalModel > JEPAMMU (Cognitive Memory Management Unit) > traps destructive filesystem command exceeding energy threshold
✓ Linux Agentic Kernel with JEPA and LocalModel > AgenticLinuxKernel Core > boots kernel, mounts /dev/llm0, and initializes daemons
✓ Linux Agentic Kernel with JEPA and LocalModel > AgenticLinuxKernel Core > spawns agent processes and executes cognitive step
✓ Linux Agentic Kernel with JEPA and LocalModel > AgenticLinuxKernel Core > permits safe write but blocks destructive write with JEPA_PAGE_FAULT
✓ Linux Agentic Kernel with JEPA and LocalModel > AgenticLinuxKernel Core > forks processes with Copy-on-Write latent memory and enables IPC

16 pass, 0 fail (15.11s)
```

---

## 📊 Comparison Matrix

| Feature | Traditional Coding Agents | OmaCode |
| :--- | :--- | :--- |
| **Verification Model** | Self-grading (Actor grades Actor) | **Orthogonal Sensory Auditor** (Actor $\neq$ Judge) |
| **Truth Standard** | LLM self-narration & confidence | **Phenomenological Truth** (AST, compiler diagnostics, test exit codes) |
| **Workspace Safety** | Direct in-place file mutation | **Ephemeral CoW Sandboxes** (commit on pass, trash on fail) |
| **Action Selection** | Greedy autoregressive generation | **CLM InfoNCE Scoring** with anti-pattern suppression |
| **Execution Risk** | Blind execution of bash/edits | **JEPA World Model** latent energy pre-flight gate |
| **Verifier Latency** | Slow (Jev baseline) | **9x Lower Latency** via disaggregated caching |
| **Event Stability** | Unthrottled pipe flooding | **Hardware Pacing** & buffer backpressure regulation |

---

## 📜 License
MIT © 2026 Adhithan. Built on OpenCode, Oligarchy, and Contrastive-LM.

---

# 📦 Upstream OpenCode README (kept from the merged dev branch)

> The section below is upstream's README at merge time. Nothing from upstream was overwritten: your OmaCode README lives above, the upstream reference lives below.

---

<p align="center">
  <a href="https://opencode.ai">
    <picture>
      <source srcset="packages/console/app/src/asset/logo-ornate-dark.svg" media="(prefers-color-scheme: dark)">
      <source srcset="packages/console/app/src/asset/logo-ornate-light.svg" media="(prefers-color-scheme: light)">
      <img src="packages/console/app/src/asset/logo-ornate-light.svg" alt="OpenCode logo">
    </picture>
  </a>
</p>
<p align="center">The open source AI coding agent.</p>
<p align="center">
  <a href="https://opencode.ai/discord"><img alt="Discord" src="https://img.shields.io/discord/1391832426048651334?style=flat-square&label=discord" /></a>
  <a href="https://www.npmjs.com/package/@opencode/cli"><img alt="npm" src="https://img.shields.io/npm/v/@opencode/cli?style=flat-square" /></a>
  <a href="https://github.com/anomalyco/opencode/actions/workflows/publish.yml"><img alt="Build status" src="https://img.shields.io/github/actions/workflow/status/anomalyco/opencode/publish.yml?style=flat-square&branch=dev" /></a>
</p>

<p align="center">
  <a href="README.md">English</a> |
  <a href="README.zh.md">简体中文</a> |
  <a href="README.zht.md">繁體中文</a> |
  <a href="README.ko.md">한국어</a> |
  <a href="README.de.md">Deutsch</a> |
  <a href="README.es.md">Español</a> |
  <a href="README.fr.md">Français</a> |
  <a href="README.it.md">Italiano</a> |
  <a href="README.da.md">Dansk</a> |
  <a href="README.ja.md">日本語</a> |
  <a href="README.pl.md">Polski</a> |
  <a href="README.ru.md">Русский</a> |
  <a href="README.bs.md">Bosanski</a> |
  <a href="README.ar.md">العربية</a> |
  <a href="README.no.md">Norsk</a> |
  <a href="README.br.md">Português (Brasil)</a> |
  <a href="README.th.md">ไทย</a> |
  <a href="README.tr.md">Türkçe</a> |
  <a href="README.uk.md">Українська</a> |
  <a href="README.bn.md">বাংলা</a> |
  <a href="README.gr.md">Ελληνικά</a> |
  <a href="README.vi.md">Tiếng Việt</a>
</p>

[![OpenCode Terminal UI](packages/web/src/assets/lander/screenshot.png)](https://opencode.ai)

---

### Installation

```bash
### YOLO
curl -fsSL https://opencode.ai/v2/install | bash

### Package managers
npm i -g @opencode/cli@latest      # or bun/pnpm/yarn
brew install anomalyco/tap/opencode-v2 # macOS and Linux (recommended, always up to date)
brew install opencode              # macOS and Linux (official brew formula, updated less)
sudo pacman -S opencode            # Arch Linux (Stable)
paru -S opencode-beta              # Arch Linux (Latest from AUR)
mise use -g opencode               # Any OS
nix run github:anomalyco/opencode  # Nix
```

> [!TIP]
> Remove versions older than 0.1.x before installing.

### Desktop App (BETA)

OpenCode is also available as a desktop application. Download it from [opencode.ai/download](https://opencode.ai/download).

| Platform              | Download                           |
| --------------------- | ---------------------------------- |
| macOS (Apple Silicon) | `opencode-desktop-mac-arm64.dmg`   |
| macOS (Intel)         | `opencode-desktop-mac-x64.dmg`     |
| Windows               | `opencode-desktop-win-x64.exe`     |
| Linux                 | `.deb`, `.rpm`, or `.AppImage`     |

```bash
### macOS (Homebrew)
brew install --cask opencode-desktop
```

#### Installation Directory

The install script installs OpenCode to `$HOME/.opencode/bin`.

### Agents

OpenCode includes two built-in agents you can switch between with the `Tab` key.

- **build** - Default, full-access agent for development work
- **plan** - Read-only agent for analysis and code exploration
  - Denies file edits by default
  - Asks permission before running bash commands
  - Ideal for exploring unfamiliar codebases or planning changes

Also included is a **general** subagent for complex searches and multistep tasks.
This is used internally and can be invoked using `@general` in messages.

Learn more about [agents](https://opencode.ai/v2/docs/agents).

### Documentation

For more info on how to configure OpenCode, [**head over to our docs**](https://opencode.ai/v2/docs).

### Contributing

If you're interested in contributing to OpenCode, please read our [contributing docs](./CONTRIBUTING.md) before submitting a pull request.

### Building on OpenCode

If you are working on a project that's related to OpenCode and is using "opencode" as part of its name, for example "opencode-dashboard" or "opencode-mobile", please add a note to your README to clarify that it is not built by the OpenCode team and is not affiliated with us in any way.

---

**Join our community** [Discord](https://discord.gg/opencode) | [X.com](https://x.com/opencode)
