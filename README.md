# 🌀 ResearchLoop

> **Automating the Bridge from Theoretical Paper to Verified Code.**

ResearchLoop is an autonomous research engineering agent built for the **Gemini API Developer Competition**. It transcends "Chat-based" AI by implementing a rigorous **Reasoning & Execution Loop** that reads academic PDFs, extracts mathematical methodology, and autonomously synthesizes, executes, and self-corrects Python implementations until they converge with reported benchmarks.

---

## 🏛 The Research Manifesto
Theoretical knowledge is often trapped in static PDFs. The gap between a LaTeX equation and a production-ready function is where human engineering hours are lost. 

**ResearchLoop** bridges this gap by treating research as a verification problem. Our agent doesn't just "write code"—it **proves** the code works by running it in a WASM-powered Python environment (Pyodide) and comparing results against the paper's original metrics.

---

## 🚀 Key Features

### 1. Multimodal Document Reasoning
Using **Gemini 3 Flash**, the system performs deep multimodal analysis on uploaded PDFs to extract:
*   **Primary Algorithms:** Converting complex prose into actionable logic.
*   **LaTeX Equations:** Identifying the mathematical core of the research.
*   **Benchmark Data:** Extracting performance metrics for parity verification.

### 2. Autonomous Verification Loop (v1.0.4-Flash)
The system operates on a "Marathon Agent" architecture:
*   **Thought Signatures:** Maximizes Gemini 3's thinking budget (up to 24k tokens) for high-frequency reasoning.
*   **Self-Correction:** If the generated code fails execution or tests, the agent analyzes the traceback, revises its mental model, and pushes a new version until convergence.

### 3. The "Explainer" Interface
A high-fidelity UI that maps abstract theory directly to code:
*   **Theory-to-Syntax Linkage:** Hover over a paper's equation to see the exact Python implementation snippet.
*   **Runtime State Inspector:** A live snapshot of the WASM memory space (global variables, types, and values).

### 4. In-Browser WASM Execution
Zero-setup execution. The system initializes a **Pyodide** environment directly in the browser, allowing for secure, sandboxed execution of complex NumPy-based algorithms.

---

## 🛠 Technical Stack

*   **Model:** `gemini-3-flash-preview` (Optimized for reasoning speed and cost-effective loops).
*   **Frontend:** React 19, Tailwind CSS (Custom "Claude-inspired" aesthetic).
*   **Runtime:** Pyodide (WASM Python) + NumPy.
*   **Visualization:** Recharts (Convergence & Benchmark Parity charts).
*   **AI SDK:** `@google/genai` (Native ESM).

---

## 📂 System Architecture

1.  **Ingestion:** User drops a PDF.
2.  **Analysis Phase:** Gemini extracts structured metadata and methodology.
3.  **Synthesis Phase:** Gemini generates a production Python module and a specialized test suite.
4.  **Execution Phase:** Pyodide runs the code.
5.  **Refinement Loop:** If errors occur, the traceback is fed back to Gemini for autonomous debugging.
6.  **Verification:** Final runtime metrics are compared against paper benchmarks in the "Parity" view.

---

## 📖 How to Use

1.  **Drop a PDF:** Select a foundational ML paper (e.g., K-Means++, Adam Optimizer, or Matrix Factorization).
2.  **Watch the Stream:** Monitor the "Autonomous Agent Stream" as it initializes the thinking engine.
3.  **Inspect Convergence:** Once finished, navigate through the **Agent Journey** to see how the code evolved.
4.  **Export Logic:** Click "Export Verified Logic" to get the final production-ready `.py` file.

---

## 🏆 Hackathon Tracks
*   **Marathon Agent:** Highlighting long-running, self-correcting reasoning loops.
*   **Aesthetics & Innovation:** Pushing the boundaries of technical UI/UX in AI tooling.

---
*Built for the Gemini API Developer Competition 2025.*