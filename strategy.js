/**
 * Created by Naver on 2017. 6. 5..
 */

module.exports.externalAuth = (req, accessToken, refreshToken, profile, done) => {
  console.log(profile);
  User.findOne({id: profile.id}, function (err, user) {
    if (user) {
      console.log('USER: ' + user);
      return done(null, user);
    } else {
      const newUser = new User({
        id: profile.id,
        nickname: profile.displayName,
        strategy: "Facebook"
      });

      console.log('new user: ', newUser);
      newUser.save(function () {
        return done(null, newUser); // 새로운 회원 생성 후 로그인
      });

      passport.serializeUser(function (user, done) {
        console.log("serialize", user, user.id);
        done(null, user.id);
      });
    }
  });
}