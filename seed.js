require("dotenv").config();

const mongoose = require("mongoose");
const Property = require("./models/Property");

const sampleProperties = [
    {
        title: "Modern Luxury Apartment",
        location: "Janakpuri, New Delhi",
        price: 7500000,
        bedrooms: 3,
        area: 1450,
        image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800"
    },
    {
        title: "Beautiful Family Home",
        location: "Dwarka, New Delhi",
        price: 9500000,
        bedrooms: 3,
        area: 1800,
        image: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800"
    },
    {
        title: "Elegant Modern Villa",
        location: "Gurugram, Haryana",
        price: 12000000,
        bedrooms: 4,
        area: 2200,
        image: "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=800"
    }
];

async function seedDatabase() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("MongoDB connected!");

        const count = await Property.countDocuments();

        if (count === 0) {
            await Property.insertMany(sampleProperties);
            console.log("Sample properties added!");
        } else {
            console.log("Properties already exist. No new data added.");
        }
    } catch (error) {
        console.error("Seeding error:", error.message);
    } finally {
        await mongoose.disconnect();
    }
}

seedDatabase();