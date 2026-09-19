// public/js/boot/boot-steps.mjs
async function runBootSteps(steps, ctx) {
  for (const step of steps) {
    try {
      await step.run(ctx);
    } catch (err) {
      console.error("[boot]", step.id, err);
      throw err;
    }
  }
}
export {
  runBootSteps
};
//# sourceMappingURL=/js/chunks/boot-steps-ZL3WGQMJ.js.map
