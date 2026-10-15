const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

require("dotenv").config();

const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const Property = require("./models/Property");
const User = require("./models/User");
const bcrypt = require("bcrypt");
const session = require("express-session");
const MongoStore = require("connect-mongo").default;

const app = express();
const PORT = 3000;

// Session configuration
app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        store: MongoStore.create({
            mongoUrl: process.env.MONGODB_URI
        }),
        cookie: {
            httpOnly: true,
            maxAge: 1000 * 60 * 60 * 24
        }
    })
);

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));

// Show registration page
app.get("/register", (req, res) => {
    res.render("register");
});

// Show login page
app.get("/login", (req, res) => {
    console.log("LOGIN ROUTE HIT!");
    res.render("login");
});

// Show the Favourites page
app.get("/favourites", (req, res) => {
    res.render("favourites");
});

// Homepage: fetch properties from MongoDB
app.get("/", async (req, res) => {
    try {
        const { q, minPrice, maxPrice, bedrooms, sort, propertyType } = req.query;

        const filter = {};

        // Search title or location
        if (q && q.trim()) {
            filter.$or = [
                { title: { $regex: q.trim(), $options: "i" } },
                { location: { $regex: q.trim(), $options: "i" } }
            ];
        }

        // Budget filters (input is in lakhs; database price is in rupees)
        const min = Number(minPrice);
        const max = Number(maxPrice);

        if (minPrice !== undefined && minPrice !== "" &&
            Number.isFinite(min) && min >= 0) {
            filter.price = {
                ...filter.price,
                $gte: min * 100000
            };
        }
        if (maxPrice !== undefined && maxPrice !== "" &&
    Number.isFinite(max) && max >= 0) {
    filter.price = {
        ...filter.price,
        $lte: max * 100000
    };
}

        if (
    minPrice !== "" &&
    maxPrice !== "" &&
    minPrice !== undefined &&
    maxPrice !== undefined &&
    Number.isFinite(min) &&
    Number.isFinite(max) &&
    min > max
) {
    return res.status(400).send(
        "Minimum budget cannot exceed maximum budget."
    );
}

        // Bedroom filter
        if (["1", "2", "3", "4"].includes(bedrooms)) {
            filter.bedrooms = Number(bedrooms);
        }

        // Property type filter
        if (["Apartment", "Independent House", "Villa", "Commercial Property"].includes(propertyType)) {
            filter.propertyType = propertyType;
        }

        let sortOption = { createdAt: -1 };

if (sort === "priceLow") {
    sortOption = { price: 1 };
} else if (sort === "priceHigh") {
    sortOption = { price: -1 };
}

const properties = await Property.find(filter).sort(sortOption);
        res.render("index.ejs", {
    properties,
    q: q || "",
    minPrice: minPrice || "",
    maxPrice: maxPrice || "",
    bedrooms: bedrooms || "",
    sort: sort || "",
    propertyType: propertyType || ""
});

    } catch (err) {
        console.error(err);
        res.status(500).send("Error loading properties");
    }
});

// Show Add Property form
app.get("/properties/new", (req, res) => {
    res.render("new");
});

// Register a new user
app.post("/register", async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).send("All fields are required.");
        }

        if (password.length < 8) {
            return res.status(400).send(
                "Password must be at least 8 characters long."
            );
        }

        const normalizedEmail = email.trim().toLowerCase();

        const existingUser = await User.findOne({
            email: normalizedEmail
        });

        if (existingUser) {
            return res.status(409).send(
                "An account with this email already exists."
            );
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const user = await User.create({
            name: name.trim(),
            email: normalizedEmail,
            password: hashedPassword
        });

        req.session.userId = user._id.toString();

        res.redirect("/");
    } catch (error) {
        console.error("Registration error:", error);

        if (error.code === 11000) {
            return res.status(409).send(
                "An account with this email already exists."
            );
        }

        res.status(500).send("Unable to register. Please try again.");
    }
});

// Save new property in MongoDB
app.post("/properties", async (req, res) => {
    try {
        console.log("ADD PROPERTY ROUTE HIT!");
        console.log("Form data:", req.body);

        const newProperty = new Property({
            title: req.body.title,
            location: req.body.location,
            price: req.body.price,
            bedrooms: req.body.bedrooms,
            area: req.body.area,
            image: req.body.image,
            propertyType: req.body.propertyType
        });

        await newProperty.save();

        console.log("Property saved successfully!");
        res.redirect("/");
    } catch (error) {
        console.error("Error saving property:", error);
        res.status(500).send("Unable to add property: " + error.message);
    }
});

// Individual property details page
app.get("/properties/:id", async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(404).send("Property not found");
        }

        const property = await Property.findById(req.params.id);

        if (!property) {
            return res.status(404).send("Property not found");
        }

        res.render("show", { property });
    } catch (error) {
        console.error(error);
        res.status(500).send("Unable to load property");
    }
});

// Show Edit Property form
app.get("/properties/:id/edit", async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(404).send("Property not found");
        }

        const property = await Property.findById(req.params.id);

        if (!property) {
            return res.status(404).send("Property not found");
        }

        res.render("edit", { property });
    } catch (error) {
        console.error(error);
        res.status(500).send("Unable to load edit form");
    }
});

// Update property in MongoDB
app.post("/properties/:id/edit", async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(404).send("Property not found");
        }

        const { title, location, price, bedrooms, area, image } = req.body;

        const updatedProperty = await Property.findByIdAndUpdate(
            req.params.id,
            {
                title,
                location,
                price,
                bedrooms,
                area,
                image
            },
            {
                runValidators: true,
                new: true
            }
        );

        if (!updatedProperty) {
            return res.status(404).send("Property not found");
        }

        res.redirect(`/properties/${updatedProperty._id}`);
    } catch (error) {
        console.error("Error updating property:", error);
        res.status(500).send("Unable to update property: " + error.message);
    }
});

// Delete property from MongoDB
app.post("/properties/:id/delete", async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(404).send("Property not found");
        }

        const deletedProperty = await Property.findByIdAndDelete(
            req.params.id
        );

        if (!deletedProperty) {
            return res.status(404).send("Property not found");
        }

        res.redirect("/");
    } catch (error) {
        console.error("Error deleting property:", error);
        res.status(500).send("Unable to delete property");
    }
});

// Start server only after database connects
async function startServer() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("MongoDB connected successfully!");

        app.listen(PORT, () => {
            console.log(`Server running at http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error("Database connection failed:", error.message);
    }
}

startServer();