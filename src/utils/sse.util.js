class SseUtil {
  constructor(dependencies) {
    /* Base Properties */
    this._dependencies = dependencies;

    /* Assigments */
    this._namespace = '[Loom]::[Utils]::[SSE]';
  }

  /**
   * Creates an SSE stream controller from an Express response object.
   *
   * Sets required headers (Content-Type, Cache-Control, Connection, X-Accel-Buffering),
   * flushes them immediately, and returns a stream controller with send/comment/close methods.
   *
   * @param {import('express').Response} res - Express response object
   * @returns {{ send: Function, comment: Function, close: Function, closed: boolean }}
   */
  #createStream(res) {
    const stream = {
      _res: res,
      _closed: false,
    };

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    res.flushHeaders();

    res.on('close', () => {
      stream._closed = true;
    });

    /**
     * Send a named SSE event with JSON-serializable data.
     *
     * @param {*} data - JSON-serializable payload
     * @param {Object} [options]
     * @param {string} [options.event] - Named event type (client listens via addEventListener)
     * @param {string} [options.id] - Event ID for Last-Event-ID reconnection
     * @param {number} [options.retry] - Reconnection interval in ms
     */
    stream.send = (data, { event, id, retry } = {}) => {
      if (stream._closed) return;

      let message = '';
      if (id) message += `id: ${id}\n`;
      if (event) message += `event: ${event}\n`;
      if (retry) message += `retry: ${retry}\n`;
      message += `data: ${JSON.stringify(data)}\n\n`;

      res.write(message);

      // Flush through compression middleware to prevent buffering
      if (typeof res.flush === 'function') {
        res.flush();
      }
    };

    /**
     * Send an SSE comment. Useful for keep-alive pings.
     * Comments are lines starting with `:` and are ignored by EventSource.
     *
     * @param {string} text - Comment text
     */
    stream.comment = (text) => {
      if (stream._closed) return;
      res.write(`: ${text}\n\n`);

      if (typeof res.flush === 'function') {
        res.flush();
      }
    };

    /**
     * Close the SSE stream gracefully.
     */
    stream.close = () => {
      if (stream._closed) return;
      stream._closed = true;
      res.end();
    };

    Object.defineProperty(stream, 'closed', {
      get() {
        return stream._closed;
      },
    });

    return stream;
  }

  get sse() {
    return {
      createStream: this.#createStream.bind(this),
    };
  }
}

module.exports = SseUtil;
