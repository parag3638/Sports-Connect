const { date } = require('joi');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const reviewSchema = new Schema({
  author:{
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  campground: {
    type: Schema.Types.ObjectId,
    ref: 'Campground'
  },
  amount: Number,
  seats: Number,
  date: String,
  time: String,
});


module.exports = mongoose.model('Review', reviewSchema);