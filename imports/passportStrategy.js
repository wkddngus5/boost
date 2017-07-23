/**
 * Created by Naver on 2017. 6. 6..
 */
const LocalStrategy = require('passport-local').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const FacebookTokenStrategy = require('passport-facebook-token');
const GitHubStrategy = require('passport-github2').Strategy;
const NaverStrategy = require('passport-naver').Strategy;
const KakaoStrategy = require('passport-kakao').Strategy;

const passportConfig = {
  "Facebook" : {
    // "clientID": "1205484229581063",
    // "clientSecret": "b72acee0e4d17b2efa84ba31a68fdb37",
    // "callbackURL": "http://localhost:3000/auth/facebook/callback"
    "clientID": "1499173543594905",
    "clientSecret": "9590e04825dacb3276d185e02ea32574",
    "callbackURL": "http://ios-api.boostcamp.connect.or.kr/auth/facebook/callback"
  },
  "Github" : {
    "clientID": "4627328162362632d131",
    "clientSecret": "e0bc9e4821a986bd6d6ec9d696a45d3839043490",
    "callbackURL": "http://ios-api.boostcamp.connect.or.kr/auth/github/callback"
  },
  "Naver" : {
    "clientID": "91E614mhiq6MXcPa5Y_s",
    "clientSecret": "XsggPiublX",
    "callbackURL": "http://ios-api.boostcamp.connect.or.kr/auth/naver/callback"
  },
  "Kakao" : {
    "clientID" : "ecc044c6acb16f7c5ac466a774aa866e",
    "callbackURL" : "http://ios-api.boostcamp.connect.or.kr/auth/kakao/callback"
  }
}

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
  passport.use('facebook-token', new FacebookTokenStrategy({
      clientID        : passportConfig.Facebook.clientID,
      clientSecret    : passportConfig.Facebook.clientSecret
    },
    function(accessToken, refreshToken, profile, done) {

      var user = {
        'email': profile.emails[0].value,
        'name' : profile.name.givenName + ' ' + profile.name.familyName,
        'id'   : profile.id,
        'token': accessToken
      }

      // You can perform any necessary actions with your user at this point,
      // e.g. internal verification against a users table,
      // creating new user entries, etc.

      return done(null, user); // the user object we just made gets passed to the route's controller as `req.user`
    }
  ));

  // passport.use(new FacebookTokenStrategy({
  //   clientID: passportConfig.Facebook.clientID,
  //   clientSecret: passportConfig.Facebook.clientSecret
  // }, function (accessToken, refreshToken, profile, done) {
  //     console.log("====================");
  //     console.log('profile: ', profile);
  //     User.findOne({id: profile.id}, (err, user) => {
  //       if (user) {
  //         return done(err, user);
  //       }
  //       const newUser = new User({
  //         id: profile.id,
  //         nickname: profile.displayName,
  //         strategy: "Facebook"
  //       });
  //       newUser.save(() => {
  //         return done(null, newUser);
  //       });
  //     });
  //   }
  // ));

  passport.use(new FacebookStrategy({
      clientID: passportConfig.Facebook.clientID,
      clientSecret: passportConfig.Facebook.clientSecret,
      callbackURL: passportConfig.Facebook.callbackURL
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
      clientID: passportConfig.Github.clientID,
      clientSecret: passportConfig.Github.clientSecret,
      callbackURL: passportConfig.Github.callbackURL
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

  passport.use(new NaverStrategy({
      clientID: passportConfig.Naver.clientID,
      clientSecret: passportConfig.Naver.clientSecret,
      callbackURL: passportConfig.Naver.callbackURL // localhost 안먹음
      // http://forum.developers.naver.com/t/localhost/1020
    },
    function(accessToken, refreshToken, profile, done) {
      console.log('profile: ', profile);
      User.findOne({id: profile.id}, (err, user) => {
        if (user) {
          return done(err, user);
        }
        const newUser = new User({
          id: profile.id,
          nickname: profile.displayName,
          strategy: "Naver"
        });
        newUser.save(() => {
          return done(null, newUser);
        });
      });
    }
  ));

  passport.use(new KakaoStrategy({
      clientID : passportConfig.Kakao.clientID,
      callbackURL : passportConfig.Kakao.callbackURL
    },
    function(accessToken, refreshToken, profile, done) {
      console.log('profile: ', profile);
      User.findOne({id: profile.id}, (err, user) => {
        if (user) {
          return done(err, user);
        }
        const newUser = new User({
          id: profile.id,
          nickname: profile.displayName,
          strategy: "Kakao"
        });
        newUser.save(() => {
          return done(null, newUser);
        });
      });
    }
  ));
}
