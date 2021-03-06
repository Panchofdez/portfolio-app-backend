const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Portfolio = mongoose.model("Portfolio");
const User = mongoose.model("User");
const requireAuth = require("../middleware/requireAuth");

// Multer Configuration
var multer = require("multer");
// Whenever the file gets uploaded we created a custom name for that file
var storage = multer.diskStorage({
  filename: function (req, file, callback) {
    callback(null, Date.now() + file.originalname);
  },
});
var imageFilter = function (req, file, cb) {
  // filter to accept image files only
  if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
    return cb(new Error("Only image files are allowed!"), false);
  }
  cb(null, true);
};
var upload = multer({ storage: storage, fileFilter: imageFilter });

// Cloudinary Configuration
var cloudinary = require("cloudinary");
cloudinary.config({
  cloud_name: "fdez",
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

router.use(requireAuth);

router.get("/", async (req, res) => {
  //Retrieves the user's portfolio and their recommendations
  try {
    let portfolio = await Portfolio.findOne({ userId: req.user._id });
    if (portfolio) {
      await portfolio
        .populate("comments")
        .populate("recommendations", "portfolio profileImage name")
        .execPopulate();
    }
    const response = await formatPortfolioObject(portfolio);
    return res.status(200).json(response);
  } catch (err) {
    console.log(err);
    return res.status(400).send({ error: err.message });
  }
});

router.post("/timeline", async (req, res) => {
  //Add's a post to a user's timeline
  try {
    const portfolio = await Portfolio.findOne({ userId: req.user._id });
    await portfolio
      .populate("comments")
      .populate("recommendations", "portfolio profileImage name")
      .execPopulate();
    portfolio.timeline.push(req.body.post);
    await portfolio.save();
    const response = await formatPortfolioObject(portfolio);
    return res.status(200).send(response);
  } catch (err) {
    return res.status(400).send({ error: err.message });
  }
});

router.put("/timeline/:id", async (req, res) => {
  //updates a user's particular post in their timeline
  try {
    const portfolio = await Portfolio.findOne({ userId: req.user._id });
    await portfolio
      .populate("comments")
      .populate("recommendations", "portfolio profileImage name")
      .execPopulate();
    const newTimeline = portfolio.timeline.map((post) => {
      if (post._id == req.params.id) {
        post = req.body.post;
      }
      return post;
    });
    portfolio.timeline = newTimeline;
    await portfolio.save();
    const response = await formatPortfolioObject(portfolio);
    return res.status(200).send(response);
  } catch (err) {
    return res.status(400).send({ error: err.message });
  }
});

router.delete("/timeline/:id", async (req, res) => {
  //deletes a post from the timeline
  try {
    const portfolio = await Portfolio.findOne({ userId: req.user._id });
    await portfolio
      .populate("comments")
      .populate("recommendations", "portfolio profileImage name")
      .execPopulate();
    const timeline = portfolio.timeline.filter(
      (post) => post._id != req.params.id
    );
    portfolio.timeline = timeline;
    await portfolio.save();
    const response = await formatPortfolioObject(portfolio);
    return res.status(200).send(response);
  } catch (err) {
    return res.status(400).send({ error: err.message });
  }
});

router.post("/videos", async (req, res) => {
  // Adds a video to a user's portfolio
  try {
    const portfolio = await Portfolio.findOne({ userId: req.user._id });
    await portfolio
      .populate("comments")
      .populate("recommendations", "portfolio profileImage name")
      .execPopulate();
    portfolio.videos.push(req.body.video);
    await portfolio.save();
    const response = await formatPortfolioObject(portfolio);
    return res.status(200).send(response);
  } catch (err) {
    return res.status(400).send({ error: err.message });
  }
});

router.put("/videos/:id", async (req, res) => {
  //updates a video
  try {
    const { title, description, link } = req.body;
    const portfolio = await Portfolio.findOne({ userId: req.user._id });
    await portfolio
      .populate("comments")
      .populate("recommendations", "portfolio profileImage name")
      .execPopulate();
    const videos = portfolio.videos.map((video) => {
      if (video._id == req.params.id) {
        video.title = title;
        video.description = description;
        video.link = link;
      }
      return video;
    });
    portfolio.videos = videos;
    await portfolio.save();
    const response = await formatPortfolioObject(portfolio);
    return res.status(200).send(response);
  } catch (err) {
    return res.status(400).send({ error: err.message });
  }
});

router.delete("/videos/:id", async (req, res) => {
  //deletes a video
  try {
    const portfolio = await Portfolio.findOne({ userId: req.user._id });
    await portfolio
      .populate("comments")
      .populate("recommendations", "portfolio profileImage name")
      .execPopulate();
    const videos = portfolio.videos.filter(
      (video) => video._id != req.params.id
    );
    portfolio.videos = videos;
    await portfolio.save();
    const response = await formatPortfolioObject(portfolio);
    return res.status(200).send(response);
  } catch (err) {
    return res.status(400).send({ error: err.message });
  }
});

router.post("/collections", async (req, res) => {
  // Add's a collection of photos a user's portfolio to showcase their projects
  try {
    const { image, imageId, title, description } = req.body;
    const photos = [];
    if (image) {
      photos.push({
        image,
        imageId,
      });
    }
    const portfolio = await Portfolio.findOne({ userId: req.user._id });
    await portfolio
      .populate("comments")
      .populate("recommendations", "portfolio profileImage name")
      .execPopulate();
    portfolio.collections.push({ title, description, photos });
    await portfolio.save();
    const response = await formatPortfolioObject(portfolio);
    return res.status(200).send(response);
  } catch (err) {
    return res.status(400).send({ error: err.message });
  }
});

router.delete("/collections/:id", async (req, res) => {
  //deletes an entire collection
  try {
    const portfolio = await Portfolio.findOne({ userId: req.user._id });
    await portfolio
      .populate("comments")
      .populate("recommendations", "portfolio profileImage name")
      .execPopulate();
    const collection = portfolio.collections.find(
      (collection) => collection._id == req.params.id
    );
    collection.photos.forEach(async (photo) => {
      try {
        await cloudinary.v2.uploader.destroy(photo.imageId);
      } catch (err) {
        throw Error(err);
      }
    });
    const collections = portfolio.collections.filter(
      (collection) => collection._id != req.params.id
    );
    portfolio.collections = collections;
    await portfolio.save();
    const response = await formatPortfolioObject(portfolio);
    return res.status(200).send(response);
  } catch (err) {
    return res.status(400).send({ error: err.message });
  }
});

router.delete("/collections/:id/photos/:photo_id", async (req, res) => {
  //deletes a particular photo from a collection
  try {
    const id = `panchofdez/${req.params.photo_id}`;
    const portfolio = await Portfolio.findOne({ userId: req.user._id });
    await portfolio
      .populate("comments")
      .populate("recommendations", "portfolio profileImage name")
      .execPopulate();
    const collections = portfolio.collections.map((collection) => {
      if (collection._id == req.params.id) {
        if (collection.photos.length === 1) {
          return res
            .status(400)
            .send({ error: "Collection must have at least one photo" });
        }
        collection.photos = collection.photos.filter(
          (photo) => photo.imageId != id
        );
      }
      return collection;
    });
    portfolio.collections = collections;
    await portfolio.save();
    await cloudinary.v2.uploader.destroy(`panchofdez/${req.params.photo_id}`);
    const response = await formatPortfolioObject(portfolio);
    return res.status(200).send(response);
  } catch (err) {
    return res.status(400).send({ error: err.message });
  }
});

router.put("/collections/:id", async (req, res) => {
  //updates a collection
  try {
    const { image, imageId, title, description } = req.body;
    const photos = [];
    if (image) {
      photos.push({
        image,
        imageId,
      });
    }
    const portfolio = await Portfolio.findOne({ userId: req.user._id });
    await portfolio
      .populate("comments")
      .populate("recommendations", "portfolio profileImage name")
      .execPopulate();
    const collections = portfolio.collections.map((collection) => {
      if (collection._id == req.params.id) {
        collection.title = title;
        collection.description = description;
        collection.photos = collection.photos.concat(photos);
      }
      return collection;
    });
    portfolio.collections = collections;
    await portfolio.save();
    const response = await formatPortfolioObject(portfolio);
    return res.status(200).send(response);
  } catch (err) {
    return res.status(400).send({ error: err.message });
  }
});

router.put("/contactinfo", async (req, res) => {
  //adds a user's contact information to their portfolio
  try {
    const { email, phone, facebook, instagram } = req.body;
    const portfolio = await Portfolio.findOne({ userId: req.user._id });
    await portfolio
      .populate("comments")
      .populate("recommendations", "portfolio profileImage name")
      .execPopulate();
    portfolio.email = email;
    portfolio.phone = phone;
    portfolio.facebook = facebook;
    portfolio.instagram = instagram;
    await portfolio.save();
    const response = await formatPortfolioObject(portfolio);
    return res.status(200).send(response);
  } catch (err) {
    return res.status(400).send({ error: err.message });
  }
});

router.post("/profile", async (req, res) => {
  //route to create a user's profile which consists of their name, profile picture and cover photo
  try {
    const user = await User.findById(req.user._id);
    user.profileImage = req.body.profileImage;
    const portfolio = new Portfolio({ userId: req.user._id, ...req.body });
    await portfolio.save();
    user.portfolio = portfolio._id;
    await user.save();
    const response = await formatPortfolioObject(portfolio);
    return res.status(200).send(response);
  } catch (err) {
    return res.status(400).send({ error: err.message });
  }
});

router.put("/profile", async (req, res) => {
  //updates a user's profile info
  try {
    const portfolio = await Portfolio.findOne({ userId: req.user._id });
    await portfolio
      .populate("comments")
      .populate("recommendations", "portfolio profileImage name")
      .execPopulate();
    const user = await User.findById(req.user._id);
    const {
      headerImage,
      headerImageId,
      name,
      profileImage,
      profileImageId,
    } = req.body;
    if (profileImage && profileImage !== portfolio.profileImage) {
      await cloudinary.v2.uploader.destroy(portfolio.profileImageId);
      portfolio.profileImage = profileImage;
      portfolio.profileImageId = profileImageId;
      user.profileImage = profileImage;
    }
    if (headerImage && headerImage !== portfolio.headerImage) {
      await cloudinary.v2.uploader.destroy(portfolio.headerImageId);
      portfolio.headerImage = headerImage;
      portfolio.headerImageId = headerImageId;
    }
    portfolio.name = name;
    await portfolio.save();
    await user.save();
    const response = await formatPortfolioObject(portfolio);
    return res.status(200).send(response);
  } catch (err) {
    return res.status(400).send({ error: err.message });
  }
});

router.put("/about", async (req, res) => {
  try {
    const { location, type, birthday, about } = req.body;
    const portfolio = await Portfolio.findOne({ userId: req.user._id });
    await portfolio
      .populate("comments")
      .populate("recommendations", "portfolio profileImage name")
      .execPopulate();
    portfolio.location = location;
    portfolio.type = type;
    portfolio.birthday = birthday;
    portfolio.about = about;
    await portfolio.save();
    const response = await formatPortfolioObject(portfolio);
    return res.status(200).send(response);
  } catch (err) {
    return res.status(400).send({ error: err.message });
  }
});

router.post("/skills", async (req, res) => {
  //creates a list of user's skills
  try {
    const portfolio = await Portfolio.findOne({ userId: req.user._id });
    portfolio.skills = req.body.skills;
    await portfolio.save();
    await portfolio
      .populate("comments")
      .populate("recommendations", "portfolio profileImage name")
      .execPopulate();
    const response = await formatPortfolioObject(portfolio);
    return res.status(200).send(response);
  } catch (err) {
    return res.status(400).send({ error: err.message });
  }
});

const formatPortfolioObject = async (portfolio) => {
  //adds user recommending info to the portfolio response object
  let user = await User.findById(portfolio.userId);
  await user
    .populate("recommending", "portfolio profileImage name")
    .execPopulate();
  return { ...portfolio.toObject(), recommending: [...user.recommending] };
};

module.exports = router;
