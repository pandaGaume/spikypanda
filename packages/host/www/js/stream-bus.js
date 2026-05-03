// StreamBus: high-level client API to interact with the SharedWorker registry.
// This class hides the low-level postMessage protocol and provides
// a simple publish/subscribe interface.

// *********************************************************
//                             USAGE                       
// *********************************************************

// // producer
// import { StreamBus } from "./stream-bus.js";

// const bus = new StreamBus();

// bus.on("connected", () => {
//   bus.registerStream("sensor-1", { name: "Temperature sensor" });
// });

// setInterval(() => {
//   bus.publish("sensor-1", {
//     value: Math.random()
//   });
// }, 1000);

// // consumer
// import { StreamBus } from "./stream-bus.js";

// const bus = new StreamBus();

// // Get available streams
// bus.on("connected", () => {
//   bus.listStreams();
// });

// // Subscribe to a stream
// bus.subscribe("sensor-1");

// // Listen to data
// bus.onData("sensor-1", (payload) => {
//   console.log("received:", payload);
// }); 



export class StreamBus {
  constructor(options = {}) {
    // URL of the SharedWorker script (must be identical across all windows)
    this.workerUrl = options.workerUrl || "/registry-worker.js";

    // Create or connect to the shared worker
    this.worker = new SharedWorker(this.workerUrl);

    // Communication port with the worker
    this.port = this.worker.port;

    // Generic message handlers: Map<type, Set<fn>>
    this.handlers = new Map();

    // Data handlers per stream: Map<streamId, Set<fn>>
    // Special key "*" = listen to all streams
    this.dataHandlers = new Map();

    // Start the port (required in some browsers)
    this.port.start();

    // Central dispatcher for all incoming messages
    this.port.onmessage = (event) => {
      this.handleMessage(event.data);
    };
  }

  // Internal: dispatch incoming messages to registered handlers
  handleMessage(message) {
    if (!message || !message.type) return;

    // 1. Call generic handlers for this message type
    const handlers = this.handlers.get(message.type);
    if (handlers) {
      for (const handler of handlers) {
        handler(message);
      }
    }

    // 2. Special handling for "data" messages (stream payload)
    if (message.type === "data") {
      // Handlers for a specific stream
      const streamHandlers = this.dataHandlers.get(message.streamId);
      if (streamHandlers) {
        for (const handler of streamHandlers) {
          handler(message.payload, message);
        }
      }

      // Handlers listening to all streams
      const allHandlers = this.dataHandlers.get("*");
      if (allHandlers) {
        for (const handler of allHandlers) {
          handler(message.payload, message);
        }
      }
    }
  }

  // Register a handler for a specific message type (e.g. "connected", "streams")
  on(type, handler) {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }

    this.handlers.get(type).add(handler);

    // Return unsubscribe function
    return () => {
      this.handlers.get(type).delete(handler);
    };
  }

  // Register a handler for data from a specific stream
  // streamId = "*" means all streams
  onData(streamId, handler) {
    if (!this.dataHandlers.has(streamId)) {
      this.dataHandlers.set(streamId, new Set());
    }

    this.dataHandlers.get(streamId).add(handler);

    // Return unsubscribe function
    return () => {
      this.dataHandlers.get(streamId).delete(handler);
    };
  }

  // Low-level send to worker
  send(message) {
    this.port.postMessage(message);
  }

  // Declare this window as a producer of a stream
  registerStream(streamId, options = {}) {
    this.send({
      type: "register-stream",
      streamId,
      name: options.name || streamId,
      meta: options.meta || {}
    });
  }

  // Remove a stream (only valid for its producer)
  unregisterStream(streamId) {
    this.send({
      type: "unregister-stream",
      streamId
    });
  }

  // Publish data to a stream (producer only)
  publish(streamId, payload) {
    this.send({
      type: "data",
      streamId,
      payload
    });
  }

  // Request current list of available streams
  listStreams() {
    this.send({
      type: "list-streams"
    });
  }

  // Subscribe to a stream
  subscribe(streamId) {
    this.send({
      type: "subscribe",
      streamId
    });
  }

  // Unsubscribe from a stream
  unsubscribe(streamId) {
    this.send({
      type: "unsubscribe",
      streamId
    });
  }
}

