module.exports.makeImageDao = (mongoose) => {
  const Schema = mongoose.Schema;

  const imageSchema = new Schema({
      image_title: String,
      image_desc: String,
      author: String,
      image_path: String
  }, {
      collection: 'image'
  });

  return mongoose.model('image', imageSchema);
}

module.exports.makeUserDao = (mongoose) => {
    const Schema = mongoose.Schema;

    const userSchema = new Schema({
        email: String,
        password: String,
        nickname: String
    }, {
        conllection: 'user'
    });
    return mongoose.model('user', userSchema);
}