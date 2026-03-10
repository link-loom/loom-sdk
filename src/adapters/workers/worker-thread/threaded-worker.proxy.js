const { Worker } = require('worker_threads');
const path = require('path');

class ThreadedWorkerProxy {
  constructor({ name, appPath, config, logger }) {
    this.name = name;
    this.logger = logger;

    // Convert config object to plain JSON-serializable object if it's a map/class
    const plainConfig = {};
    if (config && typeof config.get === 'function') {
      // Very basic extraction of what we likely need.
      // Ideally config should be dumpable. For now, we assume user passed vars in default.json
      if (config.util && config.util.toObject) {
        Object.assign(plainConfig, config.util.toObject());
      } else {
        // Manual fallback or assuming it's enumerable
        // This is a limitation: we can only pass what's serializable.
      }
    }

    this.worker = new Worker(path.join(__dirname, 'worker.thread.js'), {
      workerData: {
        name,
        path: appPath,
        config: plainConfig,
      },
    });

    this.worker.on('message', (msg) => this.#handleMessage(msg));
    this.worker.on('error', (err) => {
      this.logger.error(`[Worker] ${this.name} Error:`, err);
    });

    // pending promises map
    this.pending = new Map();
  }

  #handleMessage(msg) {
    if (msg.type === 'log') {
      if (this.logger[msg.level]) {
        this.logger[msg.level](msg.msg, msg.meta);
      } else {
        this.logger.info(msg.msg, msg.meta);
      }
    } else if (msg.type === 'result') {
      // Resolve pending promise
      // Simplified: we assume one active command at a time for this PoC
      if (this._resolveCmd) {
        if (msg.performance) {
          this.logger.info(`[Performance] ${this.name} Report`, {
            meta: msg.performance,
            namespace: `[Loom]::[Workers]::[${this.name}]`,
          });
        }

        const response = msg.data || {};
        if (msg.performance) {
          response.performance = msg.performance;
        }

        this._resolveCmd(response);
        this._resolveCmd = null;
      }
    } else if (msg.type === 'error') {
      if (this._rejectCmd) {
        this._rejectCmd(new Error(msg.error.message));
        this._rejectCmd = null;
      }
    }
  }

  /**
   * Activates the worker in background mode.
   * @param {Object} ctx - The execution context.
   * @returns {Promise<Object>} Resolves with the Worker's result DTO + `performance` metrics.
   */
  async activateBackground(ctx) {
    return new Promise((resolve, reject) => {
      this._resolveCmd = resolve;
      this._rejectCmd = reject;
      // Serialize Context: Remove non-serializable parts if any
      // ctx options might contain functions? unlikely in this project.
      this.worker.postMessage({
        cmd: 'activateBackground',
        ctx: JSON.parse(JSON.stringify(ctx)),
      });
    });
  }

  async onTerminate(ctx) {
    return new Promise((resolve, reject) => {
      this._resolveCmd = resolve;
      this._rejectCmd = reject;
      this.worker.postMessage({
        cmd: 'stop',
        ctx: JSON.parse(JSON.stringify(ctx)),
      });
    });
  }

  // Implement other hooks as no-ops or similar bridges if needed
}

module.exports = ThreadedWorkerProxy;
