# Smallest viable chat demo!

## Made with Node JS v 0.1.32

This is an anonymous chat server in 200 lines of code, including the UI.

to start, simply

      node server.js
  
and then

      open http://localhost:8000
      
then, chat away.  open in multiple tabs to see the push notifications work.

## Note:

I need to add in the timestamp checking for last polled so the server can return any messages that were created between long-poll requests.  *Eh*.  This is just a proof-of-concept to show off the push workflow without additional cruft.