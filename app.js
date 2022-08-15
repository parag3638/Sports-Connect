if (process.env.NODE_ENV !== "production"){
  require('dotenv').config();
}

const express = require('express');
const app = express();
const path = require('path');
const mongoose = require('mongoose');
const Joi = require('joi');
const {campgroundSchema, reviewSchema} = require('./schemas.js');
const ejsMate = require('ejs-mate');
const catchAsync = require('./utils/catchAsync');
const flash = require('connect-flash');
const ExpressError = require('./utils/ExpressError');
const session = require('express-session');
const Campground =  require('./models/campground.js');
const methodOverride = require('method-override');
const Review = require('./models/review.js');
const User = require('./models/user.js');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const {isLoggedIn, isAuthor, validateCampground, validateReview, isReviewAuthor} = require('./middleware');
const multer = require('multer');
const {storage, cloudinary} = require('./cloudinary');
const upload = multer({ storage });
const mbxGeocoding = require("@mapbox/mapbox-sdk/services/geocoding");
const mapBoxToken = process.env.MAPBOX_TOKEN;
const geocoder = mbxGeocoding({accessToken: mapBoxToken});


//const campgrounds = ('./routes/campgrounds');, 

mongoose.connect('mongodb://localhost:27017/yelp-camp'), {
  useNewUrlParser: true,
  useCreateIndex: true,
  useUnifiedTopology: true,
  useFindAndModify: false
}

const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
  console.log("Database connected");
});

app.use(methodOverride('_method'))
app.use(express.urlencoded({extended: true}));
app.use(express.json());
app.engine('ejs', ejsMate);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));

const sessionConfig = {
  secret: 'thisshouldbeabettersecret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    expires: Date.now() + 1000*60*60*27*7,
    maxAge: 1000*60*60*27*7,
    secure: false
  }
}
app.use(session(sessionConfig));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());






//app.use('/campgrounds', campgrounds);


app.use((req, res, next) => {
  //console.log(req.session);
  res.locals.currentUser = req.user;
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  next();
});

app.get('/', (req, res) =>{
  res.render('home');
});

app.get('/register', (req, res) => {
  res.render('users/register');
});

app.get('/payment', (req, res) =>{
  res.render('campgrounds/payment');
});

app.get('/profile', catchAsync(async (req, res) => {
  const user = req.user;
  res.render('campgrounds/profile', {user});
}));

app.post('/register', catchAsync(async (req, res, next) => {
  try {
    const {email, username, password} = req.body;
    const user = new User({email, username});
    const registeredUser = await User.register(user, password);
    req.login(registeredUser, err => {
      if(err) return next(err);
      req.flash('success', 'Welcome to Sports Connect');
      res.redirect('/campgrounds');
    });
  } catch(e){
    req.flash('error', e.message);
    res.redirect('/register');
  } 
}));

app.get('/login', (req, res) => {
  res.render('users/login');
});

app.post('/login', passport.authenticate('local', {failureFlash: true, failureRedirect:'/login'}),  (req, res) => {
  req.flash('success', 'Successfully logged in!');
  const redirectUrl = req.session.returnTo || '/campgrounds'; 
  delete req.session.returnTo;
  res.redirect(redirectUrl);
});

app.get('/logout', (req, res) =>{
  req.logout();
  req.flash('success', 'Successfully logged out!');
  res.redirect('/campgrounds');
})

app.get('/campgrounds', catchAsync(async (req, res) => {
  const campground = await Campground.find({});
  res.render('campgrounds/index', { campground });
}));

app.get('/campgrounds/new', isLoggedIn, (req, res) => {
  res.render('campgrounds/new');
});

app.post('/campgrounds', isLoggedIn, upload.array('image'), validateCampground,  catchAsync(async (req, res, next) => {
  //if(!req.body.campground) throw new ExpressError('Invalid Campground data', 400);
  const geoData = await geocoder.forwardGeocode({
    query: req.body.campground.location,
    limit: 1
  }).send()
  const campground = new Campground(req.body.campground);
  campground.geometry = geoData.body.features[0].geometry;
  campground.images =req.files.map(f => ({
    url: f.path,
    filename: f.filename
  }));
  campground.author = req.user._id;
  await campground.save();
  console.log(campground);
  req.flash('success', 'Successfully added a new facility!');
  res.redirect(`/campgrounds/${campground._id}`);
}));

/*app.post('/campgrounds', upload.array('image'), (req, res) => {
  console.log(req.body, req.files);
  res.send("IT WORKED!");
})*/

app.get('/campgrounds/:id', catchAsync(async (req, res) => {
  const campground = await Campground.findById(req.params.id).populate({
    path:'reviews',
    populate: {
      path:'author'
    }
  }).populate('author');
  if(!campground){
    req.flash('error', 'Cannot find that facility!');
    return res.redirect('/campgrounds');
  }
  res.render('campgrounds/show', { campground});
}));

app.get('/campgrounds/:id/edit', isLoggedIn, isAuthor, catchAsync(async (req, res) => {
  const {id} = req.params;
  const campground = await Campground.findById(id);
  if(!campground){
    req.flash('error', 'Cannot find that facility!');
    return res.redirect('/campgrounds');
  }
  res.render('campgrounds/edit', { campground });
}));

app.put('/campgrounds/:id', isLoggedIn, isAuthor, upload.array('image'), validateCampground, catchAsync(async (req, res) => {
  const {id} = req.params;
  const campground = await Campground.findByIdAndUpdate(id, { ...req.body.campground }, {new:true});
  const imgs = req.files.map(f => ({
    url: f.path,
    filename: f.filename
  }));
  campground.images.push(...imgs);
  await campground.save();
  if(req.body.deleteImages){
    for(let filename of req.body.deleteImages){
      await cloudinary.uploader.destroy(filename);
    }
    /*await campground.updateOne({$pull: {images: {filename: {$in: req.body.deleteImages}}}});*/
  }
  req.flash('success', 'Successfully updated a facility!');
  res.redirect(`/campgrounds/${campground._id}`);
}));

app.delete('/campgrounds/:id', isLoggedIn, isAuthor, catchAsync(async (req, res) => {
  const {id} = req.params;
  await Campground.findByIdAndDelete(id);
  req.flash('success', 'Successfully deleted a facility');
  res.redirect('/campgrounds');
}))

app.get('/campgrounds/:id/book', isLoggedIn, catchAsync(async (req, res) => {
  const campground = await Campground.findById(req.params.id);
  res.render('campgrounds/book', {campground});
}));



app.post('/campgrounds/:id/book/reviews', isLoggedIn, validateReview, catchAsync(async (req, res) => {
  var flag = 1;
  const campground = await Campground.findById(req.params.id);
  await User.findById(req.user.id,function(err, founduser){
    if(err){
      console.log(err)
    } else{
      founduser.bookings.forEach(function(element){
        console.log(element);
        if(element.date == req.body.review.date){
          if(element.time == req.body.review.time){
            console.log('found it');
            console.log(element.date);
            console.log(element.time);
            flag = 0;
            
          }
        }
      })
    }
  })
  console.log(flag);
  if(flag == 1){

  
  const rev = {
            date: req.body.review.date,
            time: req.body.review.time,
            seats: req.body.review.seats
            }
  User.findById(req.user.id,function(err, founduser){
            if(err){
                console.log(err)
            } else{
                founduser.bookings.push(rev);
                founduser.save();
                console.log(founduser);
              }
          });
  const review = new Review(req.body.review);
  review.author = req.user._id;
  campground.reviews.push(review);
  await review.save();
  await campground.save();
  req.flash('success', 'Successfully booked your slot!, now please complete your payment');
  }
  
  res.redirect(`/campgrounds/${campground._id}`);
}))


app.delete('/campgrounds/:id/book/reviews/:reviewId', isLoggedIn, isReviewAuthor, catchAsync(async (req, res) => {
  const { id, reviewId } = req.params;
  await Campground.findByIdAndUpdate(id, {$pull: {reviews: reviewId}});
  await Review.findByIdAndDelete(reviewId);
  req.flash('success', 'Successfully deleted your booking');
  res.redirect(`/campgrounds/${id}`);
}))

app.all('*', (req, res, next) => {
  next(new ExpressError('Page Not Found', 404));
})

app.use((err, req, res, next) => {
  const { statusCode = 500} = err;
  if(!err.message) err.message = 'Oh no something went wrong!';
  res.status(statusCode).render('error', {err});
});




app.listen(5000, () =>{
  console.log('Serving on port localhost:5000');
})

