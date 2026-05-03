const streams = new Map();
const ports = new Set();

function send(port, message) {
  try {
    port.postMessage(message);
  } catch {
    ports.delete(port);
  }
}

function broadcast(message) {
  for (const port of ports) {
    send(port, message);
  }
}

function listStreams() {
  return Array.from(streams.values()).map((stream) => ({
    streamId: stream.streamId,
    name: stream.name,
    meta: stream.meta,
    createdAt: stream.createdAt,
    lastSeenAt: stream.lastSeenAt,
    subscribers: stream.subscribers.size
  }));
}

function broadcastStreams() {
  broadcast({
    type: "streams-updated",
    streams: listStreams()
  });
}

onconnect = (event) => {
  const port = event.ports[0];

  ports.add(port);
  port.start();

  send(port, { type: "connected" });

  port.onmessage = (event) => {
    const msg = event.data;
    if (!msg || typeof msg.type !== "string") return;

    if (msg.type === "register-stream") {
      if (!msg.streamId) {
        send(port, {
          type: "error",
          message: "Missing streamId"
        });
        return;
      }

      streams.set(msg.streamId, {
        streamId: msg.streamId,
        name: msg.name || msg.streamId,
        meta: msg.meta || {},
        producer: port,
        subscribers: new Set(),
        createdAt: Date.now(),
        lastSeenAt: Date.now()
      });

      send(port, {
        type: "registered",
        streamId: msg.streamId
      });

      broadcastStreams();
      return;
    }

    if (msg.type === "unregister-stream") {
      const stream = streams.get(msg.streamId);

      if (stream && stream.producer === port) {
        streams.delete(msg.streamId);
        broadcastStreams();
      }

      return;
    }

    if (msg.type === "list-streams") {
      send(port, {
        type: "streams",
        streams: listStreams()
      });

      return;
    }

    if (msg.type === "subscribe") {
      const stream = streams.get(msg.streamId);

      if (!stream) {
        send(port, {
          type: "not-found",
          streamId: msg.streamId
        });
        return;
      }

      stream.subscribers.add(port);

      send(port, {
        type: "subscribed",
        streamId: msg.streamId
      });

      broadcastStreams();
      return;
    }

    if (msg.type === "unsubscribe") {
      const stream = streams.get(msg.streamId);

      if (stream) {
        stream.subscribers.delete(port);
        broadcastStreams();
      }

      return;
    }

    if (msg.type === "data") {
      const stream = streams.get(msg.streamId);

      if (!stream) return;
      if (stream.producer !== port) return;

      stream.lastSeenAt = Date.now();

      for (const subscriber of stream.subscribers) {
        send(subscriber, {
          type: "data",
          streamId: msg.streamId,
          payload: msg.payload,
          timestamp: Date.now()
        });
      }

      return;
    }
  };
};