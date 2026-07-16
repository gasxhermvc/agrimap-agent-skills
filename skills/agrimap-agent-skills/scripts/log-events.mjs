export const QA_FAILED_EVENT = "qa-failed";

export const LOG_EVENTS = Object.freeze([
  "created",
  "changed",
  "verified",
  "decision",
  "qa-finding",
  QA_FAILED_EVENT,
  "blocked",
  "cancelled",
  "completed",
]);

const LOG_EVENT_SET = new Set(LOG_EVENTS);

export function isLogEvent(value) {
  return LOG_EVENT_SET.has(value);
}

export function logEventError(value) {
  return {
    ok: false,
    code: "INVALID_LOG_EVENT",
    message: `Log event must be one of: ${LOG_EVENTS.join("|")}. Received: ${JSON.stringify(value)}.`,
  };
}
