# Smallest viable chat demo!

## Made with Node JS v 0.1.32

This is an anonymous chat server in about 200 lines of server code.

to start, simply

      node server.js
  
and then

      open http://localhost:8000
      
then, chat away.  open in multiple tabs to see the push notifications work.

## Note:

There is no persisted store for the information in here, or any authentication.  We just make sure that no two sessions are trying to use the same nick at the same time.  Session is really just a shared secret.