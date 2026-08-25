const { Client } = require('ssh2');
const c = new Client();
c.on('ready', () => {
  const cmd = [
    'echo "=== 系统内存 ==="',
    'free -h | head -2',
    'echo "=== 端口 80/3001/5173/8080 ==="',
    'ss -tlnp 2>/dev/null | grep -E ":80 |:3001 |:5173 |:8080 " || echo "这些端口空闲"',
    'echo "=== Nginx 站点 ==="',
    'ls /etc/nginx/sites-enabled/',
    'echo "=== 家目录 ==="',
    'ls -la ~/ | grep -v "^\\."',
    'echo "=== Git 版本 ==="',
    'git --version',
    'echo "=== Node 版本 ==="',
    'node --version'
  ].join(' && ');
  c.exec(cmd, (err, stream) => {
    let out = '';
    stream.on('data', d => out += d);
    stream.stderr.on('data', d => out += d);
    stream.on('close', () => { console.log(out); c.end(); });
  });
}).connect({host:'47.93.238.191',port:22,username:'young',password:'200681@Yrq',readyTimeout:15000});
