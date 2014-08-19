var db = require('../config');
var Promise = require('bluebird');
var bcrypt = require('bcrypt-nodejs');

var User = db.Model.extend({
  tableName: 'users',
  initialize: function() {
    this.on('creating', function(model, attributes, options) {
      var password = model.get('password');
      var salt = bcrypt.genSaltSync(2);
      model.set('salt', salt);
      var data = bcrypt.hashSync(password, salt);
      model.set('password', data);
    });
  }
});

module.exports = User;
