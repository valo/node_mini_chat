HOST = null; // localhost
PORT = 8000; //run it as root :-)
sys = require("sys");
events = require("events");
createServer = require("http").createServer;
url = require("url");

readFile = require("fs").readFile;

function Connection(request, response) {
  if (! (this instanceof Connection) ) return new Connection(request, response);

  this.req = request;
  this.res = response;
  this.url_info = url.parse(this.req.url, true);

  route(this);
  return this;
};

Connection.prototype = {
  respond: function(status, body, type, headers) {
    var header = [ ["Content-Type", type], ["Content-Length", body.length] ];
    if (headers){ header.concat(headers); }; //for cookies, later
    this.res.sendHeader(status, header);
    this.res.write(body);
    this.res.close();
    this.timestamp = (new Date()).getTime();
  },

  json: function(obj) {
    sys.puts(JSON.stringify(obj));
    this.respond(200, JSON.stringify(obj), "text/json");
  },

  notFound: function() {
    this.respond(404, "Not Found", 'text/plain');
  }
};

routes = {};
routes["/"] = home;
routes["/speak"] = speak;
routes["/listen"] = listen;
routes["/echo"] = function(cxn) { cxn.json(cxn.url_info.query); };

function route(connection){
  if (connection.url_info.pathname in routes)
    routes[connection.url_info.pathname](connection);
  else
    connection.notFound();
};

function home(connection) {
  readFile('index.html', 'utf8', function(err, data) {
    connection.respond(200, data, "text/html");
  });
};

function speak(connection){
  channel.addMessage( connection.url_info.query.statement );
  connection.json({});
};

function listen(connection){
  long_connections.push(connection);
};

server = createServer(Connection);
server.listen(PORT, HOST);
long_connections = [];

channel = new events.EventEmitter;
channel.message_log = [];
channel.message_log.length = 100;

channel.addMessage = function(message){
  this.message_log.shift();
  this.message_log.push(message);
  this.emit("new_message", message);
};

channel.addListener("new_message", function(message){
  for (var i = long_connections.length - 1; i >= 0; i--){
    long_connections.pop().json([message]);
  };
});