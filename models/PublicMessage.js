
const mongoose = require("mongoose");

const publicMessageSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
    },
    userName: {
        type: String,
        required: true
    },
    text: {
        type: String,
        required: true,
        maxlength: 5000
    },
    role: {
        type: String,
        enum: ["user", "assistant"],
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model(
    "PublicMessage",
    publicMessageSchema
);
