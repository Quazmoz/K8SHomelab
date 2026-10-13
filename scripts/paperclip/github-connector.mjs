// Run as node in the pinned Paperclip image with its tsx loader.
// deterministic_steps: inspect native state, verify recovery, prepare native OAuth,
// qualify agent policies and reads. llm_steps: none.
// idempotency_key: github-connector-2026-10-13:<company>:<native-connection-id>.
// failure_policy: retain checkpoint/checkout, fail closed; never use anonymous GitHub.
// cost_policy: no model calls, no new services, no metered fallback.
// measurement_path: /paperclip/github-connector-2026-10-13/*.json.
import fs from 'node:fs';
import {createHash, randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';

const root='/paperclip/github-connector-2026-10-13';
const companyNames=['Quinn Favo AI Consulting','Quazmoz Android Development','Quazmoz Growth OS'];
const git=(cwd,args)=>execFileSync('git',['-C',cwd,...args],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const phase=process.argv.at(-1);
const write=(name,value)=>{
 const temporary=`${root}/${name}.${randomUUID()}.tmp`;
 fs.writeFileSync(temporary,JSON.stringify(value,null,2),{mode:0o600});
 fs.renameSync(temporary,`${root}/${name}`);
};
class OperatorError extends Error {}
const check=(value,message)=>{if(!value)throw new OperatorError(message);};

// Qualification must never interpret a connected badge or a denied call as a read.
function successfulRead(result,expectedAgentId,invocation,events){
 return result?.decision==='allowed' && !result.error && !result.result?.isError && invocation?.status==='succeeded'
  && invocation.agentId===expectedAgentId && events.some(e=>e.eventType==='call_completed'&&e.outcome==='success'&&e.invocationId===invocation.id);
}
if(phase==='self-test'){
 const invocation={id:'i',agentId:'a',status:'succeeded'};
 const events=[{eventType:'call_completed',outcome:'success',invocationId:'i'}];
 assert(successfulRead({decision:'allowed'},'a',invocation,events));
 for(const input of [
  [{decision:'off'},'a',invocation,events],
  [{decision:'allowed',error:{}},'a',invocation,events],
  [{decision:'allowed',result:{isError:true}},'a',invocation,events],
  [{decision:'allowed'},'b',invocation,events],
  [{decision:'allowed'},'a',{...invocation,status:'failed'},events],
  [{decision:'allowed'},'a',invocation,[]],
 ])assert(!successfulRead(...input));
 console.log('GITHUB_CONNECTOR_SELF_TEST_PASSED');
}else{
 process.umask(0o077);
 check(process.getuid()===1000,'Run as the Paperclip runtime user with gosu node');
 const {createDb,closeRegisteredClients}=await import('/app/packages/db/src/client.ts');
 const t=await import('/app/packages/db/src/index.ts');
 const {eq,and,inArray}=await import('/app/server/node_modules/drizzle-orm/index.js');
 const {default:postgres}=await import('/app/packages/db/node_modules/postgres/src/index.js');
 const bootstrap=fs.readFileSync('/app/server/src/index.ts','utf8');
 const auth=bootstrap.match(/const embeddedConnectionString = `postgres:\/\/([^@]+)@127\.0\.0\.1:\$\{port\}\/paperclip`/);
 const port=fs.readFileSync('/paperclip/instances/default/db/postmaster.pid','utf8').split('\n')[3];
 check(auth&&/^\d+$/.test(port),'Runtime database bootstrap changed; review the installed contract');
 const url=process.env.DATABASE_URL??`postgres://${auth[1]}@127.0.0.1:${port}/paperclip`;
 const db=createDb(url,{maxConnections:1});
 const sql=postgres(url,{max:1,onnotice:()=>{}});
 try{
  const [{locked}]=await sql`select pg_try_advisory_lock(1310132026) as locked`;
  check(locked,'Another GitHub connector operator is running; retry after it finishes');
  fs.mkdirSync(root,{recursive:true,mode:0o700});
  const companies=(await db.select().from(t.companies)).filter(c=>companyNames.includes(c.name));
  check(companies.length===3,'Expected the existing three companies');
  const [{userId:owner}]=await db.select({userId:t.instanceUserRoles.userId}).from(t.instanceUserRoles).where(eq(t.instanceUserRoles.role,'instance_admin'));
  check(owner,'Expected an existing instance administrator; no new admin credential is created');
  const actor={actorType:'user',actorId:owner};
  const {toolAccessService}=await import('/app/server/src/services/tool-access.ts');
  const svc=toolAccessService(db);
  async function quiet(){
   check(!(await db.select({id:t.heartbeatRuns.id}).from(t.heartbeatRuns).where(inArray(t.heartbeatRuns.status,['queued','running','scheduled_retry']))).length,'Wait for active or retrying agents before changing connector/workspace state');
   check((await db.select().from(t.routines)).every(r=>r.status==='paused'),'Keep routines paused for this repair');
  }
  async function protectedState(client){
   const tables=['companies','agents','issues','projects','routines','project_workspaces','execution_workspaces'];
   const counts={}, fingerprints={};
   for(const table of tables){
    const rows=[...await client.unsafe(`select * from ${table} order by id`)];
    counts[table]=rows.length;fingerprints[table]=hash(rows);
   }
   return {counts,fingerprints};
  }
  async function githubRows(companyId){
   return (await db.select().from(t.toolConnections).where(eq(t.toolConnections.companyId,companyId)))
    .filter(c=>c.config.sourceTemplateKey==='github'&&c.status!=='archived');
  }
  if(phase==='inspect'){
   const {paperclipCloudConnectorEnrollmentStatus}=await import('/app/server/src/services/paperclip-cloud-connector-enrollment.ts');
   const {reconcilePaperclipCloudConnectorEnrollmentStatus}=await import('/app/server/src/services/paperclip-cloud-connector-status.ts');
   const {createToolGatewayService}=await import('/app/server/src/services/tool-gateway.ts');
   const gateway=createToolGatewayService(db,{deploymentMode:'authenticated',deploymentExposure:'private'});
   const output={checkedAt:new Date().toISOString(),cloud:await reconcilePaperclipCloudConnectorEnrollmentStatus(),localCloud:paperclipCloudConnectorEnrollmentStatus(),companies:[]};
   // The available-method setup service verifies Cloud's advertised profile itself.
   for(const company of companies){
    const connections=await githubRows(company.id);
    const agents=await db.select().from(t.agents).where(and(eq(t.agents.companyId,company.id),eq(t.agents.status,'idle')));
    const summaries=[];
    for(const c of connections){
     const grants=await db.select().from(t.connectionGrants).where(eq(t.connectionGrants.connectionId,c.id));
     summaries.push({id:c.id,status:c.status,enabled:c.enabled,health:c.healthStatus,method:c.config.connectionMethodKey,
      grants:grants.map(g=>({id:g.id,kind:g.kind,status:g.status,login:g.providerTenant?.github?.login,repositoryCount:g.providerTenant?.github?.repositoryCount,repositorySelection:g.providerTenant?.github?.repositorySelection})),
      agents:await Promise.all(agents.map(async a=>{
       const s=await gateway.summarizeConnectionAccessForAgent({companyId:company.id,connectionId:c.id,agentId:a.id});
       return {name:a.name,adapter:a.adapterType,allowed:s.allowedCount,askFirst:s.askFirstCount,off:s.offCount};
      }))});
    }
    output.companies.push({name:company.name,connections:summaries});
   }
   write('inspection.json',output);console.log('GITHUB_INSPECTED',JSON.stringify(output));
  }else if(phase==='preserve'){
   await quiet();
   const marker=`${root}/recovery.json`;
   if(fs.existsSync(marker)){
    const receipt=JSON.parse(fs.readFileSync(marker,'utf8'));
    for(const [file,digest] of Object.entries(receipt.sha256))check(createHash('sha256').update(fs.readFileSync(file)).digest('hex')===digest,'Recovery archive checksum changed');
    const current=await protectedState(sql);
    for(const table of ['companies','agents','issues','routines'])check(current.fingerprints[table]===receipt.protectedState.fingerprints[table],'Protected business state changed; capture a new reviewed recovery revision');
    console.log('GITHUB_RECOVERY_NOOP');
   }else{
    const before=await protectedState(sql);
    const {runDatabaseBackup,runDatabaseRestore}=await import('/app/packages/db/src/backup-lib.ts');
    const backup=await runDatabaseBackup({connectionString:url,backupDir:root,filenamePrefix:'before-github',retention:{dailyDays:365,weeklyWeeks:52,monthlyMonths:12}});
    fs.chmodSync(backup.backupFile,0o600);
    const temporary=`paperclip_github_restore_${randomUUID().replaceAll('-','')}`;
    const restoredUrl=new URL(url);restoredUrl.pathname=`/${temporary}`;
    let restored,created=false;
    try{
     await sql.unsafe(`create database ${temporary}`);created=true;
     await runDatabaseRestore({connectionString:restoredUrl.toString(),backupFile:backup.backupFile});
     restored=postgres(restoredUrl.toString(),{max:1,onnotice:()=>{}});
     check(hash(await protectedState(restored))===hash(before),'Restored database does not match the protected source state');
    }finally{await restored?.end();if(created)await sql.unsafe(`drop database ${temporary}`);}
    const growth=companies.find(c=>c.name==='Quazmoz Growth OS');
    const [workspace]=await db.select().from(t.projectWorkspaces).where(eq(t.projectWorkspaces.companyId,growth.id));
    check(workspace?.metadata?.instructionsOnly===true&&workspace.cwd,'Expected the existing instructions snapshot; preserve it before migration');
    const commit=git(workspace.cwd,['rev-parse','a64ddb6^{commit}']);
    const bundle=`${root}/growth-sprint.bundle`;
    git(workspace.cwd,['bundle','create',bundle,'--all']);git(workspace.cwd,['bundle','verify',bundle]);
    const mirror=`${root}/growth-sprint-mirror.git`;
    execFileSync('git',['clone','--mirror',bundle,mirror],{stdio:'pipe'});
    check(git(mirror,['rev-parse','a64ddb6^{commit}'])===commit,'Local sprint commit is missing from recovery bundle');
    git(mirror,['fsck','--full']);
    const archive=`${root}/persistent-files.tar.gz`;
    execFileSync('tar',['-czf',archive,'--exclude=instances/default/db','--exclude=instances/default/logs','--exclude=instances/default/data/backups','--exclude=instances/default/backups','--exclude=instances/default/tmp','--exclude=instances/default/runtime/managed-ai-homes','-C','/paperclip','instances/default'],{stdio:'pipe'});
    execFileSync('tar',['-tzf',archive],{stdio:'pipe'});
    await quiet();check(hash(await protectedState(sql))===hash(before),'Protected state changed during backup');
    const sha256={};for(const file of [backup.backupFile,bundle,archive]){fs.chmodSync(file,0o600);sha256[file]=createHash('sha256').update(fs.readFileSync(file)).digest('hex');}
    const receipt={createdAt:new Date().toISOString(),protectedState:before,sha256,restoreVerified:true,sameVolumeOnly:true,
     workspaceId:workspace.id,originalCwd:workspace.cwd,sprintCommit:commit,refs:git(workspace.cwd,['show-ref']),worktrees:git(workspace.cwd,['worktree','list','--porcelain']),status:git(workspace.cwd,['status','--porcelain']),mirror};
    write('recovery.json',receipt);console.log('GITHUB_RECOVERY_VERIFIED',JSON.stringify({restoreVerified:true,sprintCommit:commit,counts:before.counts,sameVolumeOnly:true}));
   }
  }else if(phase==='prepare'){
   await quiet();
   check(fs.existsSync(`${root}/recovery.json`),'Run preserve before preparing connections');
   const recovery=JSON.parse(fs.readFileSync(`${root}/recovery.json`,'utf8'));
   const before=await protectedState(sql);
   for(const table of ['companies','agents','issues','routines'])check(before.fingerprints[table]===recovery.protectedState.fingerprints[table],'Business state changed after the recovery point');
   const {connectToolAppSchema}=await import('/app/packages/shared/src/index.ts');
   const output=[];
   for(const company of companies){
    let rows=await githubRows(company.id);check(rows.length<=1,'Multiple GitHub connections found; review instead of duplicating');
    let connection=rows[0];
    if(!connection){
     const prepared=await svc.connectGalleryApp(company.id,connectToolAppSchema.parse({galleryKey:'github',connectionMethodKey:'managed',name:'GitHub',grantKind:'user'}),actor);
     connection=prepared.connection;
    }
    output.push({company:company.name,companyId:company.id,connectionId:connection.id,status:connection.status,enabled:connection.enabled,authorizationRequired:connection.status==='draft'});
   }
   check(hash(await protectedState(sql))===hash(before),'Preparing GitHub changed unrelated business configuration');
   write('prepared.json',{preparedAt:new Date().toISOString(),repoScope:'All GitHub repositories, explicitly authorized by Quinn on 2026-10-13',connections:output});
   console.log('GITHUB_PREPARED',JSON.stringify(output));
  }else if(phase==='reconcile'){
   await quiet();check(fs.existsSync(`${root}/recovery.json`),'Run preserve first');
   const output=[];
   for(const company of companies){
    const rows=await githubRows(company.id);
    if(rows.length<=1)continue;
    const active=rows.filter(c=>c.status==='active'&&c.enabled);
    check(active.length===1,'Multiple live GitHub connections require review; never merge credential identities');
    for(const draft of rows.filter(c=>c.id!==active[0].id)){
     const grants=await db.select().from(t.connectionGrants).where(eq(t.connectionGrants.connectionId,draft.id));
     const invocations=await db.select({id:t.toolInvocations.id}).from(t.toolInvocations).where(eq(t.toolInvocations.connectionId,draft.id));
     check(draft.status==='draft'&&!draft.enabled&&grants.length===0&&draft.credentialRefs.length===0&&draft.credentialSecretRefs.length===0&&invocations.length===0,
      'Duplicate connection has credential or execution history; review it instead of retiring it');
     await svc.archiveConnection(draft.id,company.id,actor);
     output.push({company:company.name,archivedUnusedDraft:draft.id,retainedAuthorizedConnection:active[0].id,credentialsRemoved:false,historyDeleted:false});
    }
   }
   if(output.length)write('duplicates.json',{checkedAt:new Date().toISOString(),changes:output});
   console.log('GITHUB_DUPLICATES_RECONCILED',JSON.stringify(output));
  }else if(phase==='permissions'){
   await quiet();check(fs.existsSync(`${root}/recovery.json`),'Run preserve before changing access');
   const {createToolGatewayService}=await import('/app/server/src/services/tool-gateway.ts');
   const {finishToolAppSchema}=await import('/app/packages/shared/src/index.ts');
   const gateway=createToolGatewayService(db,{deploymentMode:'authenticated',deploymentExposure:'private'});
   const output=[];
   for(const company of companies){
    const rows=await githubRows(company.id);check(rows.length===1,'Expected one prepared native GitHub connection');
    const connection=rows[0];
    const grants=await db.select().from(t.connectionGrants).where(eq(t.connectionGrants.connectionId,connection.id));
    if(!grants.some(g=>g.kind==='user'&&g.subjectUserId===owner&&g.status==='active'&&g.providerTenant?.github)){
     output.push({company:company.name,status:'owner_authorization_required'});continue;
    }
    const agents=await db.select().from(t.agents).where(and(eq(t.agents.companyId,company.id),eq(t.agents.status,'idle')));
    const catalog=await db.select().from(t.toolCatalogEntries).where(eq(t.toolCatalogEntries.connectionId,connection.id));
    check(catalog.length>0,'Refresh GitHub actions before applying permissions');
    const reads=catalog.filter(c=>c.status==='active'&&c.riskLevel==='read'&&c.isReadOnly&&!c.isWrite&&!c.isDestructive);
    const offActions=new Set(['merge_pull_request','create_repository','fork_repository','request_copilot_review']);
    const writes=catalog.filter(c=>c.status==='active'&&c.riskLevel==='write'&&c.isWrite&&!c.isDestructive&&!offActions.has(c.toolName));
    const desired=finishToolAppSchema.parse({enabledCatalogEntryIds:reads.map(c=>c.id),askFirstCatalogEntryIds:writes.map(c=>c.id),access:{agentIds:agents.map(a=>a.id)}});
    const installs=await db.select().from(t.toolConnectionInstalls).where(eq(t.toolConnectionInstalls.connectionId,connection.id));
    const summaries=await Promise.all(agents.map(a=>gateway.summarizeConnectionAccessForAgent({companyId:company.id,connectionId:connection.id,agentId:a.id})));
    const policyMatches=summaries.every(s=>s.tools.every(action=>{
     const c=catalog.find(c=>c.toolName===action.toolName);
     return action.decision===(reads.some(r=>r.id===c?.id)?'allowed':writes.some(w=>w.id===c?.id)?'ask_first':'off');
    }));
    const installsMatch=installs.length===agents.length&&installs.every(i=>i.targetType==='agent'&&agents.some(a=>a.id===i.targetId));
    const changed=!policyMatches||!installsMatch;
    if(changed)await db.transaction(async tx=>{
     const native=toolAccessService(tx);
     if(!policyMatches)await native.finishGalleryAppConnection(company.id,connection.id,desired,actor);
     // Managed GitHub is not in the generic remote-MCP install-sync branch.
     if(!installsMatch)await native.putConnectionInstalls(connection.id,{installs:agents.map(a=>({targetType:'agent',targetId:a.id}))},actor);
    });
    const after=await Promise.all(agents.map(async a=>{
     const s=await gateway.summarizeConnectionAccessForAgent({companyId:company.id,connectionId:connection.id,agentId:a.id});
     check(s.allowedCount===reads.length&&s.askFirstCount===writes.length,'Effective permissions differ from the reviewed action classification');
     check(s.tools.every(action=>action.risk!=='destructive'||action.decision==='off'),'Destructive action is still eligible');
     return {name:a.name,adapter:a.adapterType,reads:s.allowedCount,askFirst:s.askFirstCount,off:s.offCount};
    }));
    output.push({company:company.name,connectionId:connection.id,changed,agents:after});
   }
   write('permissions.json',{checkedAt:new Date().toISOString(),connections:output});console.log('GITHUB_PERMISSIONS',JSON.stringify(output));
  }else if(phase==='reads'||phase==='cross-reads'){
   check(fs.existsSync(`${root}/recovery.json`),'Run preserve first');
   const {createToolGatewayService}=await import('/app/server/src/services/tool-gateway.ts');
   const gateway=createToolGatewayService(db,{deploymentMode:'authenticated',deploymentExposure:'private'});
   const previous=fs.existsSync(`${root}/reads.json`)?JSON.parse(fs.readFileSync(`${root}/reads.json`,'utf8')):[];
   const output=[...previous];
   for(const company of companies){
    const [connection]=await githubRows(company.id);
    const grants=await db.select().from(t.connectionGrants).where(eq(t.connectionGrants.connectionId,connection.id));
    if(!grants.some(g=>g.kind==='user'&&g.subjectUserId===owner&&g.status==='active'&&g.providerTenant?.github))continue;
    const agents=await db.select().from(t.agents).where(and(eq(t.agents.companyId,company.id),eq(t.agents.status,'idle')));
    // Native Test-tab calls exercise real agent policy/credential attribution without inference.
    const representatives=agents.filter(a=>a.role==='ceo');
    for(const adapter of ['codex_local','opencode_local']){
     const representative=agents.find(a=>a.adapterType===adapter);
     if(representative&&!representatives.some(a=>a.id===representative.id))representatives.push(representative);
    }
    const selected=phase==='cross-reads'?agents.filter(a=>a.role==='ceo'):company.name==='Quazmoz Growth OS'?agents:representatives;
    const primary=company.name==='Quazmoz Growth OS'?'growth-os':company.name==='Quazmoz Android Development'?'android-portfolio':'consultant';
    const repositories=phase==='cross-reads'?['growth-os','android-portfolio','consultant']:[primary];
    const catalog=await db.select().from(t.toolCatalogEntries).where(eq(t.toolCatalogEntries.connectionId,connection.id));
    const action=catalog.find(c=>c.toolName==='get_file_contents');
    check(action?.isReadOnly&&!action.isWrite&&!action.isDestructive,'Native get_file_contents read action is missing');
    for(const repository of repositories){
    const paths=phase==='reads'&&repository==='growth-os'?['README.md','07-agents/jobs/growth-director.md','schemas/experiment.schema.json']:['README.md'];
    for(const agent of selected)for(const path of paths){
     const key=`${company.id}:${agent.id}:${connection.id}:${repository}:${path}`;
     const retained=previous.find(r=>r.key===key&&r.success);
     if(retained){
      const [invocation]=await db.select().from(t.toolInvocations).where(eq(t.toolInvocations.id,retained.invocationId));
      check(invocation?.status==='succeeded','Previous successful read receipt is no longer valid');continue;
     }
     const result=await gateway.executeTestCall({companyId:company.id,connectionId:connection.id,agentId:agent.id,userId:owner,
      toolName:action.toolName,parameters:{owner:'Quazmoz',repo:repository,path},timeoutMs:45000});
     const [invocation]=await db.select().from(t.toolInvocations).where(eq(t.toolInvocations.id,result.invocationId));
     const events=await db.select().from(t.toolCallEvents).where(eq(t.toolCallEvents.invocationId,result.invocationId));
     const success=successfulRead(result,agent.id,invocation,events);
     // Keep private content in memory only; durable proof uses result hash and native IDs.
     const receipt={key,company:company.name,agent:agent.name,adapter:agent.adapterType,repository:`Quazmoz/${repository}`,path,success,
      invocationId:result.invocationId,connectionId:connection.id,resultHash:invocation?.resultHash,eventIds:events.map(e=>e.id),reasonCode:result.error?.reasonCode??null};
     output.push(receipt);write('reads.json',output);console.log('GITHUB_AGENT_READ',JSON.stringify(receipt));
     check(success,'Native agent read failed; inspect the connector activity instead of using a public fallback');
    }
    }
   }
  }else if(phase==='verify'){
   await quiet();
   const recovery=JSON.parse(fs.readFileSync(`${root}/recovery.json`,'utf8'));
   const current=await protectedState(sql);
   for(const table of ['companies','agents','issues','routines'])check(current.fingerprints[table]===recovery.protectedState.fingerprints[table],`Unrelated ${table} state changed`);
   const {aiConnectionService}=await import('/app/server/src/services/ai-connections.ts');
   const ai=aiConnectionService(db);
   const output=[];
   for(const company of companies){
    const rows=await githubRows(company.id);check(rows.length===1,'Expected one active managed GitHub identity per company');
    const connection=rows[0];
    const health=await svc.checkHealth(connection.id,actor);
    check(health.connection.healthStatus==='ok','Native GitHub credential health did not pass');
    const repos=await svc.listGitHubRepositories(company.id,owner);
    check(repos.failedConnectionCount===0&&['Quazmoz/growth-os','Quazmoz/android-portfolio','Quazmoz/consultant'].every(name=>repos.repositories.some(r=>r.fullName===name&&r.private)),'Native repository inventory does not include all three authorized private repositories');
    const repository=company.name==='Quazmoz Growth OS'?'growth-os':company.name==='Quazmoz Android Development'?'android-portfolio':'consultant';
    const headers=await svc.githubReadHeaders(company.id,connection.id,owner);
    const githubMetadata=async endpoint=>{
     const response=await fetch(`https://api.github.com/repos/Quazmoz/${repository}${endpoint}`,{headers:{...headers,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'},signal:AbortSignal.timeout(15000)});
     check(response.ok,'Authenticated GitHub repository metadata check failed');return response.json();
    };
    const repositoryMetadata=await githubMetadata('');
    const branchMetadata=await githubMetadata(`/branches/${encodeURIComponent(repositoryMetadata.default_branch)}`);
    const agents=await db.select().from(t.agents).where(and(eq(t.agents.companyId,company.id),eq(t.agents.status,'idle')));
    let subscriptionAgents=0;
    for(const agent of agents.filter(a=>['claude_local','codex_local'].includes(a.adapterType))){
     const selected=await ai.select({companyId:company.id,agentId:agent.id,userId:owner,adapterType:agent.adapterType,model:agent.adapterConfig.model,binding:agent.runtimeConfig.aiConnection});
     check(selected.attribution.method==='subscription','A metered AI account replaced an approved subscription');subscriptionAgents++;
    }
    output.push({company:company.name,connectionId:connection.id,health:health.connection.healthStatus,authorizedRepositories:repos.repositories.length,subscriptionAgents,
     primaryRepository:`Quazmoz/${repository}`,defaultBranch:repositoryMetadata.default_branch,defaultBranchProtected:branchMetadata.protected===true});
   }
   const reads=JSON.parse(fs.readFileSync(`${root}/reads.json`,'utf8'));
   const workspace=JSON.parse(fs.readFileSync(`${root}/workspace.json`,'utf8'));
   check(git(workspace.cwd,['remote','get-url','origin'])===workspace.repoUrl&&git(workspace.cwd,['rev-parse','HEAD'])===workspace.commit&&git(workspace.cwd,['status','--porcelain'])==='','Qualified canonical checkout changed');
   check(git(recovery.originalCwd,['rev-parse','a64ddb6^{commit}'])===recovery.sprintCommit,'Original sprint commit is missing');
   const receipt={checkedAt:new Date().toISOString(),companies:output,protectedBusinessStateUnchanged:true,counts:current.counts,
    successfulNativeReads:new Set(reads.filter(r=>r.success).map(r=>r.key)).size,failedAttempts:reads.filter(r=>!r.success).map(r=>({invocationId:r.invocationId,reasonCode:r.reasonCode})),
    canonicalCheckoutClean:true,sprintCommitPreserved:recovery.sprintCommit,providerInferenceStarted:false,routinesPaused:true};
   write('verified.json',receipt);console.log('GITHUB_VERIFIED',JSON.stringify(receipt));
  }else if(phase==='boundaries'){
   const {createToolGatewayService}=await import('/app/server/src/services/tool-gateway.ts');
   const gateway=createToolGatewayService(db,{deploymentMode:'authenticated',deploymentExposure:'private'});
   const output=[];
   const agents=await db.select().from(t.agents).where(eq(t.agents.status,'idle'));
   for(const company of companies){
    const [connection]=await githubRows(company.id);
    const ownAgent=agents.find(a=>a.companyId===company.id&&a.role==='ceo');
    for(const other of companies.filter(c=>c.id!==company.id)){
     const foreignAgent=agents.find(a=>a.companyId===other.id&&a.role==='ceo');
     let rejected=false;
     try{await gateway.summarizeConnectionAccessForAgent({companyId:company.id,connectionId:connection.id,agentId:foreignAgent.id});}
     catch(error){rejected=error.reasonCode==='agent_not_found'&&error.status===404;}
     check(rejected,'Foreign-company agent identity was not rejected before provider dispatch');
     const [foreignConnection]=await githubRows(other.id);
     const summary=await gateway.summarizeConnectionAccessForAgent({companyId:company.id,connectionId:foreignConnection.id,agentId:ownAgent.id});
     check(summary.toolCount===0,'Foreign-company connection exposed actions');
     output.push({company:company.name,foreignCompany:other.name,foreignAgentRejected:true,paperclipReasonCode:'agent_not_found',foreignConnectionTools:summary.toolCount,providerDispatched:false});
    }
   }
   write('boundaries.json',{checkedAt:new Date().toISOString(),repositoryIsolation:'All repositories authorized across all companies by Quinn; company identity boundaries remain enforced',checks:output});
   console.log('GITHUB_COMPANY_BOUNDARIES',JSON.stringify(output));
  }else if(phase==='workspace'){
   await quiet();check(fs.existsSync(`${root}/recovery.json`),'Run preserve first');
   const growth=companies.find(c=>c.name==='Quazmoz Growth OS');
   const [workspace]=await db.select().from(t.projectWorkspaces).where(eq(t.projectWorkspaces.companyId,growth.id));
   check(workspace,'Growth OS project workspace is missing');
   const agent=(await db.select().from(t.agents).where(eq(t.agents.companyId,growth.id))).find(a=>a.name==='Growth OS Director');
   const readReceipts=fs.existsSync(`${root}/reads.json`)?JSON.parse(fs.readFileSync(`${root}/reads.json`,'utf8')):[];
   check(['README.md','07-agents/jobs/growth-director.md','schemas/experiment.schema.json'].every(path=>readReceipts.some(r=>r.company===growth.name&&r.agent===agent?.name&&r.path===path&&r.success)),
    'Qualify the Growth OS Director native connector reads before changing the snapshot');
   const {createGitRemoteAuthProvider}=await import('/app/server/src/services/git-credentials.ts');
   // This is Paperclip's supported managed credential invocation, scoped to this operation.
   // No company token, container environment, gh login, or credential bridge is added.
   const repoUrl='https://github.com/Quazmoz/growth-os.git';
   const resolveGitAuth=createGitRemoteAuthProvider(db,growth.id,{agentId:agent.id,responsibleUserId:owner}, {env:{},secretNames:[]});
   const auth=await resolveGitAuth(repoUrl);check(auth?.source==='managed_connection','Managed Growth OS Git identity is unavailable; reconnect instead of using ambient credentials');
   const authenticatedGit=args=>execFileSync('git',[...auth.configArgs,...args],{encoding:'utf8',env:{...process.env,...auth.env},timeout:120000,stdio:['ignore','pipe','pipe']}).trim();
   const remote=authenticatedGit(['ls-remote','--symref',repoUrl,'HEAD']);
   const defaultBranch=/^ref: refs\/heads\/([^\s]+)\s+HEAD$/m.exec(remote)?.[1];
   const remoteCommit=/^([a-f0-9]{40})\s+HEAD$/m.exec(remote)?.[1];
   check(defaultBranch&&remoteCommit,'Could not resolve the authenticated canonical default branch');
   const recovery=JSON.parse(fs.readFileSync(`${root}/recovery.json`,'utf8'));
   const cwd=`${recovery.originalCwd}.canonical`;
   if(!fs.existsSync(cwd)){
    const stage=fs.mkdtempSync(`${cwd}.clone-`);
    try{
     authenticatedGit(['clone','--no-hardlinks','--',repoUrl,stage]);
     check(git(stage,['remote','get-url','origin'])===repoUrl,'Staged clone origin does not match Growth OS');
     check(git(stage,['rev-parse','HEAD'])===remoteCommit,'Canonical repository changed during clone; retry qualification');
     check(git(stage,['status','--porcelain'])==='','Staged checkout is dirty');
     fs.renameSync(stage,cwd);
    }finally{if(fs.existsSync(stage))fs.rmSync(stage,{recursive:true});}
   }
   check(git(cwd,['remote','get-url','origin'])===repoUrl,'Existing canonical checkout has an unexpected origin');
   check(git(cwd,['symbolic-ref','--short','HEAD'])===defaultBranch&&git(cwd,['rev-parse','HEAD'])===remoteCommit,'Existing canonical checkout differs from the authenticated remote; preserve it and review before updating');
   check(git(cwd,['status','--porcelain'])==='','Existing canonical checkout has local changes; preserve them before migration');
   for(const file of ['README.md','AGENTS.md','07-agents/jobs/growth-director.md','schemas/experiment.schema.json'])check(fs.statSync(`${cwd}/${file}`).isFile(),'Canonical checkout is missing a required contract');
   check(git(recovery.originalCwd,['rev-parse','a64ddb6^{commit}'])===recovery.sprintCommit,'Original local sprint commit is no longer recoverable');
   const rows=await db.select().from(t.executionWorkspaces).where(and(eq(t.executionWorkspaces.companyId,growth.id),eq(t.executionWorkspaces.projectWorkspaceId,workspace.id),eq(t.executionWorkspaces.status,'active')));
   check(rows.every(r=>r.mode==='shared_workspace'&&r.strategyType==='project_primary'),'Review existing isolated worktrees before migration');
   const changed=workspace.cwd!==cwd||workspace.repoUrl!==repoUrl||rows.some(r=>r.cwd!==cwd||r.repoUrl!==repoUrl);
   if(changed){
    check(hash(await protectedState(sql))===hash(recovery.protectedState),'Protected business state changed after the recovery point; do not migrate against a stale backup');
    if(!fs.existsSync(`${root}/workspace-before.json`))write('workspace-before.json',{workspace,executionWorkspaces:rows});
   }
   const {projectService}=await import('/app/server/src/services/projects.ts');
   const {executionWorkspaceService}=await import('/app/server/src/services/execution-workspaces.ts');
   const {ensurePersistedExecutionWorkspaceAvailable}=await import('/app/server/src/services/workspace-runtime.ts');
   const {assertGitSensitiveAdapterWorkspaceValid}=await import('/app/server/src/services/heartbeat.ts');
   const {logActivity}=await import('/app/server/src/services/activity-log.ts');
   await db.transaction(async tx=>{
    if(changed){
     const metadata={...workspace.metadata,instructionsOnly:false,allowInternalHosted:false,preservedSnapshotPath:recovery.originalCwd,canonicalRepository:repoUrl,qualifiedCommit:remoteCommit};
     await projectService(tx).updateWorkspace(workspace.projectId,workspace.id,{name:'Quazmoz/growth-os',sourceType:'git_repo',cwd,repoUrl,repoRef:defaultBranch,defaultRef:defaultBranch,metadata});
    }
    for(const row of rows){
     const metadata={...row.metadata,instructionsOnly:false,allowInternalHosted:false,preservedSnapshotPath:recovery.originalCwd};
     // Let native realization rebuild its cached view from the updated project and row.
     for(const key of ['workspaceRealization','workspaceRealizationRequest','configFingerprint'])delete metadata[key];
     const persisted=changed?await executionWorkspaceService(tx).update(row.id,{cwd,repoUrl,baseRef:defaultBranch,metadata}):await executionWorkspaceService(tx).getById(row.id);
     const issue=row.sourceIssueId?(await tx.select().from(t.issues).where(eq(t.issues.id,row.sourceIssueId)))[0]:null;
     const base={baseCwd:cwd,source:'project_primary',projectId:workspace.projectId,workspaceId:workspace.id,repoUrl,repoRef:defaultBranch};
     const realized=await ensurePersistedExecutionWorkspaceAvailable({db:tx,base,workspace:persisted,issue,agent,resolveGitAuth});
     check(realized?.cwd===cwd,'Native task workspace realization did not resolve the canonical checkout');
     for(const adapterType of ['claude_local','codex_local','opencode_local'])await assertGitSensitiveAdapterWorkspaceValid({adapterType,agentId:agent.id,issue,
      resolvedWorkspace:{cwd,source:'project_primary',projectId:workspace.projectId,workspaceId:workspace.id,warnings:[]},executionWorkspace:realized,persistedExecutionWorkspace:persisted,executionTarget:null});
    }
    if(changed)await logActivity(tx,{companyId:growth.id,actorType:'user',actorId:owner,action:'project.workspace.updated',entityType:'project',entityId:workspace.projectId,
     details:{workspaceId:workspace.id,source:'authorized native GitHub workspace repair',qualifiedCommit:remoteCommit,preservedSprintCommit:recovery.sprintCommit,allowInternalHosted:false}},[]);
   });
   const receipt={checkedAt:new Date().toISOString(),workspaceId:workspace.id,cwd,repoUrl,branch:defaultBranch,commit:remoteCommit,clean:true,executionWorkspaces:rows.map(r=>r.id),nativeRealization:'passed',sprintCommitPreserved:recovery.sprintCommit,allowInternalHosted:false,changed};
   write('workspace.json',receipt);console.log('GITHUB_WORKSPACE_QUALIFIED',JSON.stringify(receipt));
  }else if(phase==='write'||phase==='write-stage'){
   await quiet();check(fs.existsSync(`${root}/workspace.json`),'Qualify the authenticated canonical workspace before testing remote persistence');
   const qualification=JSON.parse(fs.readFileSync(`${root}/workspace.json`,'utf8'));
   const growth=companies.find(c=>c.name==='Quazmoz Growth OS');
   const agent=(await db.select().from(t.agents).where(eq(t.agents.companyId,growth.id))).find(a=>a.name==='Growth OS Director');
   const {createGitRemoteAuthProvider}=await import('/app/server/src/services/git-credentials.ts');
   const auth=await createGitRemoteAuthProvider(db,growth.id,{agentId:agent.id,responsibleUserId:owner},{env:{},secretNames:[]})(qualification.repoUrl);
   check(auth?.source==='managed_connection','Native managed Git identity is unavailable; no shell credential fallback is permitted');
   const env={...process.env,...auth.env,GH_HOST:'github.com'};
   const authenticatedGit=(cwd,args)=>execFileSync('git',[...auth.configArgs,'-C',cwd,...args],{encoding:'utf8',env,timeout:120000,stdio:['ignore','pipe','pipe']}).trim();
   const gh=args=>execFileSync('gh',args,{encoding:'utf8',env,timeout:60000,stdio:['ignore','pipe','pipe']}).trim();
   const branch='paperclip/github-connector-verification-2026-10-13';
   const cwd=`${root}/write-worktree`;
   const artifact='integration-verification/paperclip-github-2026-10-13.md';
   const content='# Paperclip native GitHub verification\n\nThis isolated draft branch qualifies authenticated Git persistence through Paperclip’s managed GitHub identity on 2026-10-13.\n';
   if(!fs.existsSync(cwd)){
    if(phase==='write')check(!authenticatedGit(qualification.cwd,['ls-remote','--heads',qualification.repoUrl,`refs/heads/${branch}`]),'Test branch already exists remotely; review its receipt before creating a worktree');
    authenticatedGit(qualification.cwd,['worktree','add','-b',branch,cwd,qualification.commit]);
   }
   check(git(cwd,['symbolic-ref','--short','HEAD'])===branch,'Test worktree has an unexpected branch');
   const marker=`${root}/write-intent.json`;
   if(!fs.existsSync(marker))write('write-intent.json',{branch,cwd,artifact,contentHash:hash(content),baseCommit:qualification.commit});
   const intent=JSON.parse(fs.readFileSync(marker,'utf8'));
   check(intent.branch===branch&&intent.contentHash===hash(content),'Test artifact intent changed');
   const file=`${cwd}/${artifact}`;
   if(fs.existsSync(file))check(fs.readFileSync(file,'utf8')===content,'Existing verification artifact differs; preserve it for review');
   else{fs.mkdirSync(`${cwd}/integration-verification`,{recursive:true});fs.writeFileSync(file,content,{mode:0o644});}
   const status=git(cwd,['status','--porcelain']);
   check(!status||status.split('\n').every(line=>line.endsWith(artifact)||line.endsWith('integration-verification/')),'Test worktree contains unrelated changes');
   if(status){
    authenticatedGit(cwd,['add','--',artifact]);
    authenticatedGit(cwd,['-c','commit.gpgsign=false','commit','-m','test: qualify Paperclip native GitHub persistence']);
   }
   check(git(cwd,['diff','--name-only',intent.baseCommit,'HEAD'])===artifact,'Test branch changes more than the harmless verification artifact');
   const commit=git(cwd,['rev-parse','HEAD']);
   if(phase==='write-stage'){
    const receipt={preparedAt:new Date().toISOString(),branch,commit,artifact,content,localOnly:true,remoteWritePerformed:false};
    write('write-staged.json',receipt);console.log('GITHUB_WRITE_STAGED',JSON.stringify(receipt));
   }else{
   const remote=authenticatedGit(cwd,['ls-remote','--heads','origin',`refs/heads/${branch}`]);
   if(remote)check(remote.split(/\s/)[0]===commit,'Remote verification branch diverged; never force-push');
   else authenticatedGit(cwd,['push','--set-upstream','origin',`${branch}:refs/heads/${branch}`]);
   check(authenticatedGit(cwd,['ls-remote','--heads','origin',`refs/heads/${branch}`]).split(/\s/)[0]===commit,'Remote commit did not match the pushed verification artifact');
   check(git(qualification.cwd,['status','--porcelain'])==='','Canonical checkout changed during write verification');
   // Capture remote persistence before optional PR preparation, so a partial failure is resumable.
   const priorRemote=fs.existsSync(`${root}/write.json`)?JSON.parse(fs.readFileSync(`${root}/write.json`,'utf8')):{};
   const receipt={...priorRemote,checkedAt:new Date().toISOString(),branch,commit,artifact,nativeManagedIdentity:true,remoteCommitVerified:true,canonicalCheckoutClean:true,merged:priorRemote.merged===true};
   write('write.json',receipt);
   const prs=JSON.parse(gh(['pr','list','--repo','Quazmoz/growth-os','--head',branch,'--state','all','--json','url,isDraft,headRefOid']));
   check(prs.length<=1,'Multiple verification PRs require review');
   if(prs.length)check(prs[0].headRefOid===commit,'Existing verification PR points at another commit');
   else{
    const bodyFile=`${root}/verification-pr.md`;
    fs.writeFileSync(bodyFile,'Qualifies the existing Paperclip managed GitHub identity with an isolated branch, one harmless artifact, and an independently verified remote commit.\n\nNative connector reads were tested separately through Paperclip’s tool gateway.\n\nThis is a draft verification PR; keep it separate from marketing deliverables.\n',{mode:0o600});
    gh(['pr','create','--draft','--repo','Quazmoz/growth-os','--head',branch,'--base',qualification.branch,'--title','Verify Paperclip native GitHub persistence','--body-file',bodyFile]);
   }
   const confirmed=JSON.parse(gh(['pr','view',branch,'--repo','Quazmoz/growth-os','--json','url,isDraft,headRefOid,state']));
   check(confirmed.headRefOid===commit&&['OPEN','MERGED'].includes(confirmed.state),'PR confirmation did not match the test branch');
   const previousReceipt=JSON.parse(fs.readFileSync(`${root}/write.json`,'utf8'));
   const result={...previousReceipt,...receipt,pr:confirmed.url,draft:confirmed.isDraft,merged:confirmed.state==='MERGED'};
   write('write.json',result);console.log('GITHUB_REMOTE_WRITE_QUALIFIED',JSON.stringify(result));
   }
  }else if(phase==='merge'){
   await quiet();
   // This phase is for Quinn's explicit 2026-10-13 instruction "push and merge to main".
   const receipt=JSON.parse(fs.readFileSync(`${root}/write.json`,'utf8'));
   check(receipt.remoteCommitVerified&&/^https:\/\/github\.com\/Quazmoz\/growth-os\/pull\/\d+$/.test(receipt.pr),'Expected the independently verified Growth OS test PR');
   const workspace=JSON.parse(fs.readFileSync(`${root}/workspace.json`,'utf8'));
   const growth=companies.find(c=>c.name==='Quazmoz Growth OS');
   const agent=(await db.select().from(t.agents).where(eq(t.agents.companyId,growth.id))).find(a=>a.name==='Growth OS Director');
   const {createGitRemoteAuthProvider}=await import('/app/server/src/services/git-credentials.ts');
   const auth=await createGitRemoteAuthProvider(db,growth.id,{agentId:agent.id,responsibleUserId:owner},{env:{},secretNames:[]})(workspace.repoUrl);
   check(auth?.source==='managed_connection','Native managed Git identity is unavailable');
   const env={...process.env,...auth.env,GH_HOST:'github.com'};
   const gh=args=>execFileSync('gh',args,{encoding:'utf8',env,timeout:60000,stdio:['ignore','pipe','pipe']}).trim();
   const view=()=>JSON.parse(gh(['pr','view',receipt.pr,'--json','number,headRefOid,baseRefName,isDraft,state,mergeStateStatus,reviewDecision,statusCheckRollup,mergeCommit,mergedAt']));
   const before=view();
   check(before.headRefOid===receipt.commit&&before.baseRefName==='main','PR head or base differs from the approved verification commit');
   write('merge-before.json',{number:before.number,state:before.state,mergeStateStatus:before.mergeStateStatus,reviewDecision:before.reviewDecision,
    checks:before.statusCheckRollup?.map(c=>({name:c.name,status:c.status,conclusion:c.conclusion}))});
   if(before.state!=='MERGED'){
    check(before.state==='OPEN','Verification PR is no longer open');
    if(before.isDraft)gh(['pr','ready',receipt.pr]);
    gh(['pr','merge',receipt.pr,'--squash','--match-head-commit',receipt.commit]);
   }
   const after=view();check(after.state==='MERGED'&&after.mergeCommit?.oid,'GitHub has not confirmed a merge; required checks/reviews must be satisfied without an admin bypass');
   const authenticatedGit=args=>execFileSync('git',[...auth.configArgs,'-C',workspace.cwd,...args],{encoding:'utf8',env,timeout:120000,stdio:['ignore','pipe','pipe']}).trim();
   check(git(workspace.cwd,['status','--porcelain'])==='','Canonical checkout has local changes; preserve them before updating');
   authenticatedGit(['fetch','origin','main']);authenticatedGit(['merge','--ff-only','origin/main']);
   const commit=git(workspace.cwd,['rev-parse','HEAD']);
   check(authenticatedGit(['ls-remote','--heads','origin','refs/heads/main']).split(/\s/)[0]===commit,'Updated canonical checkout does not match remote main');
   check(git(workspace.cwd,['merge-base','--is-ancestor',after.mergeCommit.oid,'HEAD'])==='','Remote main does not contain the approved merge');
   const {projectService}=await import('/app/server/src/services/projects.ts');
   const [record]=await db.select().from(t.projectWorkspaces).where(eq(t.projectWorkspaces.id,workspace.workspaceId));
   if(record.metadata?.qualifiedCommit!==commit)await projectService(db).updateWorkspace(record.projectId,record.id,{metadata:{...record.metadata,qualifiedCommit:commit}});
   write('workspace.json',{...workspace,checkedAt:new Date().toISOString(),commit,clean:git(workspace.cwd,['status','--porcelain'])==='',afterApprovedMerge:true});
   const result={...receipt,merged:true,draft:false,mergedAt:after.mergedAt,mergeCommit:after.mergeCommit.oid,canonicalCommit:commit,remoteMainVerified:true,branchRetained:true};
   write('write.json',result);console.log('GITHUB_VERIFICATION_MERGED',JSON.stringify(result));
  }else if(phase==='authorize'){
   await quiet();check(fs.existsSync(`${root}/prepared.json`),'Run prepare first');
   const previous=fs.existsSync(`${root}/authorization.json`)?JSON.parse(fs.readFileSync(`${root}/authorization.json`,'utf8')):[];
   const output=[];
   for(const company of companies){
    const rows=await githubRows(company.id);check(rows.length===1,'Expected exactly one prepared native GitHub connection');
    const connection=rows[0];
    const grants=await db.select().from(t.connectionGrants).where(eq(t.connectionGrants.connectionId,connection.id));
    if(grants.some(g=>g.kind==='user'&&g.subjectUserId===owner&&g.status==='active'&&g.providerTenant?.github))continue;
    const retained=previous.find(x=>x.connectionId===connection.id&&Date.parse(x.expiresAt)>Date.now()+60000);
    if(retained){output.push(retained);continue;}
    const started=await svc.startOAuth(company.id,connection.id,{actor,subjectUserId:owner,redirectUri:'https://paperclip.k8s.local/api/tools/oauth/cloud-connector/callback'});
    output.push({company:company.name,connectionId:connection.id,authorizationUrl:started.authorizationUrl,expiresAt:started.expiresAt});
    // Each prepared handoff survives a later company's partial failure.
    write('authorization.json',output);
   }
   write('authorization.json',output);console.log('GITHUB_OWNER_AUTHORIZATION',JSON.stringify(output));
  }else{
   throw new OperatorError('Choose inspect, preserve, prepare, authorize, reconcile, permissions, reads, cross-reads, boundaries, workspace, verify, write-stage, write, merge, or self-test');
  }
 }catch(error){
  // Provider messages and stack traces can contain credentials; retain safe codes only.
  console.error('GITHUB_CONNECTOR_FAILED',JSON.stringify({phase,name:error?.name,code:typeof error?.code==='string'?error.code:null,
   operatorMessage:error instanceof OperatorError?error.message:undefined}));process.exitCode=1;
 }finally{await sql.end();await closeRegisteredClients(url);}
}
