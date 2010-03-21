(function() {

  var channel = new Channel;

  $(document).delegate('textarea', 'keypress', function(event){
    if (event.which !== 13) return true;
    var self = $(this), message = self.val();

    self.val('');

    $.get('/speak', {statement: message}, function(){
      console.info(this, arguments);
    });

    event.preventDefault();
    return false;
  });

  var last_polled = 0; //get from server.
  function waitForNewMessages(){
    console.log('WFNM');

    $.ajax({
      url: '/listen?last_polled='+last_polled,
      success: function(messages, textStatus, request){
        if (request.status !== 200) return this.error(request, textStatus);

        last_polled = (new Date).getTime();
        console.info(messages.length, 'NEW MESSAGES', messages);
        var logs = $('#logs ul');
        for (var i=0; i < messages.length; i++) {
          logs.append($(
            '<li>'+
              '<span class="nick">'+messages[i].nick+'</span>: '+
              '<span class="message">'+messages[i].data+'</span>'+
            '</li>'
          ));
        };

        waitForNewMessages();
      },
    error: function(XMLHttpRequest, textStatus){
        console.warn('ERROR REC MESGS', this, arguments);
        setTimeout(waitForNewMessages, 10000);
      }
    });
  }
  waitForNewMessages();

})();