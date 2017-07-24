module.exports.makeImageDao = (mongoose) => {
  const Schema = mongoose.Schema;

  const imageSchema = new Schema({
      image_title: String,
      image_desc: String,
      author: String,
      author_nickname: String,
      image_url: String,
      thumb_image_url: String,
      image_path: String,
      created_at: Number
  }, {
      collection: 'image'
  });

  return mongoose.model('image', imageSchema);
}

module.exports.makeUserDao = (mongoose) => {
    const Schema = mongoose.Schema;

    const userSchema = new Schema({
        id: String,
        email: String,
        password: String,
        nickname: String,
        strategy: String
    }, {
        conllection: 'user'
    });

    return mongoose.model('user', userSchema);
}