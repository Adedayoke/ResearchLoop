
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
      console.log("Pyodide initialized.");
    } catch (err) {
      console.error("Pyodide init failed:", err);
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

_VARS_BEFORE = set(globals().keys())

# User implementation
try:
${code.split('\n').map(line => '    ' + line).join('\n')}
except Exception as e:
    import traceback
    print("IMPLEMENTATION_ERROR:")
    print(traceback.format_exc())

# User tests
try:
    print("RUNNING_TESTS...")
${tests.split('\n').map(line => '    ' + line).join('\n')}
    print("ALL_TESTS_PASSED")
except Exception as e:
    import traceback
    print("TEST_FAILURE:")
    print(traceback.format_exc())
    print("TESTS_FAILED")

# Variable Inspection
_VARS_AFTER = set(globals().keys())
_NEW_VARS = _VARS_AFTER - _VARS_BEFORE - {'_VARS_BEFORE', '_VARS_AFTER', 'json', 'np', 'sys', 'io', 'fullCode'}
inspect_data = []
for var_name in _NEW_VARS:
    if var_name.startswith('_'): continue
    val = globals()[var_name]
    try:
        t = type(val).__name__
        v_str = str(val)
        if len(v_str) > 100: v_str = v_str[:97] + "..."
        inspect_data.append({"name": var_name, "type": t, "value": v_str})
    except:
        pass
print("INSPECTOR_DATA:" + json.dumps(inspect_data))
`;

    try {
      await this.pyodide.runPythonAsync(fullCode);
      const passed = logs.includes("ALL_TESTS_PASSED") && !logs.includes("IMPLEMENTATION_ERROR");
      
      let variables: any[] = [];
      const inspectorMatch = logs.match(/INSPECTOR_DATA:(.*)/);
      if (inspectorMatch) {
        try { variables = JSON.parse(inspectorMatch[1]); } catch(e) {}
      }

      return { 
        passed, 
        variables,
        logs: logs.replace(/INSPECTOR_DATA:.*\n?/, "")
                  .replace("ALL_TESTS_PASSED", "")
                  .replace("TESTS_FAILED", "")
                  .replace("RUNNING_TESTS...", "")
                  .trim() 
      };
    } catch (err: any) {
      return { passed: false, logs: logs + "\n" + err.message };
    }
  }
}

export const executionService = new ExecutionService();
