const express = require("express"); // import de express
const fileUpload = require("express-fileupload"); // import de express fileupload pour pour pouvoir transmettre des fichiers( images...) dans les requetes

const mongoose = require("mongoose"); // import de mongoose pour la gestion de DB
const cors = require("cors"); // cors pour accepter les requetes depuis n'importe ou
const app = express();
app.use(express.json());
app.use(cors());
require("dotenv").config(); // pour dissimuler les clés sensibles

mongoose.connect(process.env.MONGODB_URI);

//------- Partie Cloudinary avec configuration + fonction de conversion (pour obtenir une image sous forme d'url) -----//
const cloudinary = require("cloudinary").v2;
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

const convertToBase64 = (file) => {
  return `data:${file.mimetype};base64,${file.data.toString("base64")}`;
};

// ------  Model du produit à stocker en DB ---- //
const Product = mongoose.model("Product", {
  name: String,
  brand: String,
  price: Number,
  image: Object,
  quantity: Number,
});

//----------- Route post pour créer un produit et le stocker en DB -----------//
app.post("/create", fileUpload(), async (req, res) => {
  try {
    if (
      !req.body.name ||
      !req.body.price ||
      !req.body.brand ||
      !req.body.quantity ||
      !req.files.image
    ) {
      return res.status(400).json({ error: "missing parameters" });
    }
    console.log(req.body);
    const savedPicture = await cloudinary.uploader.upload(
      convertToBase64(req.files.image)
    );
    console.log(savedPicture);
    const existingProduct = await Product.findOne({
      name: req.body.name,
      brand: req.body.brand,
      image: savedPicture,
    });
    const existingProductImage = await Product.findOne({
      image: savedPicture,
    });
    const existingProductName = await Product.findOne({
      name: req.body.name,
    });
    if ((existingProduct || existingProductImage, existingProductName)) {
      return res.status(400).json({
        error:
          "This product is already repertoried in stock, you still can update the product quantity ",
      });
    }
    const newProduct = new Product({
      name: req.body.name,
      brand: req.body.brand,
      price: req.body.price,
      image: savedPicture,
      quantity: req.body.quantity,
    });
    await newProduct.save();
    res.json({ message: "Product successfuly created" });
  } catch (error) {
    console.log(error);
  }
});

//---------- Route get pour obtenir la liste de tout les produits ---------//

app.get("/products", async (req, res) => {
  try {
    const productsList = await Product.find();
    if (!productsList) {
      return res.status(400).json({ message: " Empty Stock" });
    }
    res.json(productsList);
  } catch (error) {
    console.log(error);
  }
});

app.all("*", (req, res) => {
  res.status(404).json({ error: "all route" });
});
app.listen(3000, () => {
  console.log("Server Started 🩲");
});
