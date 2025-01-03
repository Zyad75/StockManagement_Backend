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
      !req.files
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
      // si il n y as pas de produits
      return res.status(400).json({ message: "  Stock is empty" });
    }
    res.json(productsList); // tableau contenant tout les produits
  } catch (error) {
    console.log(error);
  }
});

//------ Route put pour update les infos du produit (changement de quantité ou de photo) -------//

app.put("/update/:id", fileUpload(), async (req, res) => {
  try {
    console.log("route : PUT /update/:id");
    console.log("req.params =>", req.params);
    console.log("req.body =>", req.body);
    if (
      req.params.id &&
      (req.body.price || req.files.image || req.body.quantity)
    ) {
      // si l'id et les informations à modifier ont bien été transmis
      const product = await Product.findById(req.params.id);
      if (!product) {
        return res.json({ message: "error, product not found" });
      }
      // On modifie les clés pour l'objet "product" trouvé :
      if (req.body.price) {
        product.price = req.body.price;
      }
      if (req.body.quantity) {
        product.quantity = req.body.quantity;
      }
      if (req.files) {
        product.image = req.files.image;
      }
      // on sauvegarde les modifications en BDD :
      await product.save();

      // On retourne le document "product" :
      res.status(200).json(product);
    } else {
      return res.status(400).json({ message: "Missing parameter" });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
});
//----------- Route pour supprimer un produit -----------------//
app.delete("/delete/:id", async (req, res) => {
  try {
    if (req.params.id) {
      // si l'id a bien été transmis

      // On recherche le "Product" à modifier à partir de son id et on le supprime :
      const productToDelete = await Product.findByIdAndDelete(req.params.id);

      // reponse si il n'y a pas de produit répertorié ayant cet ID
      if (!productToDelete) {
        return res
          .status(400)
          .json({ message: "Error, product doesn't exists !" });
      }
      // On répond au client :
      res.json({ message: "Product removed" });
    } else {
      return res.status(400).json({ messsage: "Missing id on params" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.all("*", (req, res) => {
  res.status(404).json({ error: "all route" });
});
app.listen(3000, () => {
  console.log("Server Started 🩲");
});
