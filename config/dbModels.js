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
