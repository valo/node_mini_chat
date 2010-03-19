HOST = null; // localhost
PORT = 8000; //run it as root :-)
sys = require("sys");
createServer = require("http").createServer;
url = require("url");

readFile = require("fs").readFile;

function Connection(request, response) {
  if (! (this instanceof Connection)) return new Connection(request, response);

  this.req = request;
  this.res = response;
  this.url_info = url.parse(this.req.url, true);

  route(this);

  return 1;
};

Connection.prototype = {
  respond: function(status, body, type) {
    this.res.sendHeader(status, [
      ["Content-Type", type],
      ["Content-Length", body.length]]);

    this.res.write(body);
    this.res.close();
  },

  json: function(obj) {
    this.respond(200, JSON.stringify(obj), "text/json");
  },
  notFound: function(s) {
    this.respond(404, s, 'text/plain');
  }
};

paths = {
  "/": function(connection) {
    readFile('index.html', 'utf8', function(err, data) {
      sys.puts(err);
      connection.respond(200, data, "text/html");
    });
  },
  
  "/hi": function(connection){
    connection.respond(200, "hi", "text/plain");
  }
};

function route(connection){
  paths[connection.url_info.pathname](connection);
};

server = createServer(Connection);
server.listen(PORT, HOST);
