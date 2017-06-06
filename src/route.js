var passport = require('passport');
var express = require('express');
var path = require('path');
var router = express.Router();

router.post('/login', passport.authenticate('local', {
    failureRedirect: '/',
  }), function (req, res) {
    res.redirect('/');
  });

router.get('/auth/facebook', passport.authenticate('facebook', {
    authType: 'rerequest', scope: ['public_profile', 'email'],
  }));
router.get('/auth/facebook/callback', passport.authenticate('facebook', { failureRedirect: '/' }), function (req, res) {
    res.redirect('/');
  });

module.exports = router;
