const Listing = require("../models/listing");

module.exports.index = async(req,res)=>{
    const allListings = await Listing.find({});
    res.render("./list/index.ejs",{allListings});
 };

module.exports.renderNewForm = (req,res)=>{
    res.render("./list/new.ejs");
 };

module.exports.showListing = async (req,res)=>{
    
    let {id} = req.params;
    const listing = await Listing.findById(id)
   .populate({path: "reviews", populate: {path: "author",
       
   },
   }).populate("owner");
    if(!listing){
       req.flash("error","Listing you requested does not exist");
       res.redirect("/listings");
    }
   //  console.log(listing);
    res.render("./list/show.ejs",{listing});
};

module.exports.createListing = async (req, res, next) => {
    let url = req.file.path;
    let filename = req.file.filename;

    const newListing = new Listing(req.body.listing);
    newListing.owner = req.user._id;
    newListing.image = {url,filename};
    await newListing.save();
    req.flash("success","New Listing Created!");
    res.redirect("/listings");
  };