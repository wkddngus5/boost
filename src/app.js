'use strict';

const express = require('express');
const app = express();
const path = require('path');
const bodyParser = require('body-parser');
const jsonParser = bodyParser.json();
const importFilesPath = process.cwd();

const session = require('express-session');
const passport = require('passport');
const strategy = require(importFilesPath + '/passportStrategy');

const mongoose = require('mongoose');
const db = mongoose.connection;

const formidable = require('formidable');
const gm = require('gm');
const del = require('del');

const utils = require(importFilesPath + '/utils');
const dbModels = require(importFilesPath + '/dbModels');
const imageFinder = require(importFilesPath + '/imageFinder');
const imageUploader = require(importFilesPath + '/imageUploader');

const Image = dbModels.makeImageDao(mongoose);
const User = dbModels.makeUserDao(mongoose);

mongoose.Promise = require('bluebird');
mongoose.connect('mongodb://localhost:27017/BoostCamp');
db.on('error', console.error);
db.once('open', function () {
  console.log('Connected to mongod server');
});

app.set('port', process.env.PORT || 3000);

app.use(bodyParser.urlencoded({ extended: false }));

app.use(session({
  secret: 'keyboard cat',
  resave: true,
  saveUninitialized: true,
}));
app.use(passport.initialize());
app.use(passport.session());

strategy.registStrategy(User, passport);

//get all picture's info from mongodb
app.get('/', (req, res) => {
  imageFinder.findAll(req, res, Image);
});

app.post('/auth/local', jsonParser,
  passport.authenticate('local', {
      successRedirect: '/',
      failureRedirect: '/login',
    }
  )
);

app.get('/auth/facebook', passport.authenticate('facebook'));

app.get('/auth/facebook/callback',
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  (req, res) => {
    res.status(301).redirect('/');
  }
);

app.get('/auth/github', passport.authenticate('github', {
  scope: ['user:email'],
}));

app.get('/auth/github/callback',
  passport.authenticate('github', { failureRedirect: '/login' }),
  (req, res) => {
    res.redirect('/');
  }
);

app.get('/login', (req, res) => {
  res.status(200).send('login plz');
});

app.post('/user', jsonParser, (req, res) => {
  User.findOne({ email: req.body.email }, (err, doc) => {
    if (doc) {
      res.status(403).send({
        error: 'email overlaped!',
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
          error: 'data save failure',
        });
      }

      res.status(201).send(user);
    });
  });
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.status(301).redirect('/');
  });
});

//get own picture's info from mongodb
app.get('/image', (req, res) => {
  if (!req.session.passport) {
    res.status(301).redirect('/login');
  } else {
    console.log('SESSION: ', req.session.passport.user);
    Image.find({ author: req.session.passport.user }, (err, doc) => {
      res.status(200).json(doc);
    });
  }
});

//file upload(post)
app.post('/image', (req, res) => {
  imageUploader.imageUpload(req, res, Image);
});

//get a image file
app.get('/image/:image_name', (req, res) => {
  let fileName = req.params.image_name;
  res.status(200).sendFile(__dirname + '/uploads/' + fileName + '.jpg');
});

// delete a image file
app.delete('/image/:image_id', (req, res) => {
  imageUploader.imageDelete(req, res, Image);
});

//update a image file
app.put('/image/:image_id', (req, res) => {
  imageUploader.imageUpdate(req, res, Image);
});

app.use((req, res) => {
  res.type('text/plain');
  res.status('404');
  res.status(404).send('404 - Not Found');
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.type('text/plain');
  res.status('500');
  res.status(500).send('500 - Server Error');
});

app.listen(app.get('port'), () => {
  console.log('Express started on http://localhost:' +
    app.get('port') + '; press Ctrl-C to terminate.');
});