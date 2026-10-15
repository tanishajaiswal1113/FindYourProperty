const mongoose = require("mongoose");

const propertySchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },

    location: {
        type: String,
        required: true
    },

    price: {
        type: Number,
        required: true
    },

    bedrooms: {
        type: Number,
        required: true
    },

    area: {
        type: Number,
        required: true
    },

    image: {
        type: String,
        required: false,
        default: ""
    },

    propertyType: {
        type: String,
        enum: [
            "Apartment",
            "Independent House",
            "Villa",
            "Commercial Property"
        ],
        default: "Apartment"
    }

}, {
    timestamps: true
});

module.exports = mongoose.model("Property", propertySchema);