import { choice, TypeSafeClient } from "@typesafe-ai/sdk";

// target is meaningless for DONE/BLOCKED/WAIT/SCROLL — caller ignores it then.
const OPERATIONS = {
  CLICK: "tap or click the target element",
  TYPE_TEXT: "type text into the target element",
  SELECT: "choose an option in the target element",
  SCROLL: "scroll to reveal more elements",
  WAIT: "nothing actionable yet, wait",
  DONE: "the goal is already achieved",
  BLOCKED: "no element on screen can serve the goal",
};

const client = new TypeSafeClient();

// ponytail: 50k char cap on state, no chunking — raise if goals need more context.
export async function pickAction(goal, elements, state = goal) {
  const response = await client.systemOne({
    state: state.slice(0, 50000),
    questions: {
      operation: choice(`Goal: ${goal}. What should happen next?`, OPERATIONS),
      target: choice(`Goal: ${goal}. Which element should it act on?`, elements),
    },
  });
  return response.answers;
}
