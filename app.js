const mongoose = require("mongoose");
const debug = require("debug")("app:startup"); // for debugging my app
const express = require("express");
const config = require("config");
// const bodyParser = require("body-parser");
const log = require("morgan"); // autolog http request
const Joi = require("@hapi/joi"); // for validation
const bcrypt = require("bcrypt");

const app = express();
// middleware function
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public")); // for my static files

//configuration
config.get("name");
config.get("mail.host");
mongoose.set("useCreateIndex", true);

if (app.get("env") === "development") {
  app.use(log("tiny")); // logs my http request
  debug("morgan initialized.....");
}

// Db mongoose
mongoose
  .connect("mongodb://localhost/quickcredit", { useNewUrlParser: true }) // it returns a promise after connected
  .then(() => debug("connected to MongoDB")) // console.log after promised is fulfilled.
  .catch(err => debug("couldn't connect to MongoDB")); // catch an error if connection fails

const Person = mongoose.model(
  "Person",
  new mongoose.Schema({
    // the mongoose schema was used in the post req
    username: {
      // the structure of the document i want to save in my mongodb
      type: String,
      required: true,
      minlength: 5,
      maxlength: 50
    },
    email: {
      type: String,
      required: true,
      minlength: 5,
      maxlength: 255,
      unique: true
    },
    password: {
      type: String,
      required: true,
      minlength: 5,
      maxlength: 1024
    }
  })
);

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

app.get("/signup", (req, res) => {
  res.sendFile(__dirname + "/signup.html");
});

app.get("/login", (req, res) => {
  res.sendFile(__dirname + "/login.html");
});

//signup post endpoint starts here
app.post("/signup", (req, res) => {
  const result = validatePerson(req.body);
  if (result.error) {
    res.status(400).send(result.error.details[0].message);
    return;
  }

  async function createUser() {
    let user = await Person.findOne({ email: req.body.email });
    if (user) return res.status(400).send("User already registered.");

    user = new Person({
      username: req.body.username,
      email: req.body.email,
      password: req.body.password
    });
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(user.password, salt);

    await user.save();
    debug(user._id);
    res.send("<h1>Registered</h1>");
  }

  createUser();
  // use try and catch later in d future so that catch can solve unhandled promises
});

// Joi input validation function
function validatePerson(person) {
  // schema for the person object
  const schema = {
    username: Joi.string()
      .min(5)
      .max(50)
      .required(),
    email: Joi.string()
      .min(5)
      .max(250)
      .required()
      .email(),
    password: Joi.string() // npm install Joi-password-complexity can help to make the password more complex
      .min(5)
      .max(250)
      .required()
  };

  return Joi.validate(person, schema);
}

//login post endpoint starts from here
app.post("/login", (req, res) => {
  const result = authValidation(req.body);
  if (result.error) {
    res.status(400).send(result.error.details[0].message);
    return;
  }

  async function AuthUser() {
    let user = await Person.findOne({ email: req.body.email });
    if (!user) return res.status(400).send("Invalid email or password"); //User not available..Go and signup

    const validPassword = await bcrypt.compare(
      req.body.password,
      user.password
    ); // compare method returns a boolean
    if (!validPassword)
      return res.status(400).send("Invalid email or password"); //User not available..Go and signup
    res.send(true);
  }

  AuthUser();
});

// Joi input validation function
function authValidation(person) {
  // schema for the person object
  const schema = {
    email: Joi.string()
      .min(5)
      .max(250)
      .required()
      .email(),
    password: Joi.string() // npm install Joi-password-complexity can help to make the password more complex
      .min(5)
      .max(250)
      .required()
  };

  return Joi.validate(person, schema);
}


const port = process.env.PORT || 3000;
app.listen(port, () => {
  debug(`Listening on port ${port}.....`);
});
