function EventEmitter(){
  this._listeners = {};
}
EventEmitter.prototype.addListener = function addListener(type, handler){
  this._listeners[type] || (this._listeners[type] = []);
  this._listeners[type].push(handler);
  return this;
};
EventEmitter.prototype.emit = function emit(type, data){
  var handlers = this._listeners[type];

  if (handlers) for (var i=0; i < handlers.length; i++) (function(handler) {
    setTimeout(function(){ handler.call(this, this, data); }, 1);
  })(handlers[i]);

  return this;
};

if (typeof exports !== "undefined") exports.EventEmitter = EventEmitter;