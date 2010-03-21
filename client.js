(function() {

  var nick, session_id;

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


  $(document).delegate('textarea', 'keypress', function(event){
    if (event.which !== 13) return true;
    var self = $(this), message = self.val();

    self.val('');

    $.get('/speak', {statement: message, session_id: session_id}, function(){
      console.info(this, arguments);
    });

    event.preventDefault();
    return false;
  });

  var last_message_timestamp = 0; //get from server.
  function waitForNewMessages(){

    var logs = $('#logs ul');

    $.ajax({
      url: '/listen?since='+last_message_timestamp,
      success: function(messages, textStatus, request){
        if (request.status !== 200) return this.error(request, textStatus);

        for (var i=0; i < messages.length; i++){
          last_message_timestamp = messages[i].timestamp;

          if (messages[i].type === "message"){
            logs.append($(
              '<li title="sent at: '+new Date(messages[i].timestamp)+'">'+
                '<span class="nick">'+messages[i].nick+'</span>: '+
                '<span class="message">'+messages[i].data+'</span>'+
              '</li>'
            ));
          }

          if (messages[i].type === "join"){
            logs.append($(
              '<li title="joined at: '+new Date(messages[i].timestamp)+'">'+
                '<span class="nick">'+messages[i].nick+'</span>: '+
                '<span class="message">just joined</span>'+
              '</li>'
            ));
          }

          if (messages[i].type === "leave"){
            logs.append($(
              '<li title="left at: '+new Date(messages[i].timestamp)+'">'+
                '<span class="nick">'+messages[i].nick+'</span>: '+
                '<span class="message">just left</span>'+
              '</li>'
            ));
          }

        }

        waitForNewMessages();
      },
      error: function(XMLHttpRequest, textStatus){
        console.warn('ERROR REC MESGS', this, arguments);
        setTimeout(waitForNewMessages, 10000);
      }
    });
  }

  $(document).ready(function(){
    $('#nick input[type="text"]').focus();
  });

  //if we can, notify the server that we're going away.
  $(window).unload(function () {
    jQuery.get("/leave", {session_id: session_id}, function (data) { }, "json");
  });


})();