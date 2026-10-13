import assert from 'node:assert/strict';

export function canonicalGrowthInstructions(content) {
 const updated=content
  .replace(/- Canonical source: https:\/\/github\.com\/Quazmoz\/growth-os\. Local instructions-only snapshot: [^\n]+\n/, '- Canonical source: https://github.com/Quazmoz/growth-os. Resolve repository files from PAPERCLIP_WORKSPACE_CWD or the assigned project workspace, independently of the instructions directory.\n')
  .replace('- Read the relevant engine README and canonical job spec before work. Full evidence is not installed in this snapshot.', '- Verify the assigned checkout and read its README, relevant engine README, and canonical job spec before work. The historical instructions snapshot is a reference bundle, not the repository. Evidence access remains subject to the privacy policy below.');
 if(updated.includes('## Repository execution checks'))return updated;
 return updated+'\n## Repository execution checks\n\n'
  +'- Resolve job paths such as 03-outbound-engine/icp.md and trigger-watchlist.md relative to the assigned repository root. Do not resolve them relative to AGENTS.md or the historical instructions snapshot.\n'
  +'- Use the native GitHub connector when it is exposed by the runtime. Record an actual call or its exact error; a missing tool menu is not proof that the authenticated checkout is inaccessible. Never claim a connector attempt without a call.\n'
  +'- Write final artifacts to the canonical job output location in the assigned checkout; scratch files are temporary and cannot be the sole deliverable. Preserve existing work and honor repository write approvals.\n'
  +'- Use the installed Paperclip skill to record the task outcome and next step. A sentence saying Task is done does not update task state. Missing public-web verification alone does not imply repository authorization failure.\n';
}

if(process.argv.at(-1)==='self-test'){
 const old='Job: 07-agents/jobs/trigger-intelligence.md\n- Canonical source: https://github.com/Quazmoz/growth-os. Local instructions-only snapshot: /old.\n- Read the relevant engine README and canonical job spec before work. Full evidence is not installed in this snapshot.\nHosted runtime policy: public only; hosted_model_allowed:false is a hard deny.\n';
 const updated=canonicalGrowthInstructions(old);
 assert(!updated.includes('Local instructions-only snapshot:'));
 assert(!updated.includes('Full evidence is not installed'));
 assert(updated.includes('PAPERCLIP_WORKSPACE_CWD'));
 assert(updated.includes('hosted_model_allowed:false is a hard deny.'));
 assert(updated.includes('Job: 07-agents/jobs/trigger-intelligence.md'));
 assert.equal(canonicalGrowthInstructions(updated),updated);
 console.log('GROWTH_RUNTIME_GUIDANCE_SELF_TEST_PASSED');
}
