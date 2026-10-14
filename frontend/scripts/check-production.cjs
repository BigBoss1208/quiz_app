const fs=require('node:fs');const path=require('node:path');
function scan(dir){for(const name of fs.readdirSync(dir)){const p=path.join(dir,name);if(fs.statSync(p).isDirectory())scan(p);else if(/\.(js|html)$/.test(name)){const t=fs.readFileSync(p,'utf8');if(/localhost:8080|127\.0\.0\.1:8080/.test(t))throw new Error('Local API found in production artifact: '+p);}}}
scan(path.join(__dirname,'../dist'));console.log('PASS: production artifact contains no localhost:8080 API');
