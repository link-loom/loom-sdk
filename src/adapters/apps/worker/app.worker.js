const { parentPort, workerData } = require('worker_threads');

// 1. Unpack Data
const { name, path, config } = workerData;

// 2. Mock Dependencies
// Since we are isolated, we can't share complex objects.
// We reconstruct a minimal dependencies object.
const dependencies = {
  config: {
    has: (key) => config && config[key] !== undefined,
    get: (key) => (config ? config[key] : undefined),
    ...config, // enable direct access if needed
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

try {
  // 3. Load App Class
  const AppClass = require(path);

  // 4. Instantiate
  const app = new AppClass(dependencies);

  // 5. Message Loop
  parentPort.on('message', async (message) => {
    try {
      if (message.cmd === 'activateBackground') {
        if (app.activateBackground) {
          await app.activateBackground(message.ctx);
        }
        parentPort.postMessage({
          type: 'result',
          cmd: 'activateBackground',
          status: 'ok',
        });
      } else if (message.cmd === 'stop') {
        if (app.onTerminate) {
          await app.onTerminate(message.ctx);
        }
        parentPort.postMessage({ type: 'result', cmd: 'stop', status: 'ok' });
        process.exit(0);
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
