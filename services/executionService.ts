
export class ExecutionService {
  private pyodide: any = null;
  private initPromise: Promise<void> | null = null;
  private isExecuting: boolean = false;

  async init(): Promise<void> {
    if (this.pyodide) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        console.log("Initializing Pyodide WASM runtime...");
        // @ts-ignore
        this.pyodide = await window.loadPyodide({
          indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.1/full/"
        });
        await this.pyodide.loadPackage(['numpy', 'micropip']);
        console.log("Pyodide Runtime Stable.");
      } catch (err) {
        this.initPromise = null; 
        console.error("Pyodide Bootstrap Failure:", err);
        throw err;
      }
    })();

    return this.initPromise;
  }

  private handleFatalError(err: any) {
    const msg = err?.message || "";
    if (msg.includes("table index out of bounds") || msg.includes("fatal error") || msg.includes("RecursionError")) {
      console.error("Fatal WASM state detected. Purging runtime...");
      this.pyodide = null;
      this.initPromise = null;
    }
  }

  async runPython(code: string, tests: string): Promise<{ passed: boolean; logs: string; variables?: any[] }> {
    if (this.isExecuting) throw new Error("Execution lock active.");

    try {
      this.isExecuting = true;
      await this.init();
      
      let logs = "";
      this.pyodide.setStdout({ batched: (s: string) => { logs += s + "\n"; } });
      this.pyodide.setStderr({ batched: (s: string) => { logs += s + "\n"; } });

      // Create a clean execution scope
      const pyGlobals = this.pyodide.globals.get("dict")();

      const fullCode = `
import sys
import io
import numpy as np
import json
import traceback

def run_research_loop():
    _passed = False
    _inspect_data = []

    try:
        print("RL_STAGELOG: INITIALIZING_CORE")
${code.split('\n').map(line => '        ' + line).join('\n')}
    except Exception:
        print("RL_STAGELOG: IMPLEMENTATION_ERROR")
        print(traceback.format_exc())
        return False, []

    try:
        print("RL_STAGELOG: STARTING_TESTS")
${tests.split('\n').map(line => '        ' + line).join('\n')}
        print("RL_STAGELOG: CORE_LOGIC_VERIFIED")
        _passed = True
    except Exception:
        print("RL_STAGELOG: TEST_CRASH")
        print(traceback.format_exc())
        print("RL_STAGELOG: VERIFICATION_FAILED")
        _passed = False

    try:
        import inspect
        frame = inspect.currentframe()
        try:
            local_vars = frame.f_locals
            for var_name, val in local_vars.items():
                if var_name.startswith('_') or var_name in ['sys', 'io', 'np', 'json', 'traceback', 'inspect', 'frame']:
                    continue
                try:
                    t = type(val).__name__
                    v_str = str(val)
                    if len(v_str) > 200: v_str = v_str[:197] + "..."
                    _inspect_data.append({"name": var_name, "type": t, "value": v_str})
                except: pass
        finally:
            del frame
    except: pass

    return _passed, _inspect_data

_res, _vars = run_research_loop()
print("RL_INSPECTOR_SNAPSHOT:" + json.dumps(_vars))
print("RL_FINAL_STATUS: SUCCESS" if _res else "RL_FINAL_STATUS: FAILURE")
`;

      try {
        // Correctly passing the local scope dictionary
        await this.pyodide.runPythonAsync(fullCode, { globals: pyGlobals });
        
        const passed = logs.includes("RL_FINAL_STATUS: SUCCESS");
        let variables: any[] = [];
        const inspectorMatch = logs.match(/RL_INSPECTOR_SNAPSHOT:(.*)/);
        if (inspectorMatch) {
          try { variables = JSON.parse(inspectorMatch[1]); } catch(e) {}
        }

        const cleanLogs = logs
          .replace(/RL_INSPECTOR_SNAPSHOT:.*\n?/g, "")
          .replace(/RL_STAGELOG: .*\n?/g, "")
          .replace(/RL_FINAL_STATUS: .*\n?/g, "")
          .trim();

        return { passed, variables, logs: cleanLogs };
      } catch (innerErr: any) {
        this.handleFatalError(innerErr);
        throw innerErr;
      } finally {
        pyGlobals.destroy();
      }
    } catch (err: any) {
      console.error("Runtime Execution Error:", err);
      return { passed: false, logs: "FATAL_ENGINE_ERROR: " + (err?.message || "Internal WASM crash") };
    } finally {
      this.isExecuting = false;
    }
  }
}

export const executionService = new ExecutionService();
