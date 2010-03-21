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
  this.params = this.url_info.query;

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
    this.respond(code, JSON.stringify(obj), "application/json");
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

Routes["/"] = function (connection) {
  readFile('index.html', 'utf8', function(err, data) {
    connection.respond(200, data, "text/html");
  });
};

Routes["/application.js"] = function (connection) {
  var client_js_files = ['event_emitter', 'channel', 'client'];
  var application_js = '';

  function concatFile(){
    if (client_js_files.length){
      readFile('./'+client_js_files.shift()+'.js', 'utf8', function(err, data) {
        application_js += data+"\n";
        concatFile();
      });
    }else{
      connection.respond(200, application_js, "text/javascript");
    }
  }

  concatFile();
};

Routes["/speak"] = function (connection){
  var nick = Users.sessions_nicks[connection.params.session_id] ||
                connection.req.connection.remoteAddress;

  channel.addMessage( nick, connection.params.statement );
  connection.json({});
};

Routes["/listen"] = function (connection){
  var since = parseInt(connection.params.since || 0, 10);
  messages = channel.messagesSince(since);
  if(messages.length > 0 )
    connection.json(messages);
  else
    long_connections.push(connection);
};

Routes["/join"] = function (connection){
  var nick = params.nick,
      session_id = params.session_id;

  session = Users.join(nick, session_id);
  channel.join(session.nick);
  connection.json(session);
};

Routes["/part"] = function (connection){
  var nick = Users.part(connection.params.session_id);
  channel.part(nick);
};

Routes["/who"] = function (connection){
  connection.json(channel.nicks);
};

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
    return { nick: nick, session_id: session_id };
  },

  part: function(session_id){
    var nick = sessions_nicks[session_id];
    delete sessions_nicks[session_id];
    delete nicks_sessions[nick];
    return nick;
  }
};

channel = new events.EventEmitter;
channel.message_log = [];
channel.message_log.length = 100;
channel.nicks = [];

channel.join = function (nick){
  channel.nicks.push(nick);
  this.emit("join", nick);
};

channel.part = function (nick){
  var idx = nicks.indexOf(nick);
  this.emit("part", nick);
  return channel.nicks.splice(idx, 1);
};

channel.addMessage = function(nick, message){
  this.emit("new_message", nick, message);
};


channel.publishes = ["join", "part", "new_message"];

//server-only

channel.messagesSince = function(since){
  var msgs = [];
  for (var i = this.message_log.length - 1; i >= 0; i--){
    var msg = this.message_log[i];
    if(msg && msg.timestamp > since){
      msgs.unshift(msg); 
    }
  };
  
  return msgs;
};

for (var i = channel.publishes.length - 1; i >= 0; i--)
  (function(kind) {
    channel.addListener(kind, function(nick, data){
      data || (data = '');
      var history_item = {
        type: kind,
        nick: nick,
        data: data,
        timestamp: (new Date).getTime()
      };
      
      publish(history_item);
      channel.message_log.shift();
      channel.message_log.push(history_item);
    });
  })(channel.publishes[i]);

function publish(message){
  for (var i = long_connections.length - 1; i >= 0; i--){
    long_connections.pop().json( [message] );
  };
};