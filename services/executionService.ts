
export class ExecutionService {
  private pyodide: any = null;
  private initPromise: Promise<void> | null = null;

  /**
   * Initializes Pyodide exactly once using a promise singleton.
   * This prevents concurrent initialization calls from corrupting the WASM table.
   */
  async init(): Promise<void> {
    if (this.pyodide) return;
    
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      try {
        console.log("Initializing Pyodide WASM runtime...");
        // @ts-ignore
        this.pyodide = await window.loadPyodide({
          indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.1/full/"
        });
        
        // Atomic loading of essential scientific packages
        await this.pyodide.loadPackage(['numpy', 'micropip']);
        console.log("Pyodide Runtime Stable.");
      } catch (err) {
        this.initPromise = null; // Reset to allow retry on failure
        console.error("Pyodide Bootstrap Failure:", err);
        throw err;
      }
    })();

    return this.initPromise;
  }

  async runPython(code: string, tests: string): Promise<{ passed: boolean; logs: string; variables?: any[] }> {
    // Ensure runtime is ready before any access
    await this.init();
    
    let logs = "";
    
    // Per-execution output capture to prevent global state corruption
    const stdoutHandler = (str: string) => { logs += str + "\n"; };
    const stderrHandler = (str: string) => { logs += str + "\n"; };
    
    this.pyodide.setStdout({ batched: stdoutHandler });
    this.pyodide.setStderr({ batched: stderrHandler });

    // Use a unique block to prevent namespace collisions in the persistent globals()
    const executionId = `exec_${Date.now()}`;
    const fullCode = `
import sys
import io
import numpy as np
import json
import traceback

# Setup clean global state tracking
_VARS_BEFORE_${executionId} = set(globals().keys())

# --- Implementation Block ---
try:
    print("RL_STAGELOG: INITIALIZING_CORE")
${code.split('\n').map(line => '    ' + line).join('\n')}
except Exception:
    print("RL_STAGELOG: IMPLEMENTATION_ERROR")
    print(traceback.format_exc())

# --- Unit Testing Block ---
try:
    print("RL_STAGELOG: STARTING_TESTS")
${tests.split('\n').map(line => '    ' + line).join('\n')}
    print("RL_STAGELOG: CORE_LOGIC_VERIFIED")
except Exception:
    print("RL_STAGELOG: TEST_CRASH")
    print(traceback.format_exc())
    print("RL_STAGELOG: VERIFICATION_FAILED")

# --- Memory Inspector ---
_VARS_AFTER_${executionId} = set(globals().keys())
_NEW_VARS_${executionId} = _VARS_AFTER_${executionId} - _VARS_BEFORE_${executionId} - {'_VARS_BEFORE_${executionId}', '_VARS_AFTER_${executionId}', 'json', 'np', 'sys', 'io', 'fullCode', 'traceback'}
inspect_data_${executionId} = []
for var_name in _NEW_VARS_${executionId}:
    if var_name.startswith('_'): continue
    try:
        val = globals()[var_name]
        t = type(val).__name__
        v_str = str(val)
        if len(v_str) > 120: v_str = v_str[:117] + "..."
        inspect_data_${executionId}.append({"name": var_name, "type": t, "value": v_str})
    except: pass
print("RL_INSPECTOR_SNAPSHOT:" + json.dumps(inspect_data_${executionId}))
`;

    try {
      // runPythonAsync ensures non-blocking UI and proper WASM scheduling
      await this.pyodide.runPythonAsync(fullCode);
      
      const passed = logs.includes("RL_STAGELOG: CORE_LOGIC_VERIFIED") && !logs.includes("RL_STAGELOG: IMPLEMENTATION_ERROR");
      
      let variables: any[] = [];
      const inspectorMatch = logs.match(/RL_INSPECTOR_SNAPSHOT:(.*)/);
      if (inspectorMatch) {
        try { variables = JSON.parse(inspectorMatch[1]); } catch(e) {}
      }

      // Cleanup logs for display
      const cleanLogs = logs
        .replace(/RL_INSPECTOR_SNAPSHOT:.*\n?/g, "")
        .replace(/RL_STAGELOG: .*\n?/g, "")
        .trim();

      return { 
        passed, 
        variables,
        logs: cleanLogs
      };
    } catch (err: any) {
      console.error("Fatal Runtime Error during execution:", err);
      // If we hit a truly fatal WASM error, we might need to reset the init promise
      if (err.message.includes("table index out of bounds") || err.message.includes("fatal error")) {
        this.pyodide = null;
        this.initPromise = null;
      }
      return { passed: false, logs: logs + "\nFATAL_ENGINE_ERROR: " + err.message };
    }
  }
}

export const executionService = new ExecutionService();
