(function() {

  var nick, session_id;
  var last_message_timestamp = 0; //get from server.
  
  //join the room with the chosen nickname
  $(document).delegate('#nick', 'submit', function(event){
    event.preventDefault();

    nick = $('#nick input[type="text"]').val();
    session_id = Math.random();

    $.get('/join', {nick:nick, session_id: session_id}, function(){
      $('#nick').hide();
      $('#logs, textarea').show().last().focus();
      waitForNewMessages();
    });

  });

  //submits the message to the room when the person hits enter
  $(document).delegate('textarea', 'keypress', function(event){
    if (event.which !== 13 /*enter key*/) return true;
    var self = $(this), message = self.val();

    self.val('');

    if(message.length)
      $.get('/speak', {statement: message, session_id: session_id});

    event.preventDefault();
    return false;
  });
  
  //waitForNewMessages does the actual long-polling of the server
  //  and handles new messages when they are recieved
  function waitForNewMessages(){
    $.ajax({
      url: '/listen?since='+last_message_timestamp,
      success: function(messages, textStatus, request){
        if (request.status !== 200)
          this.error(request, textStatus);
        else{
          if(messages && messages.length)
            messagesRecieved(messages);

          waitForNewMessages();          
        }
      },
      error: function(XMLHttpRequest, textStatus){
        messagesRecieved([{
          timestamp: (new Date).getTime(),
          nick: '',
          type: 'error',
          data: textStatus+' code recieved from server'
        }]);
        setTimeout(waitForNewMessages, 10000);
      }
    });
  }

  var typesToPast = {
    "message": "sent",
    "join": "joined",
    "leave": "left",
    "error": "errored"
  };
  
  function messagesRecieved(messages) {
    var logs = $('#logs ul');
    
    for (var i=0; i < messages.length; i++){
      last_message_timestamp = messages[i].timestamp;
      var verb = typesToPast[messages[i].type],
          date = new Date(messages[i].timestamp),
          stamp = (date.getHours() % 12 ) + ':' + zeroPad(2, date.getMinutes()),
          msg = messages[i].data.length ?  messages[i].data : ('just ' + verb);
        
      logs.append($(
        '<li class="'+verb+'" title="'+verb+' at: '+date+'">'+
          '<div class="timestamp">'+stamp+'</div> '+
          '<div class="data">'+
            '<div class="nick">'+messages[i].nick+'</div> '+
            '<div class="message">'+ msg + '</div>'+
            '<br/>'+
          '</div>'+
          '<br/>'+
        '</li>'
      ));
    }
  };
  
  //from node_chat.js's client
  function zeroPad(digits, n) {
    n = n.toString();
    while (n.length < digits) 
      n = '0' + n;
    return n;
  };
  
  //focus on the nickname input when the document is ready.
  $(document).ready(function(){
    $('#nick input[type="text"]').focus();
  });

  //if we can, notify the server that we're going away.
  $(window).unload(function () {
    jQuery.get("/leave", {session_id: session_id}, function (data) { }, "json");
  });


})();