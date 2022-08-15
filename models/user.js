const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const passportLocalMongoose = require('passport-local-mongoose');
const Review = require('./review');

const UserSchema = new Schema({
  email:{
    type:String,
    required: true,
    unique: true
  },
  bookings: [
    {
      date: String,
      time: String,
      seats: Number
    }
  ]
});
UserSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model('User', UserSchema);