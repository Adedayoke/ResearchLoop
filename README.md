# 🌀 ResearchLoop

> **Autonomous Synthesis of Theoretical Papers into Verified Technical Blueprints.**

ResearchLoop is a world-class autonomous research engineering agent designed for the **Gemini API Developer Competition**. It bridges the massive gap between static academic PDFs and production-ready code through a high-fidelity **Reasoning & Multimodal Execution Loop**.

---

## 🏛 The Research Manifesto
Theoretical knowledge is often trapped in PDFs. The complexity of modern research makes manual implementation prone to "translation loss." 

**ResearchLoop** treats academic implementation as a closed-loop verification problem. It doesn't just "chat"—it **reasons, executes, and corrects** in a sandboxed WASM environment until the mathematical logic converges with reported benchmarks.

---

## 🚀 Key Features

### 1. Autonomous 8-Cycle Reasoning Loop
Powered by **Gemini 3 Pro**, the agent enters a deep thinking state (up to 32k tokens) to:
*   **Self-Correct:** Executes synthesized code in a browser-based WASM (Pyodide) container.
*   **Traceback Analysis:** If a runtime error occurs, the agent analyzes the memory state, repairs the logic, and re-executes automatically.
*   **Stability Convergence:** Tracks "Logic Stability" over multiple iterations to ensure parity with the paper.

### 2. Multimodal "Pro" Suite
*   **2K Architecture Visualizer:** Uses `gemini-3-pro-image-preview` to generate high-fidelity technical blueprints and data-flow schematics directly from paper methodologies.
*   **Audio Theory Maps:** Leverages `gemini-2.5-flash-preview-tts` to synthesize spoken neural explanations of complex logic, making theory accessible via "Voice-over-Code."
*   **Search Grounding:** Integrated `googleSearch` tool verifies academic claims against live web sources and citations.

### 3. The "Explainer" Interface
*   **Theory-to-Syntax Linkage:** A brutalist academic dashboard that maps abstract LaTeX equations directly to their Python implementation blocks.
*   **Runtime State Inspector:** Live memory snapshot showing active WASM tensors, variables, and scalar values.
*   **Agent Journey:** A chronological evolution map showing how the agent's logic matured through each correction cycle.

---

## 🛠 Technical Stack

*   **Core Reasoning:** `gemini-3-pro-preview` & `gemini-3-flash-preview`.
*   **Multimodal Assets:** `gemini-3-pro-image-preview` (2K Imaging) & `gemini-2.5-flash-preview-tts` (Audio).
*   **WASM Sandbox:** Pyodide (Python 3.10) + NumPy.
*   **Frontend:** React 19, Tailwind CSS (Academic Brutalist UI).
*   **Visuals:** Recharts & Marked (Markdown rendering).

---

## 📂 System Architecture

1.  **Ingestion:** Multimodal PDF analysis via Gemini.
2.  **Synthesis:** Generation of a modular Python class and a companion test suite.
3.  **Verification:** Execution in an isolated WASM runtime.
4.  **Grounding:** Web-based verification of benchmarks and sources.
5.  **Visualization:** Synthesis of 2K architecture diagrams and audio maps.
6.  **Convergent Export:** Delivery of a verified, runnable `.py` module.

---

## 📖 How to Use

1.  **Upload:** Drop a dense research PDF (e.g., *Transformer*, *Adam*, or *K-Means++*).
2.  **Monitor:** Watch the "Internal State Representation" as the agent runs its diagnostic cycles.
3.  **Explore:** Navigate the **Theory Map** to see how equations became code.
4.  **Listen & View:** Use the Pro visualizer to see the architecture and hear the theory map.

---

*Built for the Gemini API Developer Competition 2025.*