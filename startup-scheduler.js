// Split construction into browser tasks so input and loading UI can update.
// A timer fallback also progresses in browsers without scheduler.yield().
export async function startupStage(percent, message) {
  window.gameLoading?.show(percent, message);
  if (globalThis.scheduler?.yield) await globalThis.scheduler.yield();
  else await new Promise(resolve => setTimeout(resolve, 0));
}
