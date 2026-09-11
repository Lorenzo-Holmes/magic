'use strict';
// One serialized verification pipeline; never changes sources while tests run.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),base=path.join(root,'output/ui-v4-foundation');fs.mkdirSync(base,{recursive:true});
const out=fs.mkdtempSync(path.join(base,'verification-')),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const before=Object.fromEntries(require('./production-files.cjs').map(f=>[f,sha(fs.readFileSync(path.join(root,f)))]));
const report={scope:'UI-00..03 foundation regression; not full 18-task V4 acceptance',out,version:require('../package.json').version,startedAt:new Date().toISOString(),steps:[],passed:false};
const tmp=path.join(root,'.cache/tmp');fs.mkdirSync(tmp,{recursive:true});Object.assign(process.env,{TEMP:tmp,TMP:tmp,TMPDIR:tmp});
const tests=fs.readdirSync(path.join(root,'tests')).filter(f=>f.endsWith('.test.cjs')).map(f=>'tests/'+f);
try{
  for(const [name,args]of [
    ['node',['--test',...tests]],
    ['journey',['tools/journey-simulation.cjs']],
    ['final-simulation',['tools/final-simulation.cjs']],
    ['build',['tools/build.cjs']],
    ['package',['tools/verify-release.cjs']],
    ['browser',['tools/run-browser-qa.cjs']]
  ]){
    console.log('Running',name);const at=new Date().toISOString();const r=cp.spawnSync(process.execPath,args,{cwd:root,env:process.env,encoding:'utf8',maxBuffer:20*1024*1024});
    fs.writeFileSync(path.join(out,name+'.log'),(r.stdout||'')+(r.stderr||''));report.steps.push({name,command:[process.execPath,...args],exitCode:r.status,startedAt:at,completedAt:new Date().toISOString()});
    fs.writeFileSync(path.join(out,'status.json'),JSON.stringify(report,null,2));console.log(name,'exit',r.status);if(r.status!==0)throw Error(`${name} failed: ${(r.stderr||r.stdout||'').slice(-1800)}`);
  }
  for(const [f,h]of Object.entries(before))if(sha(fs.readFileSync(path.join(root,f)))!==h)throw Error('Source changed during acceptance: '+f);
  const b=JSON.parse(fs.readFileSync(path.join(root,'release/build-report.json'),'utf8'));report.package={bytes:b.zipBytes,rawBytes:b.rawBytes,sha256:b.zipSha256,files:b.files.length};report.sourceUnchanged=true;report.passed=true;
}catch(e){report.error=e.stack;process.exitCode=1;console.error(e.message);}
finally{report.completedAt=new Date().toISOString();fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));fs.writeFileSync(path.join(base,'verification-latest.json'),JSON.stringify({out,passed:report.passed}));console.log(JSON.stringify({out,passed:report.passed,package:report.package,error:report.error},null,2));}
