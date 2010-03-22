HOST = null; // localhost
PORT = 8001; //run it as root :-)
TIMEOUT = 30 * 1000; // 30 second timeout for open connections

var sys           = require("sys"),
    puts          = sys.puts,
    events        = require("events"),
    createServer  = require("http").createServer,
    url           = require("url"),
    readFile      = require("fs").readFile;

server = createServer(Connection);
server.listen(PORT, HOST);
sys.puts("Server at http://" + (HOST || "127.0.0.1") + ":" + PORT + "/");

//long_connections is a queue of the clients awaiting some event
server.long_connections = [];

//however, we have to close the connections even if no event happens
//  because some proxies don't do well with long-open connections
//  so, iterate over the server's long_connections and return an empty array
//  of notifications to the to-be-closed connections
function cleanOldSessions(){
  if(server.long_connections.length){
    now = (new Date).getTime();
    while( (server.long_connections[0].timestamp + TIMEOUT) < now){
      server.long_connections.shift().json([]);
      if(!(server.long_connections.length))
        break;
    }
  }
  setTimeout(cleanOldSessions, 1000);
}

cleanOldSessions(); //


//This is the function that gets called on every new connection to the server
//  we ensure the constructor call (new Connection) so we can use the new scope
//  does some up-front processing of request params 
//  then finally, routes the connection to the appropriate handler
function Connection(request, response) {
  if (! (this instanceof Connection) ) return new Connection(request, response);

  this.req = request;
  this.res = response;
  this.url_info = url.parse(this.req.url, true);
  this.params = this.url_info.query;
  this.timestamp = (new Date()).getTime();

  this.route();
  return false;
};

//The prototype of all connections contains convienence functions for responding
//  respond is fully-parameterized "write data and close", most others call it
//  json stringifies the object with a default http status code of 200
//  notFound gives a simple 404
//  route passes a connection to a handler if one is registered for that path
//    if the path is unregistered, it attempts to read a file from disk
//    if there is an error reading file from disk, returns 404
Connection.prototype = {
  respond: function(status, body, type) {
    var header = [ ["Content-Type", type], ["Content-Length", body.length] ];
    this.res.sendHeader(status, header);
    puts("responding with:" + body);
    this.res.write(body);
    this.res.close();
  },

  json: function(obj, code) {
    code || (code = 200);
    this.respond(code, JSON.stringify(obj), "application/json");
  },

  notFound: function() {
    this.respond(404, "Not Found", 'text/plain');
  },

  route: function(){
    var connection = this, path = connection.url_info.pathname;

    puts(" routing [PATH]: "+path);
    
    if (path in Routes)
      Routes[path](connection);
    else {
      readFile('.'+path, 'utf8', function(err, data){
        if (err)
          connection.notFound({});
        else
          connection.respond(200, data, "text/"+path.split('.').slice(-1));
      });
    }
  }
};

//Routes object is a path to handler map
Routes = {};

Routes["/"] = function (connection) {
  readFile('index.html', 'utf8', function(err, data) {
    connection.respond(200, data, "text/html");
  });
};

//concat all of our client js files into one for the browser
Routes["/application.js"] = function (connection) {
  var client_js_files = ['client'];
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

//endpoint for new messages, expects session_id and statement query params
Routes["/speak"] = function (connection){
  var nick = Users.sessions_nicks[connection.params.session_id] ||
                connection.req.connection.remoteAddress;

  channel.message( nick, connection.params.statement );
  connection.json({});
};

//endpoint for clients awaiting updates
//  returns messages created since the since query param
//  if there are none, adds the connection to server.long_connections 
Routes["/listen"] = function (connection){
  var since = parseInt(connection.params.since || 0, 10),
      messages = channel.messagesSince(since);
  if(messages.length > 0 )
    connection.json(messages);
  else
    server.long_connections.push(connection);
};

//endpoint for clients that want to join or "log in"
//  expects nick and session_id query params
//  joins the default channel
//  returns the resulting session object
Routes["/join"] = function (connection){
  var session = Users.join(connection.params.nick, connection.params.session_id);
  channel.join(session.nick);
  connection.json(session);
};

//endpoint for clients that are leaving the chat
//  expects a session_id query param
//  announces exit to room
//  closes connection without response
Routes["/leave"] = function (connection){
  if(connection.params && connection.params.session_id){
    puts("trying to leave:" + sys.inspect(connection.params));
    var nick = Users.part(connection.params.session_id);
    channel.leave(nick);
    connection.res.close();
  }
};

//endpoint for clients that want a list of current room members
//  returns an array of nicks
Routes["/who"] = function (connection){
  connection.json(channel.nicks);
};


//Stores the users and their sessions, maintaining both indexes
//ensures nick uniqueness
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
    var nick = this.sessions_nicks[session_id];
    delete this.sessions_nicks[session_id];
    delete this.nicks_sessions[nick];
    return nick;
  }
};

//represents a stream of messages and a list of current members
//  maintains a buffer (queue) of the 100 most recent events
channel = new events.EventEmitter;
channel.message_log = [];
channel.message_log.length = 100;
channel.nicks = [];

//returns messages created since the given timestamp
channel.messagesSince = function(since){
  return this.message_log.filter(function(msg){
    return msg && msg.timestamp > since;
  });
};

//the following join/leave/message all update internal lists
//  they all throw eponymous events
channel.join = function (nick){
  channel.nicks.push(nick);
  this.emit("join", nick);
};

channel.leave = function (nick){
  this.nicks.splice(this.nicks.indexOf(nick), 1);
  this.emit("leave", nick);
  return nick;
};

channel.message = function(nick, message){
  this.emit("message", nick, message);
};

//register an event listener on the channel for notification events
//  publishes these events to all open clients
//  adds the events to the history
["join", "leave", "message"].forEach(function(kind) {
  channel.addListener(kind, function(nick, data){
    puts("in listener [nick]:" + nick);
    puts("in listener [data]:" + data);
    puts("in listener [kind]:" + kind);
    data || (data = '');
    var history_item = {
      type: kind,
      nick: nick,
      data: data,
      timestamp: (new Date).getTime()
    };

    while(server.long_connections.length) 
      server.long_connections.pop().json([history_item]);

    channel.message_log.shift();
    channel.message_log.push(history_item);
  });
});