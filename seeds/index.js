const mongoose = require('mongoose');
const Campground =  require('../models/campground.js');
const cities = require('./cities');
const { places, descriptors } = require('./seedHelpers');


mongoose.connect('mongodb://localhost:27017/yelp-camp'), {
  iseNewUrlParser: true,
  useCreateIndex: true,
  useUnifiedTopology: true
}

const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
  console.log("Database connected");
});

const sample = array => array[Math.floor(Math.random() * array.length)];


const seedDB = async () => {
  await Campground.deleteMany({});
  for(let i = 0; i < 200 ; i++){
    const random1000 = Math.floor(Math.random() * 1000);
    const price = Math.floor(Math.random() * 20) + 10;
    const camp = new Campground({
      author: '603a9c397716092df0dcee37',
      location: `${cities[random1000].city}, ${cities[random1000].state}`,
      title: `${sample(descriptors)} ${sample(places)}`,
      description: 'Lorem ipsum dolor sit amet consectetur adipisicing elit. Et harum, sit libero voluptatem rerum neque adipisci quisquam sapiente delectus odio doloremque placeat autem dolorum aliquam ducimus quaerat error deleniti ullam.',
      price,
      geometry:{
        coordinates: [cities[random1000].longitude, cities[random1000].latitude],
        type: "Point"
      },
      images: [
        {
          url: 'https://res.cloudinary.com/anmol17/image/upload/v1614531300/adventure-app/wjidejrfqawkl7yd57hw.jpg',
          filename: 'adventure-app/wjidejrfqawkl7yd57hw'
        },
        {
          url: 'https://res.cloudinary.com/anmol17/image/upload/v1614531299/adventure-app/vrrodj8hm3gurlbtxsw3.jpg',
          filename: 'adventure-app/vrrodj8hm3gurlbtxsw3'
        }
      ]
    })
    await camp.save();
  }
}

seedDB().then(() => {
  mongoose.connection.close();
})
