const Joi = require('joi');

module.exports.campgroundSchema = Joi.object({
  campground: Joi.object({
    title: Joi.string().required(),
    price: Joi.number().required().min(0),
    //image: Joi.string().required(),
    location: Joi.string().required(),
    seats: Joi.number().required(),
    description: Joi.string().required(),
  }).required(),
  deleteImages: Joi.array()
});

module.exports.reviewSchema = Joi.object({
  review: Joi.object({
    amount: Joi.number().required(),
    date: Joi.string().required(),
    seats: Joi.number().required(),
    time: Joi.string().required(),
  }).required()
});
