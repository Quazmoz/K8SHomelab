// Run inside the pinned container with the tsx loader. All credentials and OAuth URLs are fixtures.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import { createScriptPtyDriver, readBrowserCode, authorizeClaude } from './claude-login.mjs';
import { runSetupTokenLogin } from '/app/packages/adapters/claude-local/src/server/setup-token-runner.ts';
import { isValidBrowserCode } from '/app/packages/shared/src/validators/claude-setup-token-session.ts';
import { localEncryptedProvider } from '/app/server/src/secrets/local-encrypted-provider.ts';

process.umask(0o077);
const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'paperclip-login-test-'));
const code='FIXTURE_BROWSER_CODE';
const token='sk-ant-oat01-'+ 'SYNTHETIC'.repeat(12);
const url='https://claude.com/cai/oauth/authorize?code=true&client_id=fixture&response_type=code&redirect_uri=https%3A%2F%2Fplatform.claude.com%2Foauth%2Fcode%2Fcallback&scope=user%3Ainference&code_challenge='+ 'A'.repeat(43)+'&code_challenge_method=S256&state='+ 'B'.repeat(32);
try{
 const fixture=path.join(scratch,'fixture.mjs');
 fs.writeFileSync(fixture,`
process.stdin.setRawMode(true);
const prompt="Browser didn’t open? Use the url below to sign in (c to copy)\\n"+${JSON.stringify(url)}+"\\nPaste code here if prompted >\\n";
process.stdout.write(prompt);
let entered="";let codeAt=0;
process.stdin.on("data",chunk=>{
 const value=chunk.toString();
 if(value.includes("\\r")||value.includes("\\n")){
  if(entered!==${JSON.stringify(code)}||Date.now()-codeAt<100)process.exit(19);
  if(process.env.FIXTURE_REJECT==="1"){process.stdout.write("Fixture login rejected\\n",()=>process.exit(1));return;}
  const partial="Your OAuth token (valid for 1 year):\\r\\n"+${JSON.stringify(token.slice(0,38))};
  const footer=process.env.FIXTURE_UNKNOWN_SCREEN==="1"?"Fixture completion wording changed.":"Store this token securely. You won’t be able to see it again.";
  const record="\\x1b[2J\\x1b[H✓ Long-lived authentication token created successfully!\\r\\nYour OAuth token (valid for 1 year):\\r\\n"+${JSON.stringify(token.slice(0,38))}+"\\r\\n"+${JSON.stringify(token.slice(38))}+"\\r\\n"+footer+"\\r\\n";
  process.stdout.write(partial);
  process.stdout.write(record,()=>process.exit(0));
 }else{entered+=value;codeAt=Date.now();}
});
`,{mode:0o600});
 fs.writeFileSync(path.join(scratch,'claude'),`#!/bin/sh\nexec node '${fixture}'\n`,{mode:0o700});
 const logs=[];
 const run=async(onCredential,reject=false)=>runSetupTokenLogin(createScriptPtyDriver({...process.env,PATH:scratch+':'+process.env.PATH,FIXTURE_REJECT:reject?'1':'0'}),{timeoutMs:5000,onPrompt:prompt=>assert.equal(prompt.url,url),provideCode:async()=>code,onCredential,log:line=>logs.push(line)});
 let delivered=0;
 const success=await run(async bytes=>{assert.equal(bytes.toString(),token);delivered++;});
 assert.equal(success.outcome,'success');assert.equal(success.codeSubmitted,true);assert.equal(success.credentialDelivered,true);assert.equal(delivered,1);
 const pending=path.join(scratch,'encrypted-fixture.json');
 const failedSave=await run(async bytes=>{const prepared=await localEncryptedProvider.createVersion({value:bytes.toString()});fs.writeFileSync(pending,JSON.stringify(prepared),{mode:0o600});throw new Error('Private fixture sink error');});
 assert.equal(failedSave.outcome,'failure');assert(!fs.readFileSync(pending,'utf8').includes(token));assert.equal(await localEncryptedProvider.resolveVersion({material:JSON.parse(fs.readFileSync(pending,'utf8')).material}),token);
 const rejected=await run(async()=>assert.fail('Rejected login must not deliver credentials'),true);assert.equal(rejected.outcome,'failure');
 let unparsedCaptured=false;const written=[];const originalWrite=process.stdout.write.bind(process.stdout);
 process.stdout.write=chunk=>{written.push(String(chunk));return true;};
 try{
  const unknown=await authorizeClaude({env:{...process.env,PATH:scratch+':'+process.env.PATH,FIXTURE_UNKNOWN_SCREEN:'1'},runner:runSetupTokenLogin,validateCode:isValidBrowserCode,provideCode:async()=>code,timeoutMs:5000,onCredential:async()=>assert.fail('Unrecognized screen must not promote credentials'),onUnparsedCredential:async screen=>{
   assert(screen.includes(token.slice(0,38)));const prepared=await localEncryptedProvider.createVersion({value:screen});assert(!JSON.stringify(prepared).includes(token.slice(0,38)));assert.equal(await localEncryptedProvider.resolveVersion({material:prepared.material}),screen);unparsedCaptured=true;
  }});
  assert.equal(unknown.outcome,'failure');assert.equal(unknown.terminalDiagnostics.oauthTokenPrefixSeen,true);assert.equal(unparsedCaptured,true);
 }finally{process.stdout.write=originalWrite;}
 assert(!written.join().includes(token));assert(!written.join().includes(code));
 for(const secret of [code,token,url,'Private fixture sink error'])assert(!logs.join('\n').includes(secret));
 class Input extends EventEmitter { isTTY=true;isRaw=false;setRawMode(value){this.isRaw=value;}resume(){}pause(){} }
 const input=new Input();const controller=new AbortController();const messages=[];
 const read=readBrowserCode(controller.signal,isValidBrowserCode,line=>messages.push(line),input);
 input.emit('data',Buffer.from('\x1b[200~'+code.slice(0,8)));input.emit('data',Buffer.from(code.slice(8)+'\x1b[201~\r\n'));
 assert.equal(await read,code);assert.equal(input.isRaw,false);assert.equal(input.listenerCount('data'),0);assert(!messages.join().includes(code));
 const cancelledInput=new Input();const aborted=new AbortController();const cancelled=readBrowserCode(aborted.signal,isValidBrowserCode,()=>{},cancelledInput);aborted.abort();await assert.rejects(cancelled);assert.equal(cancelledInput.isRaw,false);assert.equal(cancelledInput.listenerCount('data'),0);
 console.log('CLAUDE_LOGIN_TESTS_PASSED: native PTY code timing, terminal redraws, wrapped tokens, encrypted failed-save/unrecognized-screen recovery, rejected login, masked input, cancellation, secret suppression; no provider calls');
}finally{fs.rmSync(scratch,{recursive:true,force:true});}
