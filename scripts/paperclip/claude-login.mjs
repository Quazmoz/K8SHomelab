import { spawn } from 'node:child_process';
import xterm from '/app/node_modules/.pnpm/@xterm+xterm@6.0.0/node_modules/@xterm/xterm/lib/xterm.js';
import { parseSetupTokenPrompt, parseSetupTokenCredential, SETUP_TOKEN_BEFORE_ANCHOR, SETUP_TOKEN_AFTER_ANCHOR } from '/app/packages/adapters/claude-local/src/server/setup-token-parse.ts';

// The native runner owns prompt validation, paste timing, token parsing, and completion.
// This module supplies a local PTY and a masked owner code input; it never logs raw output.
export function createScriptPtyDriver(env) {
 let child;
 const terminal=new xterm.Terminal({cols:4096,rows:64,scrollback:128,allowProposedApi:true});
 const diagnostics={promptParsed:false,credentialParsed:false,oauthTokenPrefixSeen:false,beforeAnchorSeen:false,afterAnchorSeen:false,oauthExchangeErrorSeen:false};
 let queue=Promise.resolve();let disposed=false;let retained='';let unparsed='';
 const snapshot=()=>{
  const buffer=terminal.buffer.active;const lines=[];
  for(let row=buffer.baseY;row<buffer.baseY+terminal.rows;row++)lines.push(buffer.getLine(row)?.translateToString(true)??'');
  return lines.join('\n').replaceAll('\u2019',"'").replaceAll('\u00a0',' ');
 };
 return {
  diagnostics,
  takeUnparsedCredentialScreen() {const value=unparsed;unparsed='';return value;},
  start(command,onData) {
   if(command!=='claude setup-token')throw new Error('Unexpected Claude login command');
   child=spawn('script',['-q','-e','-f','-c','stty cols 4096 rows 64; exec claude setup-token','/dev/null'],{env,stdio:['pipe','pipe','pipe'],detached:true});
   child.stdout.setEncoding('utf8');child.stderr.setEncoding('utf8');
   const inspectScreen=()=>{
    if(disposed)return;
    const screen=snapshot();
    if(screen.includes('sk-ant-oat01-')&&!diagnostics.credentialParsed)unparsed=screen;
    if(!diagnostics.promptParsed){const prompt=parseSetupTokenPrompt(screen);if(prompt){diagnostics.promptParsed=true;onData(`Browser didn't open? Use the url below to sign in (c to copy)\n${prompt.url}\n${prompt.prompt} >\n`);}}
    if(diagnostics.promptParsed&&!diagnostics.credentialParsed){const token=parseSetupTokenCredential(screen);if(token){diagnostics.credentialParsed=true;unparsed='';onData(`\n${SETUP_TOKEN_BEFORE_ANCHOR}\n${token}\n${SETUP_TOKEN_AFTER_ANCHOR}\n`);}}
   };
   // Capture a completed frame before a later erase/redraw in the same output chunk.
   for(const final of ['J','K','A','H','f','G'])terminal.parser.registerCsiHandler({final},()=>{inspectScreen();return false;});
   const collect=chunk=>{
    const text=chunk.toString('utf8');retained=(retained+text).slice(-65536);
    diagnostics.oauthTokenPrefixSeen ||= retained.includes('sk-ant-oat01-');
    diagnostics.beforeAnchorSeen ||= retained.includes('Your OAuth token');
    diagnostics.afterAnchorSeen ||= /Store this token securely/i.test(retained);
    diagnostics.oauthExchangeErrorSeen ||= /invalid_grant|invalid.*authorization code|authorization code.*expired|failed to exchange/i.test(retained);
    // Ink redraws its screen. Replay cursor/erase operations before native parsing,
    // rather than accumulating obsolete frames and partial copies of a token.
    queue=queue.then(()=>new Promise(resolve=>{
     if(disposed){resolve();return;}
     terminal.write(text,()=>{
      if(disposed){resolve();return;}
      inspectScreen();
      resolve();
     });
    }));
   };
   child.stdout.on('data',collect);child.stderr.on('data',collect);
   return new Promise((resolve,reject)=>{child.once('error',()=>reject(new Error('Claude PTY could not start')));child.once('close',exitCode=>{queue.then(()=>resolve({exitCode}),()=>reject(new Error('Claude terminal replay failed')));});});
  },
  write(input) { if(!child?.stdin?.writable)throw new Error('Claude PTY is closed');child.stdin.write(input); },
  stop() { if(child?.pid&&child.exitCode===null&&child.signalCode===null){try{process.kill(-child.pid,'SIGKILL');}catch{}} },
  dispose() { disposed=true;retained='';terminal.dispose();child?.stdin?.destroy();child?.stdout?.destroy();child?.stderr?.destroy(); },
 };
}

export function readBrowserCode(signal,validate,print,input=process.stdin) {
 if(!input.isTTY)throw new Error('Browser code input requires a terminal');
 return new Promise((resolve,reject)=>{
  let buffer='';
  const wasRaw=input.isRaw;
  const cleanup=()=>{input.removeListener('data',read);signal.removeEventListener('abort',cancel);input.setRawMode(wasRaw);input.pause();buffer='';};
  const cancel=()=>{cleanup();reject(new Error('Claude browser code input cancelled'));};
  const read=chunk=>{
   buffer+=chunk.toString('utf8');
   if(buffer.includes('\x03')){cancel();return;}
   if(buffer.length>4096){buffer='';print('Browser code is too long. Paste only the code from the browser.');return;}
   const end=buffer.search(/[\r\n]/);
   if(end<0)return;
   const code=buffer.slice(0,end).replace(/\x1b\[(?:200|201)~/g,'').trim();
   buffer='';
   if(!validate(code)){print('Browser code was not recognized. Paste the browser code again.');return;}
   cleanup();resolve(code);
  };
  if(signal.aborted){reject(new Error('Claude browser code input cancelled'));return;}
  input.setRawMode(true);input.on('data',read);signal.addEventListener('abort',cancel,{once:true});input.resume();
 });
}

export async function authorizeClaude({env,runner,validateCode,onCredential,onUnparsedCredential,provideCode,timeoutMs=10*60*1000,onPrompt}) {
 const controller=new AbortController();
 const cancel=()=>controller.abort();
 const print=line=>process.stdout.write(`${line}\r\n`);
 const driver=createScriptPtyDriver(env);
 process.once('SIGTERM',cancel);process.once('SIGINT',cancel);
 try{
  const result=await runner(driver,{
   signal:controller.signal,timeoutMs,
   onPrompt:prompt=>{print(prompt.url);print('Paste the browser login code here, then press Enter (input is hidden).');onPrompt?.(prompt);},
   provideCode:provideCode??(async signal=>{
    try{return await readBrowserCode(signal,validateCode,print);}
    catch{controller.abort();throw new Error('Claude browser code input cancelled');}
   }),
   onCredential,
   log:print,
  });
  const unparsed=driver.takeUnparsedCredentialScreen();
  if(result.outcome==='failure'&&result.exitCode===0&&unparsed&&onUnparsedCredential)await onUnparsedCredential(unparsed);
  return {...result,terminalDiagnostics:driver.diagnostics};
 }finally{process.removeListener('SIGTERM',cancel);process.removeListener('SIGINT',cancel);}
}
