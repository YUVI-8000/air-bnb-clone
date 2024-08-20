const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync.js");
const {listingSchema} = require("../schema.js");
const ExpressError = require("../utils/ExpressError.js");
const Listing = require("../models/listing.js");
const flash = require("connect-flash");
const {isLoggedIn , isOwner} = require("../middleware.js");
const listingController = require("../controllers/listing.js");
const multer = require('multer');
const {storage} = require("../cloudConfig.js");
const upload = multer({storage});


const validateListing = (req,res,next) =>{
    let {error} = listingSchema.validate(req.body);
    // console.log(result);
    if(error){
        let errMsg = error.details.map((el)=>el.message).join(",");
        throw new ExpressError(400, errMsg);
    }else{
        next();
    }
};

router
    .route("/")
    .get(wrapAsync(listingController.index))
        .post(
            isLoggedIn,
            upload.single("listing[image]"),
            validateListing,
            wrapAsync(listingController.createListing)
        );
        
// index route
// router.get("/",wrapAsync(listingController.index));
 
 //new route
 router.get("/new",isLoggedIn,listingController.renderNewForm);
 
 //show route
 router.get("/:id",wrapAsync(listingController.showListing));
 
 //create route
//  router.post(
//      "/",isLoggedIn,
//      validateListing,
//      wrapAsync(listingController.createListing)
//    );

 //edit route
 router.get("/:id/edit",isLoggedIn,wrapAsync(async(req,res)=>{
     let {id} = req.params;
     const listing = await Listing.findById(id);
     if(!listing){
        req.flash("error","Listing youu requestd does not exist!");
        res.redirect("/listings");
     }
     let originalImageUrl = listing.image.url;
     originalImageUrl.replace("/upload", "/upload/h_300,w_250");
     res.render("list/edit.ejs",{listing , originalImageUrl});
 }));
 
 //update route
 router.put("/:id",isLoggedIn,isOwner,upload.single("listing[image]"),validateListing,wrapAsync (async(req,res)=>{
    let {id} = req.params;
    let listing = await Listing.findByIdAndUpdate(id,{...req.body.listing});

    if(typeof req.file !== "undefined"){
        let url = req.file.path;
        let filename = req.file.filename;
        listing.image = {url,filename};
        await listing.save();
    }
    

    req.flash("success","Listing updated!");
    res.redirect("/listings");
 }));
 //delete route
 router.delete("/:id",isLoggedIn,isOwner,wrapAsync(async(req,res)=>{
     let {id} = req.params;
     let deletedListing = await Listing.findByIdAndDelete(id);
     console.log(deletedListing);
     req.flash("success","Listing Deleted!");
     res.redirect("/listings");
 }));

 //upload
//  router.post("/",upload.single("listing[image]"),(req,res)=>{
//     res.send(req.file);
//  });


module.exports = router;