'use strict';

const express = require('express');
const app = express();
const path = require('path');
const bodyParser = require('body-parser');
const jsonParser = bodyParser.json();

const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const NaverStrategy = require('passport-naver').Strategy;

const mongoose = require('mongoose');
const db = mongoose.connection;

const formidable = require('formidable');
const gm = require('gm');
const importFilesPath = process.cwd();
const del = require('del');

const utils = require(importFilesPath + '/utils');
const dbModels = require(importFilesPath + '/dbModels');
const imageFinder = require(importFilesPath + '/imageFinder');
const imageUploader = require(importFilesPath + '/imageUploader');
const strategy = require(importFilesPath + '/strategy');

const Image = dbModels.makeImageDao(mongoose);
const User = dbModels.makeUserDao(mongoose);

mongoose.Promise = require('bluebird');
mongoose.connect('mongodb://localhost:27017/BoostCamp');
db.on('error', console.error);
db.once('open', function () {
  console.log("Connected to mongod server");
});

app.set('port', process.env.PORT || 3000);

app.use(bodyParser.urlencoded({extended: false}));

app.use(session({
  secret: 'keyboard cat',
  resave: true,
  saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password'
  },
  function (email, password, done) {
    User.findOne({email: email}, function (err, user) {
      if (err) {
        return done(err);
      }
      if (!user) {
        return done(null, false, {message: 'Incorrect username.'});
      }
      if (user.password !== password) {
        return done(null, false, {message: 'Incorrect password.'});
      }
      return done(null, user);
    });
  }
));

passport.use(new FacebookStrategy({
    clientID: '1499173543594905',
    clientSecret: "9590e04825dacb3276d185e02ea32574",
    callbackURL: "http://localhost:3000/auth/facebook/callback"
  },
  function (accessToken, refreshToken, profile, done) {
    console.log('profile: ', profile);
    User.findOne({id: profile.id}, (err, user) => {
      if (user) {
        return done(err, user);
      }
      const newUser = new User({
        id: profile.id,
        nickname: profile.displayName,
        strategy: "Facebook"
      });
      newUser.save(() => {
        return done(null, newUser);
      });
      passport.serializeUser(function (user, done) {
        console.log("serialize", user, user.id);
        done(null, user.id);
      });
    });
  }
));

passport.use(new GitHubStrategy({
    clientID: "4627328162362632d131",
    clientSecret: "e0bc9e4821a986bd6d6ec9d696a45d3839043490",
    callbackURL: "http://localhost:3000/auth/github/callback"
  },
  function (accessToken, refreshToken, profile, done) {
    console.log('profile: ', profile);
    User.findOne({id: profile.id}, (err, user) => {
      if (user) {
        return done(err, user);
      }
      const newUser = new User({
        id: profile.id,
        nickname: profile.displayName,
        strategy: "Github"
      });
      newUser.save(() => {
        return done(null, newUser);
      });
      passport.serializeUser(function (user, done) {
        console.log("serialize", user, user.id);
        done(null, user.id);
      });
    });
  }
));

passport.deserializeUser(function (id, done) {
  console.log("deserialize");
  User.findOne({_id: id}, function (err, user) {
    console.log(id, user);
    if (!user) {
      User.findOne({id: id}, function (err, externalUser) {
        console.log(id, externalUser);
        done(err, externalUser);
      });
    }
  });
});

app.get('/login', (req, res) => {
  res.status(200).send('login plz');
});

app.post('/auth/local', jsonParser,
  passport.authenticate('local', {
      successRedirect: '/',
      failureRedirect: '/login',
    }
  )
);

app.get('/auth/facebook', passport.authenticate('facebook', {
  failureRedirect: 'login'
}));

app.get('/auth/facebook/callback',
  passport.authenticate('facebook', {failureRedirect: '/login'}),
  (req, res) => {
    User.findOne({id: req.session.passport.user}, (err, user) => {
      if (err) {
        res.send(err);
      }
      res.send(user);
    });
  }
);

app.get('/auth/github', passport.authenticate('github', {
  scope: ['user:email']
}));

app.get('/auth/github/callback',
  passport.authenticate('github', {failureRedirect: '/login'}),
  (req, res) => {
    User.findOne({id: req.session.passport.user}, (err, user) => {
      if (err) {
        res.send(err);
      }
      res.send(user);
    });
  }
);


app.post('/user', jsonParser, (req, res) => {
  User.findOne({email: req.body.email}, (err, doc) => {
    if (doc) {
      res.status(403).send({
        error: 'email overlaped!'
      });
      return;
    }

    let user = new User();
    user.email = req.body.email;
    user.password = req.body.password;
    user.nickname = req.body.nickname;
    console.log('NEW USER: ' + user);

    user.save((err) => {
      if (err) {
        console.log(err);
        res.status(500).send({
          error: 'data save failure'
        });
      }
      res.status(201).send(user);
    });
  });
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

//get picture's info from mongodb
app.get('/', (req, res) => {
  if (!req.session.passport) {
    res.redirect('/login');
  } else {
    console.log('SESSION: ', req.session.passport.user);
    Image.find({author: req.session.passport.user}, (err, doc) => {
      res.status(200).json(doc);
    });
  }
});

//file upload(post)
app.post('/image', (req, res) => {
  if (!req.session.passport) {
    res.redirect('/login');
  } else {
    let form = new formidable.IncomingForm();
    let responseBody;
    let fileName = utils.guid();
    form.parse(req, (err, fields, files) => {
      utils.logFileInfo(fields, files);

      let image = new Image();
      utils.setImageData(image, fields, files, req);
      responseBody = [image];

      //make thumbnailImg
      gm(image.image_path)
        .thumb(100, 100, 'uploads/' + fileName + '_thumb.jpg', (err) => {
          if (err) console.error(err);
          else console.log('done - thumb');
        });

      //db save
      image.save((err) => {
        if (err) {
          console.log(err);
          res.status(500).send({
            error: 'data save failure'
          });
        }
        res.status(201).json(responseBody);
      });
    });
    form.on('fileBegin', (name, file) => {
      file.path = __dirname + '/uploads/' + fileName + '.jpg';
    });
    form.on('progress', (bytesReceived, bytesExpected) => {
      console.log(bytesReceived + '/' + bytesExpected);
    });
  }
});

//get a image file
app.get('/image/:image_path', (req, res) => {
  let filePath = req.params.image_path;
  res.status(200).sendFile(__dirname + '/uploads/' + filePath + '.jpg');
});

//delete a image file
app.delete('/image/:image_id', (req, res) => {
  Image.findOne({_id: req.params.image_id}, (err, doc) => {
    if (!req.session.passport) {
      res.redirect('/login');
    } else if (doc.author !== req.session.passport.user) {
      res.redirect('/login');
    } else {
      let imageName = doc.image_path.split('.')[0];
      console.log(imageName);

      del([imageName + '.jpg']).then((paths) => {
        console.log('Deleted files and folders:\n', paths.join('\n'));
      });
      del([imageName + '_thumb.jpg']).then((paths) => {
        console.log('Deleted files and folders:\n', paths.join('\n'));
      });

      Image.remove({_id: req.params.image_id}, function (err) {
        res.status(200).json(doc);
      });
    }
  });
});

//update a image file
app.put('/image/:image_id', (req, res) => {
  Image.findOne({_id: req.params.image_id}, (err, doc) => {
    if (!req.session.passport) {
      res.redirect('/login');
    } else if (doc.author !== req.session.passport.user) {
      res.redirect('/login');
    } else {
      let form = new formidable.IncomingForm();
      let responseBody;
      let fileName = doc.image_path.split('.')[0];

      form.parse(req, function (err, fields, files) {
        utils.logFileInfo(fields, files);

        let image = new Image();
        utils.setImageData(image, fields, files, req);
        responseBody = [image];

        //make thumbnailImg
        gm(image.image_path)
          .thumb(100, 100, fileName + '_thumb.jpg', function (err) {
            if (err) console.error(err);
            else console.log('done - thumb');
          });

        Image.findOneAndUpdate({_id: req.params.image_id}, {
          $set: {
            image_title: image.image_title,
            image_desc: image.image_desc
          }
        }, (err, doc) => {
          res.status(200).json(image);
        });
      });

      form.on('fileBegin', (name, file) => {
        file.path = fileName + '.jpg';
      });

      form.on('progress', (bytesReceived, bytesExpected) => {
        console.log(bytesReceived + '/' + bytesExpected);
      });
    }

  });
});

app.use((req, res) => {
  res.type('text/plain');
  res.status('404');
  res.send('404 - Not Found');
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.type('text/plain');
  res.status('500');
  res.send('500 - Server Error');
});

app.listen(app.get('port'), () => {
  console.log('Express started on http://localhost:' +
    app.get('port') + '; press Ctrl-C to terminate.');
});
