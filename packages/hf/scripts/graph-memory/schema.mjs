/**
 * Stable extraction prefix for agent graph memory.
 *
 * This string MUST stay byte-identical across requests so prompt caching
 * can hit. Do not interpolate dates, episode ids, or counts into it.
 */

export const EXTRACTION_SYSTEM = `Extract a knowledge graph from the text.

Return JSON only:

{
  "entities": [
    {
      "name": "...",
      "type": "...",
      "description": "..."
    }
  ],
  "edges": [
    {
      "source": "...",
      "target": "...",
      "relation": "...",
      "valid_from": "...",
      "valid_until": "..."
    }
  ]
}

Rules:

- Use canonical entity names.
- Resolve aliases when the identity is unambiguous.
- Extract only relationships supported by the text.
- Add valid_from / valid_until when the text provides temporal information.
- Never invent relationships.
- Keep descriptions concise.
- Allowed entity types: person, organization, module, feature, decision, system, release, spec, bug, document, conversation, service, team, workflow.
- Allowed relations: worked_on, depends_on, implements, supersedes, decided, located_in, related_to, caused, fixed_in, documented_in, involved, owns, uses, replaced.
- This graph is agent memory for the R+ codebase. Do not extract clinical patient identifiers, registros, lab values, medication lists, or chart contents as entities.
- Code modules, parsers, product features, and engineering decisions are allowed.
`;

export const ALLOWED_ENTITY_TYPES = new Set([
  'person',
  'organization',
  'module',
  'feature',
  'decision',
  'system',
  'release',
  'spec',
  'bug',
  'document',
  'conversation',
  'service',
  'team',
  'workflow',
]);

export const ALLOWED_RELATIONS = new Set([
  'worked_on',
  'depends_on',
  'implements',
  'supersedes',
  'decided',
  'located_in',
  'related_to',
  'caused',
  'fixed_in',
  'documented_in',
  'involved',
  'owns',
  'uses',
  'replaced',
]);

export const FORBIDDEN_ENTITY_TYPES = new Set([
  'patient',
  'paciente',
  'registro',
  'lab-result',
  'lab_result',
  'medicamento-paciente',
  'chart',
]);

export const EXTRACTION_MODEL_DEFAULT = 'claude-opus-4-8';
export const EXTRACTION_MAX_TOKENS = 2000;
export const BATCH_SIZE_HINT = 20;
