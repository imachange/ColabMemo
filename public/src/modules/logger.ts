export const initLogger = (): void => {
  window.addEventListener("error", (event) => {
    navigator.sendBeacon(
      "/api/logs/client",
      JSON.stringify({
        type: "error",
        message: event.message,
        stack: event.error instanceof Error ? event.error.stack : undefined,
      }),
    );
  });
};
