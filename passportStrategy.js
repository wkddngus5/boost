/**
 * Created by Naver on 2017. 6. 6..
 */
const LocalStrategy = require('passport-local').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;

module.exports.registStrategy = (User, passport) => {
  passport.serializeUser(function (user, done) {
    console.log('serialize', user);
    done(null, user._id);
  });

  passport.deserializeUser(function (id, done) {
    User.findOne({_id: id}, function (err, user) {
      console.log('deserialize', user);
      done(err, user);
    });
  });

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
        console.log(user);
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
      });
    }
  ));
}

