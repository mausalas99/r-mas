import type { StepExecutor, StepVerdict } from 'e2e';
import { query, createSdkMcpServer, tool } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';

// Step executor that runs on the Claude subscription (Claude Agent SDK login).
// Text observations only: no screenshots leave the machine.
const text = (s: string) => ({ content: [{ type: 'text' as const, text: s }] });

export const claudeSubscription: StepExecutor = {
  name: 'claude-subscription',
  version: '1',
  cache: 'off',
  async runStep(ctx) {
    let verdict: StepVerdict | undefined;
    const guard = async (fn: () => Promise<string>) => {
      try { return text(await fn()); } catch (e) { return text(`Failed: ${(e as Error).message}`); }
    };
    const server = createSdkMcpServer({
      name: 'screen',
      tools: [
        tool('read_screen', 'Read the screen: one node per line as #id role "name". Ids are valid until the next read.', {},
          () => guard(async () => (await ctx.observe()).text)),
        tool('tap', 'Click a node by its id from the latest read_screen.', { id: z.string() },
          ({ id }) => guard(async () => { await ctx.actions.tap({ id: id.replace(/^#/, '') }); return `Tapped ${id}.`; })),
        tool('type', 'Type into an input node by id.', { id: z.string(), value: z.string() },
          ({ id, value }) => guard(async () => { await ctx.actions.type({ id: id.replace(/^#/, '') }, value); return `Typed into ${id}.`; })),
        tool('press', 'Press a key on a node, e.g. Enter or Escape.', { id: z.string(), key: z.string() },
          ({ id, key }) => guard(async () => { await ctx.actions.press({ id: id.replace(/^#/, '') }, key); return `Pressed ${key}.`; })),
        tool('select', 'Choose an option value in a select node.', { id: z.string(), value: z.string() },
          ({ id, value }) => guard(async () => { await ctx.actions.select({ id: id.replace(/^#/, '') }, value); return `Selected ${value}.`; })),
        tool('scroll', 'Scroll the viewport.', { direction: z.enum(['up', 'down', 'left', 'right']) },
          ({ direction }) => guard(async () => { await ctx.actions.scroll(direction); return `Scrolled ${direction}.`; })),
        tool('complete_step', 'End the step with a verdict. Call exactly once, last.',
          { status: z.enum(['passed', 'failed']), summary: z.string() },
          async ({ status, summary }) => { verdict = { status, summary }; return text('Recorded.'); }),
      ],
    });

    const ac = new AbortController();
    ctx.signal.addEventListener('abort', () => ac.abort(), { once: true });
    const system = [
      'You test a Spanish-language medical desktop app through the tools given. Use synthetic data only.',
      ctx.agentContext,
      ctx.step.kind === 'assert'
        ? 'This step is an ASSERTION: read the screen, change nothing, then call complete_step passed or failed.'
        : 'This step is an ACTION: do the goal with the tools, then call complete_step. Read the screen before each action.',
    ].filter(Boolean).join('\n');

    const turns: string[] = [];
    for await (const m of query({
      prompt: ctx.step.instruction,
      options: {
        model: 'sonnet',
        systemPrompt: system,
        mcpServers: { screen: server },
        tools: [],
        allowedTools: ['mcp__screen__*'],
        permissionMode: 'dontAsk',
        settingSources: [],
        maxTurns: 25,
        abortController: ac,
      },
    })) {
      if (m.type === 'assistant') for (const b of m.message.content) if (b.type === 'text') turns.push(b.text);
      if (verdict && m.type === 'result') break;
    }
    ctx.attachTranscript(turns.join('\n'));
    return verdict ?? { status: 'failed', summary: 'The agent ended without calling complete_step.' };
  },
};
