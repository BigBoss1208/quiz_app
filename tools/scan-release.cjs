const fs=require('node:fs');const {execFileSync}=require('node:child_process');
const paths=new Set([...execFileSync('git',['diff','--name-only'],{encoding:'utf8'}).trim().split('\n'),...execFileSync('git',['ls-files','--others','--exclude-standard'],{encoding:'utf8'}).trim().split('\n')]);
let bad=false,count=0;
for(const p of paths){if(!p||!fs.existsSync(p)||!fs.statSync(p).isFile())continue;count++;const t=fs.readFileSync(p,'utf8');
  const forbidden=/(?:jdbc:)?postgres(?:ql)?:\/\/[^\s/@:]+:[^\s/@]+@|(?:ghp_|github_pat_)[A-Za-z0-9_]{20,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/;
  if(forbidden.test(t)){console.log('Potential credential in '+p);bad=true;}
  for(const key of ['DB_PASSWORD','JWT_SECRET','RENDER_API_KEY','CLOUDFLARE_API_TOKEN']){const value=process.env[key];if(value&&value.length>=12&&t.includes(value)){console.log('Environment credential found in '+p);bad=true;}}
}
console.log(`${bad?'FAIL':'PASS'}: scanned ${count} release candidate files; credential values are never printed`);process.exitCode=bad?1:0;
