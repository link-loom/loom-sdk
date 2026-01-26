const { performance } = require('perf_hooks');

class PerformanceUtil {
  constructor(dependencies) {
    this._dependencies = dependencies;
    this._console = dependencies.console;
    this._namespace = '[Loom]::[Utils]::[Performance]';
    this._startSnapshot = PerformanceUtil.start();
  }

  /**
   * Captures the current resource usage snapshot.
   */
  static start() {
    return {
      time: performance.now(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
    };
  }

  /**
   * Calculates the delta between now and the start snapshot.
   * @param {Object} startSnapshot - The object returned by start()
   */
  static measure(startSnapshot) {
    if (!startSnapshot) return null;

    const endTime = performance.now();
    const endMemory = process.memoryUsage();
    const endCpu = process.cpuUsage(startSnapshot.cpu);

    const cpuTotalMicros = endCpu.user + endCpu.system;
    const durationMs = endTime - startSnapshot.time;

    // CPU Utilization % (Processing / Duration)
    const cpuTotalMs = cpuTotalMicros / 1000;
    const utilization = durationMs > 0 ? (cpuTotalMs / durationMs) * 100 : 0;

    return {
      durationMs: durationMs.toFixed(2),
      cpu: {
        userMicros: endCpu.user,
        systemMicros: endCpu.system,
        utilization: utilization.toFixed(2) + '%',
      },
      memory: {
        heapUsedDiff: this.#formatBytes(
          endMemory.heapUsed - startSnapshot.memory.heapUsed,
        ),
        externalDiff: this.#formatBytes(
          endMemory.external - startSnapshot.memory.external,
        ),
        totalHeap: this.#formatBytes(endMemory.heapUsed),
      },
    };
  }

  static #formatBytes(bytes) {
    const sign = bytes < 0 ? '-' : '';
    const absBytes = Math.abs(bytes);
    if (absBytes === 0) return '0 B';
    const i = Math.floor(Math.log(absBytes) / Math.log(1024));
    const sizes = ['B', 'KB', 'MB', 'GB'];
    return `${sign}${(absBytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  }

  /**
   * Instance method wrapper for static start().
   */
  start() {
    return PerformanceUtil.start();
  }

  /**
   * Instance method wrapper for static measure().
   */
  measure(startSnapshot) {
    return PerformanceUtil.measure(startSnapshot);
  }

  /**
   * Reports performance metrics since instantiation or given snapshot.
   * @param {Object} [snapshot] - Optional snapshot to measure from. Defaults to instance start.
   * @param {String} [label] - Optional label for the report.
   */
  report(snapshot = this._startSnapshot, label = 'Application Lifecycle') {
    const metrics = PerformanceUtil.measure(snapshot);
    if (metrics) {
      this._console.info(`Performance Report [${label}]:`, {
        namespace: this._namespace,
        ...metrics,
      });
    }
    return metrics;
  }

  /**
   * Called upon application termination to log final performance stats.
   */
  onTerminate() {
    this.report(this._startSnapshot, 'Termination');
  }
}

module.exports = PerformanceUtil;
