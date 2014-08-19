var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var session = require('express-session');
var bodyParser = require('body-parser');
var bcrypt = require('bcrypt-nodejs');
var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');
var passport = require('passport');
var cookieParser = require('cookie-parser');
var GitHubStrategy = require('passport-github').Strategy;

passport.serializeUser(function(user, done){
  done(null, user);
});

passport.deserializeUser(function(obj, done){
  done(null, obj);
});

passport.use(new GitHubStrategy({
    clientID: process.env.ID,
    clientSecret: process.env.SECRET,
    callbackURL: "http://127.0.0.1:3000/auth/github/callback"
  },
  function(accessToken, refreshToken, profile, done){
    process.nextTick(function(){
      console.log(profile._json.login);
      return done(null, profile);
    });
  }
));

var app = express();
/*****************************************************************
 * ROUTES
 *****************************************************************
 */

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(partials());
// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({secret: "bob the builder", resave: true, saveUninitialized: true}));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(__dirname + '/public'));

var ensureAuthenticated = function(req, res, next) {
  console.log('ensure: ', req.isAuthenticated());
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login');
};

app.get('/', ensureAuthenticated, function (req, res) {
  res.render('index', {user: req.user});
});

app.get('/login', function(req, res){
  res.render('login', {user: req.user});
});

app.get('/auth/github',
  passport.authenticate('github'),
  function(req, res){});

app.get('/auth/github/callback',
  passport.authenticate('github', {
    failureRedirect: '/login'
  }),
  function(req, res){
    res.render('index');
  });

app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/login');
});

app.get('/create', ensureAuthenticated, function (req, res) {
  res.redirect('/');
});

app.get('/links', ensureAuthenticated, function (req, res) {
  Links.reset().fetch().then(function(links) {
    res.send(200, links.models);
  });
});

app.post('/links', function (req, res) {
  var uri = req.body.url;
  if (!util.isValidUrl(uri)) {
    console.log('Not a valid url: ', uri);
    return res.send(404);
  }

  new Link({ url: uri }).fetch().then(function (found) {
    if (found) {
      res.send(200, found.attributes);
    } else {
      util.getUrlTitle(uri, function (err, title) {
        if (err) {
          console.log('Error reading URL heading: ', err);
          return res.send(404);
        }

        var link = new Link({
          url: uri,
          title: title,
          base_url: req.headers.origin
        });

        link.save().then(function (newLink) {
          Links.add(newLink);
          res.send(200, newLink);
        });
      });
    }
  });
});

/************************************************************/
// Write your authentication routes here
/************************************************************/

// setup listeners on /login
  // check if your a valid user
    // if a valid user -> take you to the site
    // if not, send you to signup
      // save you in the db.

//login page
// app.post('/login', function(req, res) {
//   var username = req.body.username;
//   var pw = req.body.password;
//   new User({username: username}).fetch().then(function(model) {
//     if (!model) {
//       console.error('OH NO!');
//       return;
//     }
//     var salt = model.get('salt');
//     pw = bcrypt.hashSync(pw, salt);
//     new User({username: username, password: pw}).fetch().then(function(found) {
//       if (found) {
//         req.session.regenerate(function() {
//           req.session.user = username;
//           res.render('index');
//         });
//       } else {
//         res.render('login');
//       }
//     });
//   });
// });

// //page where they can register
// app.get('/signup', function(req, res) {
//   res.render('signup');
// });

// //creating an account
// app.post('/signup', function(req, res) {
//   var username = req.body.username;
//   var pw = req.body.password;

//   // create entry in database
//   new User({username: username, password: pw})
//     .save().then(function() {
//       console.log('user saved');
//       // after saving, redirect to index
//       res.render('index');
//     });
// });

// app.get('/logout', function(req, res) {
//   req.session.destroy(function() {
//     res.redirect('/');
//   });
// });

/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', function(req, res) {
  new Link({ code: req.params[0] }).fetch().then(function(link) {
    if (!link) {
      res.redirect('/');
    } else {
      var click = new Click({
        link_id: link.get('id')
      });

      click.save().then(function() {
        db.knex('urls')
          .where('code', '=', link.get('code'))
          .update({
            visits: link.get('visits') + 1,
          }).then(function() {
            return res.redirect(link.get('url'));
          });
      });
    }
  });
});

console.log('Shortly is listening on 3000');
app.listen(3000);
