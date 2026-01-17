
export class ExecutionService {
  private pyodide: any = null;
  private isInitializing: boolean = false;

  async init() {
    if (this.pyodide) return;
    if (this.isInitializing) return;
    this.isInitializing = true;
    
    try {
      // @ts-ignore
      this.pyodide = await window.loadPyodide({
        indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.1/full/"
      });
      
      await this.pyodide.loadPackage(['numpy', 'micropip']);
      console.log("Pyodide Ready.");
    } catch (err) {
      console.error("Pyodide failure:", err);
      throw err;
    } finally {
      this.isInitializing = false;
    }
  }

  async runPython(code: string, tests: string): Promise<{ passed: boolean; logs: string; variables?: any[] }> {
    await this.init();
    
    let logs = "";
    this.pyodide.setStdout({ batched: (str: string) => { logs += str + "\n"; } });
    this.pyodide.setStderr({ batched: (str: string) => { logs += str + "\n"; } });

    const fullCode = `
import sys
import io
import numpy as np
import json
import traceback

_VARS_BEFORE = set(globals().keys())

# --- Implementation ---
try:
    print("INITIALIZING_CORE...")
${code.split('\n').map(line => '    ' + line).join('\n')}
except Exception:
    print("IMPLEMENTATION_ERROR:")
    print(traceback.format_exc())

# --- Unit Testing ---
try:
    print("STARTING_TESTS...")
${tests.split('\n').map(line => '    ' + line).join('\n')}
    print("CORE_LOGIC_VERIFIED")
except Exception:
    print("TEST_CRASH:")
    print(traceback.format_exc())
    print("VERIFICATION_FAILED")

# --- Memory Inspection ---
_VARS_AFTER = set(globals().keys())
_NEW_VARS = _VARS_AFTER - _VARS_BEFORE - {'_VARS_BEFORE', '_VARS_AFTER', 'json', 'np', 'sys', 'io', 'fullCode', 'traceback'}
inspect_data = []
for var_name in _NEW_VARS:
    if var_name.startswith('_'): continue
    val = globals()[var_name]
    try:
        t = type(val).__name__
        v_str = str(val)
        if len(v_str) > 120: v_str = v_str[:117] + "..."
        inspect_data.append({"name": var_name, "type": t, "value": v_str})
    except: pass
print("INSPECTOR_SNAPSHOT:" + json.dumps(inspect_data))
`;

    try {
      await this.pyodide.runPythonAsync(fullCode);
      const passed = logs.includes("CORE_LOGIC_VERIFIED") && !logs.includes("IMPLEMENTATION_ERROR");
      
      let variables: any[] = [];
      const inspectorMatch = logs.match(/INSPECTOR_SNAPSHOT:(.*)/);
      if (inspectorMatch) {
        try { variables = JSON.parse(inspectorMatch[1]); } catch(e) {}
      }

      return { 
        passed, 
        variables,
        logs: logs.replace(/INSPECTOR_SNAPSHOT:.*\n?/, "")
                  .replace("CORE_LOGIC_VERIFIED", "")
                  .replace("VERIFICATION_FAILED", "")
                  .replace("STARTING_TESTS...", "")
                  .replace("INITIALIZING_CORE...", "")
                  .trim() 
      };
    } catch (err: any) {
      return { passed: false, logs: logs + "\n" + err.message };
    }
  }
}

export const executionService = new ExecutionService();
