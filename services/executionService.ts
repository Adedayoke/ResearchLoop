
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
      
      // Pre-load common scientific packages used in research
      await this.pyodide.loadPackage(['numpy', 'micropip']);
      
      console.log("Pyodide initialized with scientific stack.");
    } catch (err) {
      console.error("Pyodide init failed:", err);
      throw err;
    } finally {
      this.isInitializing = false;
    }
  }

  async runPython(code: string, tests: string): Promise<{ passed: boolean; logs: string }> {
    await this.init();
    
    let logs = "";
    this.pyodide.setStdout({ batched: (str: string) => { logs += str + "\n"; } });
    this.pyodide.setStderr({ batched: (str: string) => { logs += str + "\n"; } });

    // Ensure common imports are present if the model forgot them
    const fullCode = `
import sys
import io
import numpy as np

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
`;

    try {
      await this.pyodide.runPythonAsync(fullCode);
      const passed = logs.includes("ALL_TESTS_PASSED") && !logs.includes("IMPLEMENTATION_ERROR");
      return { 
        passed, 
        logs: logs.replace("ALL_TESTS_PASSED", "")
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
