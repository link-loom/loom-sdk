const { parentPort, workerData } = require('worker_threads');
const PerformanceUtil = require('../../../utils/performance.util');

// 1. Unpack Data
const { name, path, config } = workerData;

// 2. Mock Dependencies
const dependencies = {
  config: {
    has: (key) => config && config[key] !== undefined,
    get: (key) => (config ? config[key] : undefined),
    ...config,
  },
  console: {
    log: (msg, meta) =>
      parentPort.postMessage({ type: 'log', level: 'log', msg, meta }),
    info: (msg, meta) =>
      parentPort.postMessage({ type: 'log', level: 'info', msg, meta }),
    success: (msg, meta) =>
      parentPort.postMessage({ type: 'log', level: 'success', msg, meta }),
    warn: (msg, meta) =>
      parentPort.postMessage({ type: 'log', level: 'warn', msg, meta }),
    error: (msg, meta) =>
      parentPort.postMessage({ type: 'log', level: 'error', msg, meta }),
  },
};

const state = {
  snapshot: null,
};

try {
  // 3. Load Worker Class
  // eslint-disable-next-line import/no-dynamic-require, global-require
  const WorkerClass = require(path);

  // 4. Instantiate
  const worker = new WorkerClass(dependencies);

  // 5. Message Loop
  parentPort.on('message', async (message) => {
    try {
      if (message.cmd === 'activateBackground') {
        state.snapshot = PerformanceUtil.start();
        if (worker.activateBackground) {
          await worker.activateBackground(message.ctx);
        }
        parentPort.postMessage({
          type: 'result',
          cmd: 'activateBackground',
          status: 'ok',
        });
      } else if (message.cmd === 'stop') {
        if (worker.onTerminate) {
          await worker.onTerminate(message.ctx);
        }

        let report = null;
        if (state.snapshot) {
          report = PerformanceUtil.measure(state.snapshot);
        }

        parentPort.postMessage({
          type: 'result',
          cmd: 'stop',
          status: 'ok',
          performance: report,
        });
        // We do not exit here; let the parent terminate us or we exit after flushing.
        // process.exit(0);
      }
    } catch (err) {
      parentPort.postMessage({
        type: 'error',
        cmd: message.cmd,
        error: { message: err.message, stack: err.stack },
      });
    }
  });

  // Notify Ready
  parentPort.postMessage({ type: 'ready' });
} catch (err) {
  parentPort.postMessage({
    type: 'fatal',
    error: { message: err.message, stack: err.stack },
  });
  process.exit(1);
}
