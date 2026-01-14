
export class ExecutionService {
  private pyodide: any = null;

  async init() {
    if (this.pyodide) return;
    // @ts-ignore
    this.pyodide = await window.loadPyodide({
      indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.1/full/"
    });
  }

  async runPython(code: string, tests: string): Promise<{ passed: boolean; logs: string }> {
    await this.init();
    
    let logs = "";
    this.pyodide.setStdout({ batched: (str: string) => { logs += str + "\n"; } });
    this.pyodide.setStderr({ batched: (str: string) => { logs += str + "\n"; } });

    const fullCode = `
import sys
import io

# Define the user implementation
${code}

# Define and run the tests
try:
    ${tests}
    print("ALL_TESTS_PASSED")
except Exception as e:
    import traceback
    print(traceback.format_exc())
    print("TESTS_FAILED")
`;

    try {
      await this.pyodide.runPythonAsync(fullCode);
      const passed = logs.includes("ALL_TESTS_PASSED");
      return { passed, logs: logs.replace("ALL_TESTS_PASSED", "").replace("TESTS_FAILED", "").trim() };
    } catch (err: any) {
      return { passed: false, logs: logs + "\n" + err.message };
    }
  }
}

export const executionService = new ExecutionService();
