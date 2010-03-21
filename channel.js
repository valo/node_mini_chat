if (typeof require === "function")
  EventEmitter = require('./event_emitter').EventEmitter;

function Channel(){
  this.log = [];
  this.members = [];
}
Channel.prototype = new EventEmitter;

Channel.prototype.addMember = function addMember(member){
  this.members.push(member);
  this.emit('add_member', member);
  return this;
};

Channel.prototype.removeMember = function removeMember(member){
  var index = this.members.indexOf(member);
  if (index !== -1) this.members.splice(index, 1);
  this.emit('remove_member', member);
  return this;
};

Channel.prototype.hasMember = function hasMember(member){
  return this.members.indexOf(member) !== -1;
};

if (typeof exports !== "undefined") exports.Channel = Channel;
