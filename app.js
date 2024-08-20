if(process.env.NOSW_ENV != "production"){
    require('dotenv').config();
}

const express = require('express');
const app = express();
const mongoose = require("mongoose");
const Listing = require("./models/listing.js");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const wrapAsync = require("./utils/wrapAsync.js");
const ExpressError = require("./utils/ExpressError.js");
const {listingSchema , reviewSchema} = require("./schema.js");
const Review = require("./models/review.js");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const flash = require("connect-flash");


const passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require("./models/user.js");

const listingRouter = require("./routes/listing.js");
const userRouter = require("./routes/user.js");

const { register } = require('module');
const { isLoggedIn, isReviewAuthor } = require('./middleware.js');

// const MONGO_URL = "mongodb://127.0.0.1:27017/wanderlust"
const dbUrl = process.env.ATLASDB_URL

main()
    .then(()=>{
        console.log("connected to data base");
    })
    .catch((err)=>{
        console.log(err);
    });

async function main(){
    await mongoose.connect(dbUrl);
}

app.set("view engine","ejs");
app.set("views",path.join(__dirname,"views"));
app.use(express.urlencoded({extended:true}));
app.use(methodOverride("_method"));
app.engine('ejs', ejsMate);
app.use(express.static(path.join(__dirname, "/public")));

const store = MongoStore.create({
    mongoUrl: dbUrl,
    crypto:{
        secret : process.env.SECRET,
    },
    touchAfter: 24*3600,
});

store.on("error",()=>{
    console.log("ERROR IN MONGO SESSEION STORE",err);
});

const sessionOption = {
    store,
    secret : process.env.SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
        maxAge: 7 * 24 * 60 * 60 * 1000,
    },
};

// app.get("/",(req,res)=>{
//     res.send("root is working")
// });


app.use(session(sessionOption));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


app.use((req,res,next)=>{
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    res.locals.currUser= req.user;
    // console.log(res.locals.success);
    next();
});

// app.get("/demouser",async(req,res)=>{
//     let fakeUser = new User({
//         email: "student@gmail.com",
//         username: "delta-student"
//     });
//     let registeredUser = await User.register(fakeUser,"helloworld");
//     res.send(registeredUser);
    
// });

app.use("/Listings",listingRouter);
app.use("/",userRouter);


const validateReview = (req,res,next) =>{
    let {error} = reviewSchema.validate(req.body);
    console.log(req.body.review);
    if(error){
        let errMsg = error.details.map((el)=> el.message).join(",");
        throw new ExpressError(400, errMsg);
    }else{
        next();
    }
};

//review
//post route
app.post("/listings/:id/reviews",isLoggedIn, validateReview,wrapAsync(async(req,res)=>{
   let listing = await Listing.findById(req.params.id);
   let newReview = new Review(req.body.review);
    newReview.author = req.user._id;
    console.log(newReview);
   listing.reviews.push(newReview);

   await newReview.save();  
   await listing.save();
    req.flash("success","New Review Created");
   res.redirect(`/listings/${listing._id}`);
}));

// delete route 
app.delete("/listings/:id/reviews/:reviewId", isLoggedIn,isReviewAuthor,wrapAsync (async(req,res)=>{
    let {id, reviewId} = req.params;

    await Listing.findByIdAndUpdate(id , {$pull: {reviews: reviewId}});
    await Review.findByIdAndDelete(reviewId);
    req.flash("success","review Deleted!");

    res.redirect(`/listings/${id}`);
}))

app.all("*",(req,res,next)=>{
    next(new ExpressError(404,"page Not Found!"));
});
//expreserr
app.use((err, req, res, next) =>{
    let {statusCode=500, message="SOMETHING WENT WRONG!"} = err;
    // res.status(statusCode).send(message);
    res.render("error.ejs", {err});
    // res.status(statusCode).render("error.ejs",{message});
});


app.listen(8080,()=>{
    console.log("listening at port 8080");
});