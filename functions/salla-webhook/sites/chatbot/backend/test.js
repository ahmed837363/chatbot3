const http = require('http');
const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end('OK');
});
server.listen(3001, () => console.log('Server on 3001'));
