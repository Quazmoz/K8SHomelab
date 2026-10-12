// Run inside the pinned Paperclip container with its tsx loader. No board key is created.
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { execFileSync, spawn } from 'node:child_process';
import { isDeepStrictEqual } from 'node:util';
import postgres from '/app/packages/db/node_modules/postgres/src/index.js';
import { createDb, closeRegisteredClients } from '/app/packages/db/src/client.ts';
import { agents as agentTable, agentConfigRevisions, toolConnections, connectionGrants, toolConnectionInstalls } from '/app/packages/db/src/index.ts';
import { eq, and, inArray } from '/app/server/node_modules/drizzle-orm/index.js';
import { companyService } from '/app/server/src/services/companies.ts';
import { accessService } from '/app/server/src/services/access.ts';
import { agentService } from '/app/server/src/services/agents.ts';
import { projectService } from '/app/server/src/services/projects.ts';
import { executionWorkspaceService } from '/app/server/src/services/execution-workspaces.ts';
import { assertGitSensitiveAdapterWorkspaceValid } from '/app/server/src/services/heartbeat.ts';
import { goalService } from '/app/server/src/services/goals.ts';
import { issueService } from '/app/server/src/services/issues.ts';
import { aiConnectionService } from '/app/server/src/services/ai-connections.ts';
import { prepareManagedAiRuntime, assertManagedAiProjectAuth } from '/app/server/src/services/ai-connection-runtime.ts';
import { requireServerAdapter } from '/app/server/src/adapters/registry.ts';
import { localAiLoginService } from '/app/server/src/services/local-ai-login.ts';
import { logActivity } from '/app/server/src/services/activity-log.ts';
import { createAgentSchema, createRoutineSchema, createRoutineTriggerSchema } from '/app/packages/shared/src/index.ts';
import { routineService } from '/app/server/src/services/routines.ts';
import { fetchClaudeQuota } from '/app/packages/adapters/claude-local/src/server/index.ts';

process.umask(0o077);
const root = '/paperclip/reorganization-2026-10-06';
function databaseUrl() {
 const configured=process.env.PAPERCLIP_OPERATOR_DATABASE_URL??process.env.DATABASE_URL;
 if(configured)return configured;
 // Reuse the pinned server's embedded defaults without storing a password in this repository.
 const bootstrap=fs.readFileSync('/app/server/src/index.ts','utf8');
 const credentials=bootstrap.match(/const embeddedConnectionString = `postgres:\/\/([^@]+)@127\.0\.0\.1:\$\{port\}\/paperclip`/);
 const port=fs.readFileSync('/paperclip/instances/default/db/postmaster.pid','utf8').split('\n')[3];
 if(!credentials||!/^\d+$/.test(port))throw new Error('Provide PAPERCLIP_OPERATOR_DATABASE_URL for this runtime version');
 return `postgres://${credentials[1]}@127.0.0.1:${port}/paperclip`;
}
const url = databaseUrl();
const sql = postgres(url, { max: 1 });
const db = createDb(url, { maxConnections: 1 });
const phase = process.argv.at(-1);
if (['prepare', 'connections', 'claude-login', 'claude-auth-health', 'claude-reconnect-check', 'claude-reconnect', 'qualify'].includes(phase) && process.getuid() !== 1000) {
 throw new Error('Run provider setup as the Paperclip runtime user: kubectl exec ... -- gosu node node --import ...');
}
const companyNames = { consulting: 'Quinn Favo AI Consulting', android: 'Quazmoz Android Development', marketing: 'Quazmoz Growth OS' };
// Inference: expensive judgment belongs with leaders; implementation uses Codex.
const roster = [
 ['Percival','consulting','ceo','AI Consulting Director',null,'claude'],
 ['Graham','consulting','cto','Principal AI & DevOps Architect','Percival','claude'],
 ['Ward','consulting','security','Security & Architecture Reviewer','Graham','claude'],
 ['Harper','consulting','engineer','AI Automation Engineer','Graham','codex'],
 ['Kernel','consulting','devops','Platform Engineer','Graham','codex'],
 ['Patch','consulting','engineer','Maintenance Engineer','Graham','codex'],
 ['Cipher','consulting','researcher','Technical Investigation Engineer','Graham','codex'],
 ['Beacon','consulting','devops','Observability Triage Analyst','Graham','cloudflare'],
 ['Otto','consulting','devops','Release Readiness Coordinator','Graham','ollama'],
 ['Ledger','consulting','researcher','Consulting Metrics Analyst','Percival','ollama'],
 ['Beatrice','consulting','general','Consulting Operations Coordinator','Percival','ollama'],
 ['Mabel','consulting','general','Consulting Knowledge Curator','Beatrice','cloudflare'],
 ['Android Director','android','ceo','Android Portfolio Director',null,'claude'],
 ['Ada','android','cto','Principal Android & Wear OS Engineer','Android Director','claude'],
 ['Wesley','android','engineer','Android Engineer','Ada','codex'],
 ['Wren','android','engineer','Wear OS Engineer','Ada','codex'],
 ['Pearl','android','qa','Mobile QA & Reliability Engineer','Ada','codex'],
 ['Elsie','android','designer','Mobile Product Designer','Android Director','codex'],
 ['Sterling','android','engineer','Store & Monetization Engineer','Ada','codex'],
 ['Growth OS Director','marketing','ceo','Growth OS Director / CEO',null,'claude','ceo'],
 ['Iris','marketing','researcher','Market Intelligence Analyst','Growth OS Director','codex','market-intelligence'],
 ['Quill','marketing','cmo','Content Intelligence Lead','Growth OS Director','codex','content-intelligence'],
 ['Sage','marketing','pm','Growth Experimentation Lead','Growth OS Director','claude','experimentation'],
 ['Scout','marketing','researcher','Consulting Intelligence Analyst','Growth OS Director','ollama','consulting-intelligence'],
].map(([name,company,role,title,manager,tier,job])=>({name,company,role,title,manager,tier,job}));
const retired = ['Agnes','Nora','Porter','Clerk','Constance','Courier','Relay','Scout 2','TestAgent'];
const models = { claude: 'claude-opus-5', codex: 'gpt-6-sol', ollama: 'ollama-cloud/nemotron-3-super', cloudflare: 'cloudflare-workers-ai/@cf/zai-org/glm-4.7-flash' };
// Keep the original reorganization revision immutable; model changes have their own receipt.
const modelUpdateRoot = '/paperclip/model-update-2026-10-12';
const modelUpdateTargets = { claude_local: 'claude-opus-5-5', codex_local: 'gpt-6.1-sol' };

function assert(value, message) { if (!value) throw new Error(message); }
function writeOwned(file, content) {
 fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
 fs.writeFileSync(file, content, { mode: 0o600 });
 fs.chownSync(file, 1000, 1000); fs.chownSync(path.dirname(file), 1000, 1000);
}
async function audit(companyId, action, entityType, entityId, details) {
 await logActivity(db, { companyId, actorType: 'user', actorId: admin, action, entityType, entityId, details });
}
let admin;
try {
 assert(fs.existsSync(`${root}/backup-manifest.json`), 'A successful backup is required');
 [ { user_id: admin } ] = await sql`select user_id from instance_user_roles where role='instance_admin'`;
 const companies = {};
 for (const [key,name] of Object.entries(companyNames)) {
  let [c] = await sql`select * from companies where name=${name}`;
  if (!c && phase === 'prepare') {
   c = await companyService(db).create({ name, description: key==='android' ? 'Android and Wear OS portfolio engineering, QA, release preparation, and product decisions.' : 'Evidence-driven marketing control plane based on Quazmoz/growth-os; n8n executes deterministic operations.', defaultResponsibleUserId: admin, requireBoardApprovalForNewAgents: true });
   const access = accessService(db);
   await access.ensureMembership(c.id, 'user', admin, 'owner', 'active');
   await access.ensureRoleDefaultGrants(c.id, admin, 'owner', admin);
   await audit(c.id,'company.created','company',c.id,{name,source:'authorized three-company reorganization'});
  }
  assert(c, `Company ${name} is missing; run prepare first`); companies[key]=c;
 }
 if (phase === 'prepare') {
  const intent = { provider:'openai', method:'subscription', name:'Quinn Codex subscription', ownership:'personal', agentIds:[], allAgents:true };
  const existing = await aiConnectionService(db).list(companies.consulting.id, admin);
  if (!existing.some(x=>x.provider==='openai'&&x.status==='connected')) {
   const login = await localAiLoginService(db).start(companies.consulting.id, admin, intent);
   writeOwned(`${root}/codex-login.json`, JSON.stringify({ ...login, intent, companyId:companies.consulting.id, userId:admin }));
   console.log('CODEX_LOGIN',JSON.stringify(login));
  }
  console.log('COMPANIES',JSON.stringify(Object.fromEntries(Object.entries(companies).map(([k,c])=>[k,{id:c.id,name:c.name}]))));
  console.log('PLAN',JSON.stringify({active:roster.length,paused:retired,models}));
  process.exitCode=0;
 } else if (phase === 'claude-login') {
  const c=companies.consulting;
  const svc=aiConnectionService(db);
  const connection=(await svc.list(c.id,admin)).find(x=>x.provider==='anthropic'&&x.method==='subscription'&&x.ownership==='personal');
  const ids=(await sql`select id from agents where company_id=${c.id} and adapter_type='claude_local' and status='idle'`).map(a=>a.id);
  const intent={provider:'anthropic',method:'subscription',name:'Quinn Claude subscription',ownership:'personal',agentIds:ids,allAgents:false,...(connection?{connectionId:connection.id}:{})};
  const file=`${root}/claude-login.json`;
  let login=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):null;
  if(!login||Date.parse(login.expiresAt)<=Date.now())login=await localAiLoginService(db).start(c.id,admin,intent,true);
  writeOwned(file,JSON.stringify({...login,intent,companyId:c.id,userId:admin}));
  const check=await localAiLoginService(db).check(c.id,admin,intent,login.sessionId);
  if(check.status==='ready'){
   await localAiLoginService(db).complete(c.id,admin,login.sessionId,intent);
   console.log('CLAUDE_COMPANY','consulting connected');
  }else console.log('CLAUDE_LOGIN_PENDING',JSON.stringify({sessionId:login.sessionId,expiresAt:login.expiresAt}));
 } else if (phase === 'connections') {
  const svc=aiConnectionService(db);
  const [{id:claudeAgentId}]=await sql`select id from agents where company_id=${companies.consulting.id} and name='Percival'`;
  const original=await svc.select({companyId:companies.consulting.id,userId:admin,agentId:claudeAgentId,binding:{mode:'responsible_user',provider:'anthropic',method:'subscription'},adapterType:'claude_local',allowUninstalledPersonal:true});
  let token=await svc.credential(original);
  try { await fetchClaudeQuota(token); console.log('CLAUDE_SUBSCRIPTION','verified'); }
  catch { token=null; console.log('CLAUDE_SUBSCRIPTION','reconnect required; existing credential could not be verified'); }
  for(const [key,c] of Object.entries(companies)){
   const ids=(await sql`select id from agents where company_id=${c.id} and adapter_type='claude_local' and status='idle'`).map(a=>a.id);
   const connections=await svc.list(c.id,admin);
   let connection=connections.find(x=>x.provider==='anthropic'&&x.method==='subscription'&&x.status==='connected');
   if(token){
    if(!connection){const saved=await svc.save(c.id,admin,{provider:'anthropic',method:'subscription',name:'Quinn Claude subscription',ownership:'personal',agentIds:ids,allAgents:false},token);connection={id:saved.connectionId,grantId:saved.grantId};}
    for(const id of ids)await sql`insert into tool_connection_installs (company_id,connection_id,target_type,target_id,created_by_user_id) values (${c.id},${connection.id},'agent',${id},${admin}) on conflict do nothing`;
    console.log('CLAUDE_COMPANY',key,ids.length);
   }
   let loginFile=`${root}/codex-login-${key}.json`;
   if(key==='consulting')loginFile=`${root}/codex-login.json`;
   const openai=connections.find(x=>x.provider==='openai'&&x.method==='subscription'&&x.status==='connected');
   if(openai){console.log('CODEX_COMPANY',key,'connected');continue;}
   const intent={provider:'openai',method:'subscription',name:'Quinn Codex subscription',ownership:'personal',agentIds:[],allAgents:true};
   let login=fs.existsSync(loginFile)?JSON.parse(fs.readFileSync(loginFile,'utf8')):null;
   if(!login||Date.parse(login.expiresAt)<=Date.now())login=await localAiLoginService(db).start(c.id,admin,intent);
   writeOwned(loginFile,JSON.stringify({...login,intent,companyId:c.id,userId:admin}));
   const check=await localAiLoginService(db).check(c.id,admin,intent,login.sessionId);
   if(check.status==='ready'){
    await localAiLoginService(db).complete(c.id,admin,login.sessionId,intent);
    console.log('CODEX_COMPANY',key,'connected');
   }else console.log('CODEX_LOGIN_PENDING',key,JSON.stringify({sessionId:login.sessionId,expiresAt:login.expiresAt}));
  }
 } else if (phase === 'claude-auth-health') {
  // deterministic_steps: verify persisted 401, invoke guarded native health repair, record metadata.
  // llm_steps: none; idempotency_key: claude-auth-health:<run>:<credential-generation>.
  // failure_policy: never invalidate a newer credential; cost_policy: no provider calls.
  // measurement_path: /paperclip/claude-auth-repair-2026-10-12/health.json.
  const [run]=await sql`select id,company_id,agent_id,status,error,started_at,context_snapshot->'aiConnection' as attribution from heartbeat_runs where id='030ea912-9a25-438b-8158-46ba3cfdeefe'`;
  assert(run?.company_id===companies.marketing.id&&run.agent_id==='ce3afae4-f7f4-4e50-a16e-69e58edd1ae2'&&run.status==='failed'&&run.error?.includes('401 OAuth access token has expired.'),'Expected persisted Growth OS Claude authentication failure');
  assert(run.attribution?.provider==='anthropic'&&run.attribution.method==='subscription'&&run.started_at,'Missing subscription failure attribution');
  await aiConnectionService(db).markAuthenticationFailed({companyId:run.company_id,runId:run.id,agentId:run.agent_id,runStartedAt:run.started_at,attribution:run.attribution});
  const [state]=await sql`select g.status as grant_status,c.health_status from connection_grants g join tool_connections c on c.id=g.connection_id where g.id=${run.attribution.grantId} and c.company_id=${run.company_id}`;
  const receipt={runId:run.id,connectionId:run.attribution.connectionId,...state,reason:'claude_oauth_access_token_expired',checkedAt:new Date().toISOString()};
  writeOwned('/paperclip/claude-auth-repair-2026-10-12/health.json',JSON.stringify(receipt,null,2));
  console.log('CLAUDE_AUTH_HEALTH',JSON.stringify(receipt));
 } else if (['claude-reconnect-check','claude-reconnect'].includes(phase)) {
  // deterministic_steps: scope existing connections, native CLI authorization, atomic native reconnect.
  // llm_steps: none; idempotency_key: claude-reconnect:<current-credential-generation>.
  // failure_policy: retain existing secrets on incomplete sign-in/concurrent drift; cost_policy: subscription login only.
  // measurement_path: /paperclip/claude-auth-repair-2026-10-12/reconnected.json.
  const repairRoot='/paperclip/claude-auth-repair-2026-10-12';
  const failedConnection='203b52cb-ca6d-4668-bc8e-ec29a9b74d6a';
  const targets=[];
  for(const [key,c] of Object.entries(companies)){
   const rows=await db.select({connection:toolConnections,grant:connectionGrants}).from(toolConnections).innerJoin(connectionGrants,eq(connectionGrants.connectionId,toolConnections.id)).where(and(eq(toolConnections.companyId,c.id),eq(toolConnections.connectionPurpose,'ai'),eq(connectionGrants.subjectUserId,admin)));
   const matching=rows.filter(r=>r.connection.config.ai?.provider==='anthropic'&&r.connection.config.ai?.method==='subscription'&&r.connection.enabled&&r.grant.kind==='user'&&r.grant.createdByUserId===admin);
   assert(matching.length===1,`Expected one existing personal Claude connection in ${key}`);
   const row=matching[0];
   assert(['active','needs_reauthorization'].includes(row.grant.status),'Do not restore a revoked connection');
   const value=await aiConnectionService(db).credential(row);
   targets.push({key,...row,value});
  }
  const growth=targets.find(t=>t.connection.id===failedConnection);
  assert(growth,'Missing existing Growth OS Claude connection');
  const generation=createHash('sha256').update(growth.value).digest('hex');
  if(phase==='claude-reconnect-check'){
   assert(targets.every(t=>t.value===growth.value),'Company Claude credentials differ; reconnect them separately');
   console.log('CLAUDE_RECONNECT_READY',JSON.stringify({connections:targets.length,credentialsMatch:true,growthGrantStatus:growth.grant.status,loginMethod:'native claude setup-token',ownerSignInRequired:true}));
  }else if(fs.existsSync(`${repairRoot}/reconnected.json`)){
   const receipt=JSON.parse(fs.readFileSync(`${repairRoot}/reconnected.json`,'utf8'));
   if(receipt.credentialGeneration===generation&&targets.every(t=>t.value===growth.value&&t.grant.status==='active'&&t.connection.healthStatus==='ok')){
    console.log('CLAUDE_RECONNECT_NOOP');
    process.exitCode=0;
   }else throw new Error('A later credential change requires a newly reviewed repair revision');
  }else{
   assert(process.stdin.isTTY,'Use kubectl exec -it for the owner browser sign-in');
   assert(targets.every(t=>t.value===growth.value),'Company Claude credentials differ; reconnect them separately');
   const companyIds=targets.map(t=>t.connection.companyId);
   async function assertNoRuns(){assert(!(await sql`select id from heartbeat_runs where company_id in ${sql(companyIds)} and status in ('queued','running','scheduled_retry')`).length,'Wait for active or scheduled runs before reconnecting');}
   await assertNoRuns();
   const connectionIds=targets.map(t=>t.connection.id);
   async function readScope(client){return [...await client.select().from(toolConnectionInstalls).where(inArray(toolConnectionInstalls.connectionId,connectionIds)).orderBy(toolConnectionInstalls.connectionId,toolConnectionInstalls.targetType,toolConnectionInstalls.targetId)];}
   const scopeBefore=await readScope(db);
   const attemptStartedAt=new Date();
   const loginHome=fs.mkdtempSync('/tmp/paperclip-claude-reconnect-');
   let output='';
   let token;
   try{
    const env={...process.env,CLAUDE_CONFIG_DIR:loginHome,NO_COLOR:'1',TERM:'dumb',ANTHROPIC_API_KEY:'',ANTHROPIC_AUTH_TOKEN:'',CLAUDE_CODE_OAUTH_TOKEN:'',CLAUDE_CODE_USE_BEDROCK:'',CLAUDE_CODE_USE_VERTEX:'',CLAUDE_CODE_USE_FOUNDRY:'',ANTHROPIC_BASE_URL:'',ANTHROPIC_PROFILE:''};
    console.log('Authorizing the existing Claude subscription. Open the URL below, then paste its browser login code into this terminal and press Enter.');
    // A real PTY is required by the native CLI. Never relay its raw output: it contains the new token.
    const child=spawn('script',['-q','-e','-f','-c','stty cols 4096; exec claude setup-token','/dev/null'],{env,stdio:['inherit','pipe','pipe'],detached:true});
    const clean=text=>text.replace(/\x1b\[[0-?]*[ -/]*[@-~]/g,'').replace(/\x1b\][^\x07]*(?:\x07|\x1b\\)/g,'');
    let urlShown=false;
    const collect=chunk=>{
     output+=chunk.toString('utf8');
     if(output.length>256*1024){try{process.kill(-child.pid,'SIGTERM');}catch{}return;}
     if(!urlShown){const url=clean(output).match(/https:\/\/(?:claude\.ai|console\.anthropic\.com|platform\.claude\.com)\/oauth\/authorize\?[^\s\x00-\x1f]+(?=[\s\x00-\x1f])/);if(url){console.log(url[0]);urlShown=true;}}
    };
    child.stdout.on('data',collect);child.stderr.on('data',collect);
    const terminate=()=>{try{process.kill(-child.pid,'SIGTERM');}catch{}};
    process.once('SIGTERM',terminate);process.once('SIGINT',terminate);
    const timeout=setTimeout(()=>{try{process.kill(-child.pid,'SIGTERM');}catch{}},10*60*1000);
    const wasRaw=process.stdin.isRaw;process.stdin.setRawMode(true);
    let code;
    try{code=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',resolve);});}
    finally{clearTimeout(timeout);process.removeListener('SIGTERM',terminate);process.removeListener('SIGINT',terminate);process.stdin.setRawMode(wasRaw);}
    assert(code===0&&output.length<=256*1024,'Claude sign-in did not complete; existing credentials were preserved');
    const tokens=[...new Set(clean(output).match(/sk-ant-oat01-[A-Za-z0-9_-]{40,}/g)??[])];
    assert(tokens.length===1,'Claude did not return one complete setup token; existing credentials were preserved');
    [token]=tokens;output='';
    await assertNoRuns();
    const saved=await db.transaction(async tx=>{
     await tx.select().from(toolConnections).where(inArray(toolConnections.id,connectionIds)).for('update');
     assert(isDeepStrictEqual(scopeBefore,await readScope(tx)),'Connection scope changed during sign-in; start again');
     const svc=aiConnectionService(tx);
     const receipts=[];
     for(const t of targets){
      const result=await svc.save(t.connection.companyId,admin,{provider:'anthropic',method:'subscription',name:t.connection.name,ownership:'personal',agentIds:[],allAgents:false,connectionId:t.connection.id},token,undefined,attemptStartedAt);
      assert(result.connectionId===t.connection.id&&result.grantId===t.grant.id,'Reconnect changed the existing connection identity');receipts.push({company:t.key,...result});
     }
     assert(isDeepStrictEqual(scopeBefore,await readScope(tx)),'Reconnect changed an installation scope');
     return receipts;
    });
    const receipt={reconnectedAt:new Date().toISOString(),connections:saved,credentialGeneration:createHash('sha256').update(token).digest('hex'),method:'native claude setup-token',scopeUnchanged:true,modelInferenceTested:false};
    writeOwned(`${repairRoot}/reconnected.json`,JSON.stringify(receipt,null,2));
    console.log('CLAUDE_RECONNECTED',JSON.stringify({connections:saved.length,scopeUnchanged:true,modelInferenceTested:false}));
   }catch{throw new Error('Claude reconnect could not finish. Check connection health before retrying.');}
   finally{output='';token=undefined;fs.rmSync(loginHome,{recursive:true,force:true});}
  }
 } else if (phase === 'growth-workspace') {
  // deterministic_steps: allowlist installed instructions, prepare Git, transact workspace repair, validate.
  // llm_steps: none; idempotency_key: growth-workspace-2026-10-12:<workspace>:<snapshot>.
  // failure_policy: fail closed on unexpected files/state; cost_policy: no network/model calls.
  // measurement_path: /paperclip/workspace-repair-2026-10-12/applied.json.
  const repairRoot='/paperclip/workspace-repair-2026-10-12';
  const [issue]=await sql`select id,identifier,company_id,project_id,project_workspace_id,assignee_agent_id from issues where company_id=${companies.marketing.id} and identifier='QUAA-17'`;
  assert(issue?.project_id&&issue.project_workspace_id&&issue.assignee_agent_id,'Missing scoped QUAA-17 project assignment');
  assert(!(await sql`select id from heartbeat_runs where status in ('queued','running')`).length,'Wait for active runs before workspace repair');
  const [workspace]=await sql`select * from project_workspaces where id=${issue.project_workspace_id} and project_id=${issue.project_id}`;
  assert(workspace,'Missing scoped project workspace');
  const executionRows=[...await sql`select * from execution_workspaces where company_id=${issue.company_id} and project_id=${issue.project_id} and project_workspace_id=${workspace.id} and source_issue_id=${issue.id} and status='active'`];
  assert(executionRows.length>0&&executionRows.every(w=>w.mode==='shared_workspace'&&w.strategy_type==='project_primary'),'Unexpected execution workspace mode');
  const source=`${root}/growth-instructions`;
  const approvedFiles=new Set(['README.md','AGENTS.md','growth-os.yaml','paperclip/growth-os-company/.paperclip.yaml','paperclip/growth-os-company/README.md','paperclip/growth-os-company/COMPANY.md','paperclip/growth-os-company/projects/growth-os/PROJECT.md']);
  for(const engine of ['01-customer-truth','02-content-engine','03-outbound-engine','04-creative-testing','05-ai-search-visibility','06-growth-cockpit','07-agents'])approvedFiles.add(`${engine}/README.md`);
  for(const job of ['growth-director','market-intelligence','source-material-miner','content-repurposer','experiment-planner','trigger-intelligence'])approvedFiles.add(`07-agents/jobs/${job}.md`);
  for(const role of ['ceo','consulting-intelligence','content-intelligence','experimentation','market-intelligence'])approvedFiles.add(`paperclip/growth-os-company/agents/${role}/AGENTS.md`);
  for(const skill of ['control-plane-boundaries','growth-os-core','privacy-routing'])approvedFiles.add(`paperclip/growth-os-company/skills/${skill}/SKILL.md`);
  for(const task of ['monday-market-intelligence','weekly-growth-review'])approvedFiles.add(`paperclip/growth-os-company/projects/growth-os/tasks/${task}/TASK.md`);
  const files=[];
  function collectInstructions(dir,prefix=''){
   for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    const relative=prefix+entry.name;
    assert(!entry.isSymbolicLink(),'Instruction package contains a symlink');
    if(entry.isDirectory())collectInstructions(path.join(dir,entry.name),relative+'/');
    else{
     assert(entry.isFile()&&approvedFiles.has(relative),'Instruction package contains an unapproved file');
     files.push(relative);
    }
   }
  }
  collectInstructions(source);files.sort();
  assert(files.length===approvedFiles.size,'Instruction package is incomplete');
  const snapshotHash=createHash('sha256');
  for(const file of files){snapshotHash.update(file+'\0');snapshotHash.update(fs.readFileSync(path.join(source,file)));}
  const snapshotSha256=snapshotHash.digest('hex');
  const cwd=`/paperclip/instances/default/projects/${issue.company_id}/${issue.project_id}/growth-os`;
  const marker='.paperclip-instructions-source.json';
  if(!fs.existsSync(cwd)){
   fs.mkdirSync(path.dirname(cwd),{recursive:true});
   const stage=fs.mkdtempSync(cwd+'.repair-');
   try{
    for(const file of files){const destination=path.join(stage,file);fs.mkdirSync(path.dirname(destination),{recursive:true});fs.copyFileSync(path.join(source,file),destination);}
    fs.writeFileSync(path.join(stage,marker),JSON.stringify({kind:'instructions-only',canonicalRepository:'https://github.com/Quazmoz/growth-os',sourceSnapshot:'reorganization-2026-10-06',snapshotSha256,files,allowInternalHosted:false,customerEvidenceInstalled:false},null,2));
    execFileSync('git',['-C',stage,'init','-b','main'],{stdio:'pipe'});
    execFileSync('git',['-C',stage,'add','--all'],{stdio:'pipe'});
    execFileSync('git',['-C',stage,'-c','user.name=Paperclip instructions snapshot','-c','user.email=workspace@paperclip.local','-c','commit.gpgsign=false','commit','-m','Initialize approved Growth OS instructions snapshot'],{stdio:'pipe'});
    execFileSync('chown',['-R','1000:1000',stage]);
    fs.renameSync(stage,cwd);
   }finally{if(fs.existsSync(stage))fs.rmSync(stage,{recursive:true});}
  }
  assert(fs.existsSync(path.join(cwd,'.git'))&&fs.existsSync(path.join(cwd,marker)),'Existing path is not the approved instruction checkout');
  assert(JSON.parse(fs.readFileSync(path.join(cwd,marker),'utf8')).snapshotSha256===snapshotSha256,'Instruction snapshot revision changed');
  execFileSync('gosu',['node','git','-C',cwd,'status','--porcelain'],{stdio:'pipe'});
  const needsChange=workspace.cwd!==cwd||workspace.repo_url!==null||workspace.source_type!=='local_path'||executionRows.some(w=>w.cwd!==cwd||w.repo_url!==null);
  if(needsChange&&!fs.existsSync(`${repairRoot}/before.json`))writeOwned(`${repairRoot}/before.json`,JSON.stringify({workspace,executionRows},null,2));
  await db.transaction(async tx=>{
   if(needsChange){
    await projectService(tx).updateWorkspace(issue.project_id,workspace.id,{name:workspace.name,cwd,repoUrl:null,sourceType:'local_path',metadata:{...workspace.metadata,canonicalRepository:'https://github.com/Quazmoz/growth-os',instructionsOnly:true,snapshotSha256,allowInternalHosted:false}});
   }
   for(const row of executionRows){
    const persisted=needsChange?await executionWorkspaceService(tx).update(row.id,{cwd,repoUrl:null,metadata:{...row.metadata,instructionsOnly:true,snapshotSha256}}):await executionWorkspaceService(tx).getById(row.id);
    assert(persisted,'Missing persisted execution workspace');
    await assertGitSensitiveAdapterWorkspaceValid({adapterType:'claude_local',agentId:issue.assignee_agent_id,issue:{id:issue.id,identifier:issue.identifier,projectId:issue.project_id,projectWorkspaceId:workspace.id},resolvedWorkspace:{cwd,source:'project_primary',projectId:issue.project_id,workspaceId:workspace.id,warnings:[]},executionWorkspace:{cwd,strategy:'project_primary',projectId:issue.project_id,workspaceId:workspace.id,repoUrl:null,branchName:null},persistedExecutionWorkspace:persisted,executionTarget:null});
   }
   if(needsChange)await logActivity(tx,{companyId:issue.company_id,actorType:'user',actorId:admin,action:'project.workspace.updated',entityType:'project',entityId:issue.project_id,details:{workspaceId:workspace.id,issueIdentifier:issue.identifier,source:'authorized local instruction workspace repair',snapshotSha256,instructionsOnly:true,workspaceValidation:'passed'}},[]);
  });
  const receipt={issue:issue.identifier,workspaceId:workspace.id,cwd,snapshotSha256,instructionFiles:files.length,gitCommit:execFileSync('gosu',['node','git','-C',cwd,'rev-parse','HEAD'],{encoding:'utf8'}).trim(),nativeWorkspaceValidation:'passed',githubCredentialAdded:false,customerEvidenceInstalled:false,providerWorkStarted:false};
  if(needsChange||!fs.existsSync(`${repairRoot}/applied.json`))writeOwned(`${repairRoot}/applied.json`,JSON.stringify({appliedAt:new Date().toISOString(),...receipt},null,2));
  console.log(needsChange?'GROWTH_WORKSPACE_REPAIRED':'GROWTH_WORKSPACE_NOOP',JSON.stringify(receipt));
 } else if (phase === 'models') {
  // deterministic_steps: snapshot, enforce idle state, transact model patches/revisions/audits, compare.
  // llm_steps: none; idempotency_key: model-update-2026-10-12:<agent>:<target>.
  // failure_policy: transaction rollback; unchanged reruns no-op; never widen permissions.
  // cost_policy: no inference or paid fallback; measurement_path: modelUpdateRoot/applied.json.
  assert(!(await sql`select id from heartbeat_runs where status in ('queued','running')`).length,'Wait for active runs before updating models');
  const before=[...await sql`select id,company_id,name,status,reports_to,adapter_type,adapter_config,runtime_config,permissions,budget_monthly_cents from agents order by id`];
  const targets=before.filter(a=>Object.hasOwn(modelUpdateTargets,a.adapter_type));
  const changed=targets.filter(a=>a.adapter_config.model!==modelUpdateTargets[a.adapter_type]);
  if(!changed.length){console.log('MODELS_NOOP',targets.length);}
  else{
   assert(!fs.existsSync(`${modelUpdateRoot}/applied.json`),'Applied model revision drifted; review a new revision');
   const snapshotFile=`${modelUpdateRoot}/agents-before.json`;
   if(fs.existsSync(snapshotFile))assert(isDeepStrictEqual(JSON.parse(fs.readFileSync(snapshotFile,'utf8')),before),'Model snapshot drifted');
   else writeOwned(snapshotFile,JSON.stringify(before,null,2));
   const expected=before.map(a=>Object.hasOwn(modelUpdateTargets,a.adapter_type)?{...a,adapter_config:{...a.adapter_config,model:modelUpdateTargets[a.adapter_type]}}:a);
   const fields={id:agentTable.id,company_id:agentTable.companyId,name:agentTable.name,status:agentTable.status,reports_to:agentTable.reportsTo,adapter_type:agentTable.adapterType,adapter_config:agentTable.adapterConfig,runtime_config:agentTable.runtimeConfig,permissions:agentTable.permissions,budget_monthly_cents:agentTable.budgetMonthlyCents};
   await db.transaction(async tx=>{
    const locked=await tx.select(fields).from(agentTable).orderBy(agentTable.id).for('update');
    assert(isDeepStrictEqual(locked,before),'Agent configuration changed before model transaction');
    const revisionFields=['name','role','title','icon','appearance','reportsTo','capabilities','adapterType','adapterConfig','runtimeConfig','defaultEnvironmentId','budgetMonthlyCents','metadata'];
    for(const a of changed){
     const [current]=await tx.select().from(agentTable).where(eq(agentTable.id,a.id)).for('update');
     assert(current&&isDeepStrictEqual(current.adapterConfig,a.adapter_config),'Agent changed during model update');
     const config={...a.adapter_config,model:modelUpdateTargets[a.adapter_type]};
     // The general updater normalizes env (including explicit no-API-fallback entries).
     // Patch only this field using Paperclip's schema, retaining its revisions and audit trail.
     const [updated]=await tx.update(agentTable).set({adapterConfig:config,updatedAt:new Date()}).where(eq(agentTable.id,a.id)).returning();
     assert(updated&&isDeepStrictEqual(updated.adapterConfig,config),'Model patch changed additional adapter settings');
     assert(isDeepStrictEqual(updated.runtimeConfig,a.runtime_config)&&isDeepStrictEqual(updated.permissions,a.permissions)&&updated.status===a.status,'Model patch changed runtime policy');
     const beforeConfig=Object.fromEntries(revisionFields.map(key=>[key,current[key]]));
     await tx.insert(agentConfigRevisions).values({companyId:a.company_id,agentId:a.id,createdByUserId:admin,source:'patch',changedKeys:['adapterConfig'],beforeConfig,afterConfig:{...beforeConfig,adapterConfig:config}});
     await logActivity(tx,{companyId:a.company_id,actorType:'user',actorId:admin,action:'agent.updated',entityType:'agent',entityId:a.id,details:{changedKeys:['adapterConfig.model'],previousModel:a.adapter_config.model,model:config.model,source:'authorized model-update-2026-10-12'}},[]);
    }
    const after=await tx.select(fields).from(agentTable).orderBy(agentTable.id);
    assert(isDeepStrictEqual(after,expected),'Unexpected configuration drift in model transaction');
   });
   writeOwned(`${modelUpdateRoot}/applied.json`,JSON.stringify({appliedAt:new Date().toISOString(),targets:modelUpdateTargets,changedAgents:changed.map(a=>({id:a.id,companyId:a.company_id,adapter:a.adapter_type,previousModel:a.adapter_config.model,model:modelUpdateTargets[a.adapter_type]})),verifiedModelOnly:true},null,2));
   console.log('MODELS_UPDATED',JSON.stringify({changed:changed.length,targets:modelUpdateTargets,verifiedModelOnly:true}));
  }
 } else if (phase === 'qualify') {
  const receiptPath=fs.existsSync(`${modelUpdateRoot}/applied.json`)?`${modelUpdateRoot}/subscription-qualification.json`:`${root}/subscription-qualification.json`;
  const receipts=fs.existsSync(receiptPath)?JSON.parse(fs.readFileSync(receiptPath,'utf8')):[];
  const provider=process.env.PAPERCLIP_QUALIFY_PROVIDER;
  assert(!provider||['anthropic','openai'].includes(provider),'Invalid qualification provider');
  for(const [key,c] of Object.entries(companies)){
   for(const adapter of ['claude_local','codex_local']){
    const agents=await sql`select id,name,adapter_config,runtime_config from agents where company_id=${c.id} and adapter_type=${adapter} and status='idle' order by created_at`;
    for(const a of agents)await aiConnectionService(db).select({companyId:c.id,agentId:a.id,userId:admin,adapterType:adapter,model:a.adapter_config.model,binding:a.runtime_config.aiConnection});
    const a=agents[0];
    if(provider&&a.runtime_config.aiConnection.provider!==provider)continue;
    let managed;
    try{
     managed=await prepareManagedAiRuntime(db,{companyId:c.id,agentId:a.id,responsibleUserId:admin,adapterType:adapter,binding:a.runtime_config.aiConnection,config:{...a.adapter_config,helloProbeTimeoutSec:45}});
     const inputKey=createHash('sha256').update(JSON.stringify({company:c.id,adapter,config:a.adapter_config,identity:managed.identity,version:process.env.PAPERCLIP_BUILD_VERSION??'2026.1005.0'})).digest('hex');
     if(receipts.some(r=>r.company===key&&r.adapter===adapter&&r.inputKey===inputKey&&r.status==='pass')){console.log('SUBSCRIPTION_PROBE_NOOP',key,adapter);continue;}
     await assertManagedAiProjectAuth(managed.config,a.runtime_config.aiConnection.provider);
     const context={companyId:c.id,adapterType:adapter,config:managed.config,executionTarget:null,environmentName:'Paperclip local pod'};
     const result=await requireServerAdapter(adapter).testEnvironment(context);
     if(result.status!=='fail'&&!result.checks.some(x=>x.code.includes('hello_probe'))){
      // The hello probe runs in an isolated company workspace before repository checkout.
      const extraArgs=adapter==='codex_local'?[...(managed.config.extraArgs??[]),'--skip-git-repo-check']:managed.config.extraArgs;
      const probe=await requireServerAdapter(adapter).testEnvironment({...context,config:{...managed.config,engine:'cli',helloProbeTimeoutSec:45,extraArgs}});
      result.checks.push(...probe.checks);
      result.status=probe.status==='fail'?'fail':result.status==='warn'||probe.status==='warn'?'warn':'pass';
     }
     const receipt={company:key,adapter,model:a.adapter_config.model,inputKey,authorizedAgents:agents.length,status:result.status,testedAt:new Date().toISOString(),checks:result.checks.map(x=>({code:x.code,level:x.level}))};
     const previous=receipts.findIndex(r=>r.company===key&&r.adapter===adapter);
     if(previous>=0)receipts[previous]=receipt;else receipts.push(receipt);
     writeOwned(receiptPath,JSON.stringify(receipts,null,2));
     console.log('SUBSCRIPTION_PROBE',JSON.stringify(receipt));
     if(result.status==='fail')console.log('SUBSCRIPTION_FAILURE',JSON.stringify(result.checks.filter(x=>x.level==='error').map(x=>({code:x.code,detail:String(x.detail??x.message).replace(/[A-Za-z0-9_\-]{32,}/g,'[redacted]').slice(0,240)}))));
     assert(result.checks.some(x=>/hello_probe_(passed|succeeded)$/.test(x.code)),`No successful hello probe for ${key}/${adapter}`);
     assert(result.status!=='fail',`Subscription probe failed for ${key}/${adapter}`);
    }finally{await managed?.cleanup();}
   }
  }
  console.log('SUBSCRIPTIONS_QUALIFIED',receipts.length);
 } else if (phase === 'finish-auth') {
  const receipts=JSON.parse(fs.readFileSync(`${root}/subscription-qualification.json`,'utf8'));
  for(const key of Object.keys(companies))for(const adapter of ['claude_local','codex_local'])assert(receipts.some(r=>r.company===key&&r.adapter===adapter&&r.status==='pass'&&r.checks.some(x=>/hello_probe_(passed|succeeded)$/.test(x.code))),'Complete all six subscription probes before resolving handoffs');
  const svc=issueService(db);
  for(const [key,c] of Object.entries(companies)){
   const [issue]=await sql`select id,status,identifier from issues where company_id=${c.id} and title='Connect Claude and Codex subscriptions' and assignee_user_id=${admin}`;
   assert(issue,`Missing authentication handoff in ${key}`);
   if(issue.status==='done'){console.log('AUTHENTICATION_HANDOFF_NOOP',issue.identifier);continue;}
   await svc.addComment(issue.id,'Fact: Claude and Codex subscriptions are now connected through native per-company managed connections. Fact: every assigned subscription agent passed strict connection selection. Fact: ACP readiness checks and a native CLI hello inference probe passed for each provider/company. Runtime receipt: /paperclip/reorganization-2026-10-06/subscription-qualification.json. Growth OS durable receipt: integrations/paperclip-reorganization-2026-10-06.md. Marketing routines remain paused; repository and business workflow qualification are separate work.',{userId:admin},{clientRequestId:`subscription-qualified:${issue.id}:2026-10-06`});
   await svc.update(issue.id,{status:'done',actorUserId:admin,companyGuard:c.id});
   await audit(c.id,'issue.completed','issue',issue.id,{source:'subscription qualification',receipt:`${root}/subscription-qualification.json`});
   console.log('AUTHENTICATION_HANDOFF_RESOLVED',issue.identifier);
  }
 } else if (phase === 'goals') {
  for(const [key,title] of [
   ['consulting','Deliver evidence-backed AI and DevOps consulting work with verified technical outcomes.'],
   ['android','Ship reliable Android and Wear OS portfolio improvements with tested activation and retention outcomes.'],
   ['marketing','Turn verified market evidence into focused growth decisions, measured experiments, and reusable learning.'],
   ['marketing','Improve qualified discovery, conversion, retention, revenue, and consulting demand without sacrificing accuracy or approval boundaries.'],
  ]){
   if((await sql`select id from goals where company_id=${companies[key].id} and title=${title}`).length)continue;
   const leader=roster.find(d=>d.company===key&&!d.manager);
   const [owner]=await sql`select id from agents where company_id=${companies[key].id} and name=${leader.name}`;
   const goal=await goalService(db).create(companies[key].id,{title,level:'company',status:'active',ownerAgentId:owner.id});
   await audit(companies[key].id,'goal.created','goal',goal.id,{title});
  }
  console.log('GOALS_CONFIGURED',4);
 } else if (phase === 'handoffs') {
  for(const [key,c] of Object.entries(companies)){
   const title='Connect Claude and Codex subscriptions';
   if((await sql`select id from issues where company_id=${c.id} and title=${title}`).length)continue;
   const [project]=await sql`select id from projects where company_id=${c.id} and name<> 'Onboarding' order by created_at limit 1`;
   const issue=await issueService(db).create(c.id,{title,projectId:project.id,status:'blocked',priority:'high',assigneeUserId:admin,createdByUserId:admin,responsibleUserId:admin,actorResponsibleUserId:admin,trustExplicitResponsibleUserId:true,idempotencyKey:`subscription-setup:${c.id}:2026-10-06`,description:'Fact: organization, reporting lines, model tiers, and instructions are configured. Fact: existing Claude subscription verification returned HTTP 401; reconnect it. Fact: Codex requires the separate subscription login prepared for this company. Unblock owner: Quinn. Complete the native provider sign-ins, then run the connections and verify phases of scripts/paperclip/reorganize.mjs from K8SHomelab. Do not add metered API keys or enable scheduled marketing work. Model inference and end-to-end repository work remain unqualified until authentication succeeds.'});
   await audit(c.id,'issue.created','issue',issue.id,{title,unblockOwner:'board',source:'authorized organization configuration'});
   console.log('AUTHENTICATION_HANDOFF',key,issue.identifier);
  }
 } else if (phase === 'history') {
  const applied=JSON.parse(fs.readFileSync(`${root}/applied.json`,'utf8'));
  const before=JSON.parse(fs.readFileSync(`${root}/agents-before.json`,'utf8'));
  // Immutable run identity, audit, and financial attribution retain the company where execution happened.
  await sql.begin(async tx=>{
   for(const a of before){
    const runs=(await tx`select id from heartbeat_runs where agent_id=${a.id} and created_at<=${applied.appliedAt}`).map(r=>r.id);
    if(runs.length){
     await tx`update heartbeat_run_events set company_id=${a.company_id} where run_id in ${tx(runs)}`;
     await tx`update heartbeat_runs set company_id=${a.company_id} where id in ${tx(runs)}`;
     await tx`update environment_leases set company_id=${a.company_id} where heartbeat_run_id in ${tx(runs)}`;
    }
   }
   await tx`update agent_runtime_state s set adapter_type=a.adapter_type from agents a where s.agent_id=a.id and s.adapter_type<>a.adapter_type`;
   await tx`update issue_recovery_actions r set company_id=i.company_id from issues i where r.source_issue_id=i.id and r.company_id<>i.company_id and r.status in ('active','escalated')`;
  });
  console.log('HISTORICAL_ATTRIBUTION','original run companies preserved; active recovery follows current task company');
 } else if (phase === 'permissions') {
  const access=accessService(db);
  for(const d of roster.filter(d=>!d.manager)){
   const [a]=await sql`select id from agents where company_id=${companies[d.company].id} and name=${d.name}`;
   await access.setPrincipalPermission(companies[d.company].id,'agent',a.id,'tasks:assign',true,admin);
  }
  // Removing stale installations/bindings revokes capability associations, not business records or secrets.
  for(const table of ['tool_connection_installs','tool_profile_bindings']){
   const stale=await sql`select t.id,t.company_id,a.name from ${sql(table)} t join agents a on t.target_type='agent' and t.target_id=a.id::text where t.company_id<>a.company_id`;
   for(const r of stale){await audit(r.company_id,'agent.stale_access_revoked',table,r.id,{agent:r.name,reason:'agent moved to another company'});await sql`delete from ${sql(table)} where id=${r.id}`;}
   console.log('STALE_ACCESS_REVOKED',table,stale.length);
  }
 } else if (phase === 'apply' && fs.existsSync(`${root}/applied.json`)) {
  const previous=JSON.parse(fs.readFileSync(`${root}/applied.json`,'utf8'));
  assert(JSON.stringify(previous.roster)===JSON.stringify(roster)&&JSON.stringify(previous.models)===JSON.stringify(models),'Plan changed; use a new reviewed migration revision');
  console.log('APPLY_NOOP','The same migration revision is already applied; run verify to detect drift.');
 } else if (phase === 'apply') {
  assert(!(await sql`select id from heartbeat_runs where status in ('queued','running')`).length,'Wait for active runs to finish before migrating');
  const before = await sql`select * from agents`;
  if (!fs.existsSync(`${root}/agents-before.json`)) writeOwned(`${root}/agents-before.json`,JSON.stringify(before));
  const byName = new Map(before.map(a=>[a.name,a]));
  for (const desired of roster) {
   if (!byName.has(desired.name)) {
    const input=createAgentSchema.parse({name:desired.name,role:desired.role,title:desired.title,adapterType:'claude_local',adapterConfig:{model:models.claude},runtimeConfig:{heartbeat:{enabled:false,wakeOnDemand:false,maxConcurrentRuns:1}},permissions:{canCreateAgents:false,canCreateSkills:false},status:'paused'});
    const a=await agentService(db).create(companies[desired.company].id,{...input,status:'paused'});
    await accessService(db).ensureMembership(a.companyId,'agent',a.id,'member','active');
    await audit(a.companyId,'agent.created','agent',a.id,{name:a.name,source:'authorized organization reorganization'});
    byName.set(a.name, { ...a, company_id:a.companyId, adapter_config:a.adapterConfig, runtime_config:a.runtimeConfig });
   }
  }
  await sql.begin(async tx=>{
   await tx`select pg_advisory_xact_lock(hashtext('paperclip-three-companies-20261006'))`;
   const scoped = await tx`select table_name,array_agg(column_name) as columns from information_schema.columns where table_schema='public' group by table_name`;
   const movableAgentTables=['agent_api_keys','agent_memberships','agent_runtime_state','agent_task_sessions','agent_wakeup_requests','status_cards'];
   for (const desired of roster) {
    const a=byName.get(desired.name), target=companies[desired.company].id;
    if(a.company_id===target)continue;
    const taskIds=(await tx`select id from issues where assignee_agent_id=${a.id} and company_id=${a.company_id}`).map(x=>x.id);
    if(taskIds.length){
     const linked = await tx`select i.id from issues i where i.id in ${tx(taskIds)} and (i.project_id is not null or i.parent_id is not null or i.goal_id is not null)`;
     assert(!linked.length,'Refuse to split a shared project/parent/goal; review task closure first');
     const docIds=(await tx`select distinct document_id from issue_documents where issue_id in ${tx(taskIds)}`).map(x=>x.document_id);
     if(docIds.length){
      assert(!(await tx`select id from issue_documents where document_id in ${tx(docIds)} and issue_id not in ${tx(taskIds)}`).length,'Refuse to split shared task documents');
      for(const s of scoped.filter(s=>s.columns.includes('company_id')&&s.columns.includes('document_id')))await tx`update ${tx(s.table_name)} set company_id=${target} where document_id in ${tx(docIds)} and company_id=${a.company_id}`;
      await tx`update documents set company_id=${target} where id in ${tx(docIds)}`;
     }
     for(const s of scoped.filter(s=>s.columns.includes('company_id')&&s.columns.includes('issue_id')&&s.table_name!=='cost_events'))await tx`update ${tx(s.table_name)} set company_id=${target} where issue_id in ${tx(taskIds)} and company_id=${a.company_id}`;
     await tx`update issues set company_id=${target},updated_at=now() where id in ${tx(taskIds)}`;
    }
    for(const t of movableAgentTables.filter(t=>scoped.some(s=>s.table_name===t&&s.columns.includes('agent_id')&&s.columns.includes('company_id'))))await tx`update ${tx(t)} set company_id=${target} where agent_id=${a.id} and company_id=${a.company_id}`;
    await tx`update company_memberships set company_id=${target},updated_at=now() where principal_type='agent' and principal_id=${a.id} and company_id=${a.company_id}`;
    // Keep old audit and finance rows in their original company. Old grants no longer authorize access.
    await tx`update principal_permission_grants set company_id=${target},updated_at=now() where principal_type='agent' and principal_id=${a.id} and company_id=${a.company_id} and scope is null`;
    await tx`update agents set company_id=${target},reports_to=null,status='paused',updated_at=now() where id=${a.id}`;
   }
   // Reset provider sessions after a company or role change; preserve history in the backup and run records.
   const configuredIds=roster.map(d=>byName.get(d.name).id);
   await tx`update agent_runtime_state set session_id=null,state_json='{}',last_run_id=null,last_run_status=null,last_error=null,updated_at=now() where agent_id in ${tx(configuredIds)}`;
   await tx`update agent_task_sessions set session_params_json=null,session_display_id=null,last_error=null,goal_json=null,goal_status=null,goal_desired_state=null,updated_at=now() where agent_id in ${tx(configuredIds)}`;
   await tx`update agents set status='paused',pause_reason='roster_consolidation_20261006',paused_at=now(),reports_to=${byName.get('Beatrice').id},permissions='{"canCreateAgents":false,"canCreateSkills":false}',runtime_config=jsonb_set(coalesce(runtime_config,'{}'),'{heartbeat}','{"enabled":false,"wakeOnDemand":false,"maxConcurrentRuns":1}'),updated_at=now() where name in ${tx(retired)} and status<>'terminated'`;
  });
  const marketingPackage=`${root}/growth-instructions`;
  for(const d of roster){
   const a=byName.get(d.name), cid=companies[d.company].id;
   const instrRoot=`/paperclip/instances/default/companies/${cid}/agents/${a.id}/instructions`;
   const cwd=`/paperclip/instances/default/companies/${cid}/agents/${a.id}/workspace`;
   fs.mkdirSync(cwd,{recursive:true,mode:0o700});fs.chownSync(cwd,1000,1000);
   const canonical=d.job ? fs.readFileSync(`${marketingPackage}/paperclip/growth-os-company/agents/${d.job}/AGENTS.md`,'utf8') : '';
   const contract=`# ${d.name} — ${d.title}\n\nCompany: ${companyNames[d.company]} (${cid}).\nReports to: ${d.manager??'Quinn Favo / Board'}.\nYou own ${d.title.toLowerCase()} within this company. Other companies are independent; use explicit board-approved handoffs rather than accessing another company's tasks, credentials, or memory.\n\n${canonical}\n\n## Operating contract\n\n- Read the installed Paperclip skill before handling assignments; record deliverables and final task disposition.\n- Work in your company workspace. Use approved project repositories; verify current code and sources before asserting features.\n- Delegate only within this company. You may not create agents or widen your own permissions.\n- Research, drafts, code changes, tests, and internal repository artifacts are permitted. Publishing, sending messages, changing production, pricing, paid API usage, spending, and destructive actions require Quinn's explicit approval.\n- Classify important conclusions as Fact, Inference, or Hypothesis; cite receipts.\n- deterministic_steps: resolve task/revision, enforce access and data policy, deduplicate, validate artifacts, record measurements.\n- llm_steps: bounded ${d.title.toLowerCase()} judgment and generation on eligible inputs.\n- idempotency_key: company:${cid}:agent:${a.id}:task:<id>:revision:<inputs>.\n- failure_policy: block with the exact missing input/approval; do not fabricate results or switch providers silently.\n- cost_policy: existing subscriptions/free quotas; one active run per agent; no paid fallback without explicit approval.\n- measurement_path: assigned task -> verified artifact -> measured outcome -> durable repository learning.\n${d.company==='marketing'?'\n## Growth OS runtime\n\n- Canonical source: https://github.com/Quazmoz/growth-os. Local instructions-only snapshot: '+marketingPackage+'.\n- Read the relevant engine README and canonical job spec before work. Full evidence is not installed in this snapshot.\n- Paperclip coordinates; n8n performs deterministic collection and approved external execution; Growth OS stores evidence, experiments, and learning.\n- Hosted runtime policy: public evidence only by default; GROWTH_OS_ALLOW_INTERNAL_HOSTED=false. Confidential evidence and hosted_model_allowed:false are hard denies. Enforce eligibility deterministically before any model invocation; do not read unfiltered records into your model context.\n- Internal ledger and internal evidence require BOTH explicit record allowance and an approved runtime opt-in. Missing evidence means block/no-op, never invented signals.\n- Write reusable outputs to the canonical Growth OS path and attach/link the artifact in Paperclip.\n':''}`;
   writeOwned(`${instrRoot}/AGENTS.md`,contract);
   const adapter=d.tier==='claude'?'claude_local':d.tier==='codex'?'codex_local':'opencode_local';
   const config={model:models[d.tier],cwd,timeoutSec:1800,graceSec:20,maxTurnsPerRun:40,instructionsFilePath:`${instrRoot}/AGENTS.md`,instructionsRootPath:instrRoot,instructionsEntryFile:'AGENTS.md',instructionsBundleMode:'managed',env:{}};
   if(d.tier==='claude')Object.assign(config,{engine:'acp',effort:'high',permissionMode:'approve-paperclip',nonInteractivePermissions:'deny',dangerouslySkipPermissions:false,env:{ANTHROPIC_API_KEY:''}});
   if(d.tier==='codex')Object.assign(config,{engine:'acp',modelReasoningEffort:'medium',permissionMode:'approve-paperclip',nonInteractivePermissions:'deny',dangerouslyBypassApprovalsAndSandbox:false,env:{OPENAI_API_KEY:''}});
   if(['ollama','cloudflare'].includes(d.tier))config.permissionMode='ask';
   if(d.company==='marketing')config.env.GROWTH_OS_ALLOW_INTERNAL_HOSTED='false';
   const runtime={heartbeat:{enabled:false,wakeOnDemand:true,maxConcurrentRuns:1,cooldownSec:30,skipTimerWhenNoActionableWork:true}};
   if(d.tier==='claude'||d.tier==='codex')runtime.aiConnection={mode:'responsible_user',provider:d.tier==='claude'?'anthropic':'openai',method:'subscription'};
   await sql`update agents set role=${d.role},title=${d.title},reports_to=${d.manager?byName.get(d.manager).id:null},adapter_type=${adapter},adapter_config=${sql.json(config)},runtime_config=${sql.json(runtime)},permissions='{"canCreateAgents":false,"canCreateSkills":false}',status='idle',pause_reason=null,paused_at=null,updated_at=now() where id=${a.id}`;
   await audit(cid,'agent.reorganized','agent',a.id,{name:d.name,previousCompanyId:a.company_id,companyId:cid,tier:d.tier,model:models[d.tier],manager:d.manager});
  }
  // Kubernetes exec is root; normal Paperclip execution uses node (1000).
  for(const c of Object.values(companies)){
   fs.chownSync(`/paperclip/instances/default/companies/${c.id}`,1000,1000);
   execFileSync('chown',['-R','1000:1000',`/paperclip/instances/default/companies/${c.id}/agents`]);
  }
  fs.chownSync(root,1000,1000);
  await sql`update companies set require_board_approval_for_new_agents=true,default_responsible_user_id=${admin},updated_at=now() where id in ${sql(Object.values(companies).map(x=>x.id))}`;
  const projects={};
  for(const [key,name,repo] of [['consulting','AI Consulting Delivery','consultant'],['android','Android Portfolio Development','android-portfolio'],['marketing','Growth OS Operating Loop','growth-os']]){
   let [project]=await sql`select * from projects where company_id=${companies[key].id} and name=${name}`;
   if(!project){project=await projectService(db).create(companies[key].id,{name,description:`Canonical repository: Quazmoz/${repo}. Scope: ${companyNames[key]}.`,status:'in_progress',leadAgentId:byName.get(roster.find(d=>d.company===key&&!d.manager).name).id});await audit(companies[key].id,'project.created','project',project.id,{name});}
   projects[key]=project;
   if(!(await sql`select id from project_workspaces where project_id=${project.id}`).length)await projectService(db).createWorkspace(project.id,{name:`Quazmoz/${repo}`,repoUrl:`https://github.com/Quazmoz/${repo}.git`,sourceType:'git_repo',isPrimary:true});
  }
  const actor={actorType:'user',actorId:admin,userId:admin,agentId:null};
  const routines=routineService(db);
  for(const [title,assignee,description] of [['Monday Market Intelligence','Iris','Follow 07-agents/jobs/market-intelligence.md; require new committed eligible evidence, otherwise no-op. Write 01-customer-truth/weekly/YYYY-Www-market-brief.md.'],['Weekly Growth Review','Growth OS Director','Follow 07-agents/jobs/growth-director.md; write 06-growth-cockpit/reviews/YYYY-Www-growth-review.md. Friday time remains unset until selected.']]){
   if(!(await sql`select id from routines where company_id=${companies.marketing.id} and title=${title}`).length){
    const r=await routines.create(companies.marketing.id,createRoutineSchema.parse({title,description,projectId:projects.marketing.id,assigneeAgentId:byName.get(assignee).id,status:'paused',concurrencyPolicy:'coalesce_if_active',catchUpPolicy:'skip_missed'}),actor);
    if(title.startsWith('Monday'))await routines.createTrigger(r.id,createRoutineTriggerSchema.parse({kind:'schedule',cronExpression:'30 7 * * 1',timezone:'UTC',enabled:false}),actor);
   }
  }
  writeOwned(`${root}/applied.json`,JSON.stringify({appliedAt:new Date().toISOString(),companies:Object.fromEntries(Object.entries(companies).map(([k,c])=>[k,c.id])),roster,retired,models},null,2));
  console.log('APPLIED',JSON.stringify({active:roster.length,paused:retired.length,models}));
 } else if(phase==='verify') {
  const currentModels=fs.existsSync(`${modelUpdateRoot}/applied.json`)?{...models,claude:modelUpdateTargets.claude_local,codex:modelUpdateTargets.codex_local}:models;
  const all=await sql`select id,company_id,name,status,reports_to,adapter_type,adapter_config,runtime_config from agents`;
  for(const d of roster){const a=all.find(a=>a.name===d.name);assert(a,`Missing ${d.name}`);assert(a.company_id===companies[d.company].id,`Wrong company ${d.name}`);assert(a.adapter_config.model===currentModels[d.tier],`Wrong model ${d.name}`);assert(a.runtime_config.heartbeat.maxConcurrentRuns===1,`Unbounded concurrency ${d.name}`);assert(fs.existsSync(a.adapter_config.instructionsFilePath),`Missing instructions ${d.name}`);execFileSync('gosu',['node','test','-r',a.adapter_config.instructionsFilePath]);}
  assert(!(await sql`select a.id from agents a join agents m on m.id=a.reports_to where a.company_id<>m.company_id`).length,'Cross-company manager');
  assert(!(await sql`select i.id from issues i join agents a on a.id=i.assignee_agent_id where i.company_id<>a.company_id`).length,'Cross-company assignee');
  assert(!(await sql`select c.id from run_identity_contexts c join heartbeat_runs r on r.id=c.run_id where c.company_id<>r.company_id`).length,'Historical run identity attribution mismatch');
  assert(!(await sql`select a.id from agents a left join company_memberships m on m.principal_id=a.id::text and m.principal_type='agent' and m.company_id=a.company_id and m.status='active' where a.status='idle' and m.id is null`).length,'Missing active agent membership');
  assert(!(await sql`select id from routines where company_id=${companies.marketing.id} and status<>'paused'`).length,'Marketing routine activated prematurely');
  console.log('VERIFIED',JSON.stringify(await sql`select c.name,a.status,count(*) from companies c join agents a on a.company_id=c.id group by c.name,a.status order by c.name,a.status`));
  console.log('ROSTER',JSON.stringify(all.map(a=>({name:a.name,company:Object.entries(companies).find(([,c])=>c.id===a.company_id)?.[0],status:a.status,adapter:a.adapter_type,model:a.adapter_config.model}))));
 } else throw new Error('Choose prepare, apply, history, permissions, goals, handoffs, claude-login, claude-auth-health, claude-reconnect-check, claude-reconnect, connections, growth-workspace, models, qualify, finish-auth, or verify');
} finally { await sql.end(); await closeRegisteredClients(url); }
