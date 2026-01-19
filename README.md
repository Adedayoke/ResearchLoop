# 🌀 ResearchLoop
### The Autonomous Paper-to-Code Orchestrator for the Action Era

> **Closing the "Translation Gap" between academic theory and verified execution.**

ResearchLoop is an autonomous research engineering agent built for the **Gemini 3 Hackathon**. It moves beyond the "Chatbot Era" and enters the **Action Era**, treating dense academic PDFs not as text to be summarized, but as logic to be extracted, synthesized, and verified in a live browser runtime.

---

## 🏛 The Vision: Beyond the Wrapper
Google DeepMind's Gemini 3 signals a shift from static chat to **autonomous agents that plan and execute**. ResearchLoop is built on this premise. Most AI tools summarize papers; ResearchLoop **proves them**.

By combining **Gemini 3 Pro’s high-thinking reasoning** with a **browser-based WASM (Pyodide) sandbox**, we’ve created a "Self-Correcting Marathon Agent" that iterates on code implementation until the mathematical logic converges with the paper’s methodology.

---

## 🚀 Hackathon Strategic Tracks

### 🧠 The Marathon Agent (Autonomous Continuity)
ResearchLoop doesn't give up on the first syntax error. It utilizes Gemini 3’s deep reasoning to maintain state across a **multi-step self-correction loop**. If the code fails in the WASM sandbox, the agent analyzes the traceback, re-evaluates the paper's equations, and repairs the logic autonomously.

### ☯️ Vibe Engineering (Verified Artifacts)
Following the "Antigravity" philosophy, ResearchLoop builds **verified artifacts**. We don't just output code; we output *working* code. The agent verifies its own synthesis through autonomous testing loops, ensuring that the "vibe" of the paper matches the reality of the execution.

### 🎨 Creative Autopilot (Multimodal Blueprints)
We leverage the full Gemini 3 multimodal stack:
*   **High-Fidelity Blueprints:** Using `gemini-2.5-flash-image` to generate 2D technical schematics and data-flow diagrams from extracted methodologies.
*   **Voice Theory Maps:** Using `gemini-2.5-flash-preview-tts` to synthesize "Puck" neural audio explanations, making complex implementation logic accessible to the ears, not just the eyes.

---

## 🛠 How It Works (Technical Execution)

1.  **Multimodal Ingestion:** Gemini 3 analyzes the PDF, extracting latent variables and pseudocode.
2.  **Reasoning-Heavy Synthesis:** Using a high `thinkingBudget`, the agent maps abstract LaTeX equations to Python/NumPy logic.
3.  **WASM Verification:** The code is executed in an isolated **Pyodide (Python 3.10) runtime** within the browser.
4.  **Diagnostic Feedback Loop:** 
    *   *Success?* Move to visualization.
    *   *Failure?* The agent ingests the raw traceback, identifies the conceptual misalignment, and initiates a repair cycle (up to 5 iterations).
5.  **Multimodal Grounding:** Integrated `googleSearch` grounding verifies benchmarks and citations against the live web.

---

## ⚖️ Judging Criteria Alignment

*   **Technical Execution:** Zero-dependency WASM execution + deep reasoning integration. High-quality modular Python output.
*   **Innovation / Wow Factor:** Moving from "RAG" to "Autonomous Orchestration." The "Theory Map" feature that links equations directly to code lines is a unique implementation of multimodal reasoning.
*   **Potential Impact:** Accelerates the speed of research-to-production for engineers, students, and scientists worldwide.
*   **Presentation / Demo:** A brutalist, academic-focused UI that exposes the "Internal State Representation" of the agent's mind.

---

## 📖 Getting Started

1.  **Drop a PDF:** Upload a dense research paper (e.g., *Attention is All You Need* or *Adam Optimizer*).
2.  **Watch the Loop:** Monitor the "Agent Logs" as it fights through implementation hurdles and WASM tracebacks.
3.  **Explore the Artifacts:** View the generated architecture, hear the theory map, and inspect the live memory state of the verified logic.

---
*Built with ❤️ for the Google DeepMind Gemini 3 Hackathon 2025.*