HOST = null; // localhost
PORT = 8001; //run it as root :-)
var sys           = require("sys"),
    puts          = sys.puts,
    events        = require("events"),
    createServer  = require("http").createServer,
    url           = require("url"),
    readFile      = require("fs").readFile;

function Connection(request, response) {
  if (! (this instanceof Connection) ) return new Connection(request, response);

  this.req = request;
  this.res = response;
  this.url_info = url.parse(this.req.url, true);

  this.route();
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

  json: function(obj, code) {
    code || (code = 200);

    sys.puts(JSON.stringify(obj));
    this.respond(code, JSON.stringify(obj), "text/json");
  },

  notFound: function() {
    this.respond(404, "Not Found", 'text/plain');
  },

  route: function(){
    var connection = this, path = connection.url_info.pathname;

    sys.puts(connection.req.method+' '+path);

    if (path in Routes)
      Routes[path](connection);
    else {
      readFile('.'+path, 'utf8', function(err, data){
        if (err) {
          connection.notFound();
        }else{
          connection.respond(200, data, "text/"+path.split('.').slice(-1));
        }
      });
    }
  }
};

Routes = {};
Routes["/"] = home;
Routes["/speak"] = speak;
Routes["/listen"] = listen;
Routes["/join"] = join;
Routes["/echo"] = function(cxn) { cxn.json(cxn.url_info.query); };

function home(connection) {
  readFile('index.html', 'utf8', function(err, data) {
    connection.respond(200, data, "text/html");
  });
};

function speak(connection){
  channel.addMessage(connection.req.connection.remoteAddress +
    " "+ connection.url_info.query.statement );
  connection.json({});
};

function listen(connection){
  long_connections.push(connection);
};

function join(connection){
  var params = connection.url_info.query,
      nick = params.nick,
      session_id = params.session;

  result = channel.join(nick, session_id);
  connection.json(result);
}

server = createServer(Connection);
server.listen(PORT, HOST);
sys.puts("Server at http://" + (HOST || "127.0.0.1") + ":" + PORT + "/");

long_connections = [];

Users = {
  nicks_sessions : {},
  sessions_nicks : {},

  join: function(nick, session_id){
    var amendment = 1;
    while(nick in this.nicks_sessions){
      amendment = amendment + 1;
      nick = nick + amendment; //duplicate is aaron2 or aaron3 or so on
    }

    this.nicks_sessions[nick] = session_id;
    this.sessions_nicks[session_id] = nick;
  }
};

channel = new events.EventEmitter;
channel.message_log = [];
channel.message_log.length = 100;
channel.nicks = [];

channel.join = function (nick){ channel.nicks.push(nick); };

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
