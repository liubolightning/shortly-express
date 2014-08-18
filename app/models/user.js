var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');

var User = db.Model.extend({
  tableName: 'users',
  initialize: function() {
    this.on('creating', function(model, attributes, options) {
      console.log('creating user');
    });
  }
});

module.exports = User;
