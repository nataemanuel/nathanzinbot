const mongoose = require("mongoose");

// Sub-schema para a imagem para evitar problemas de _id automático e campos omitidos
const ImageSchema = new mongoose.Schema({
    data: {
        type: String,
        default: null
    },
    mimeType: {
        type: String,
        default: null
    }
}, { _id: false });

const MessageSchema = new mongoose.Schema({

    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    sessionId: {
        type: String,
        required: true
    },

    role: {
        type: String,
        enum: ["user", "assistant"],
        required: true
    },

    text: {
        type: String,
        default: ""
    },

    // ==========================================
    // IMAGEM
    // ==========================================

    image: {
        type: ImageSchema,
        default: () => ({ data: null, mimeType: null })
    }

}, {
    timestamps: true
});

module.exports = mongoose.model("Message", MessageSchema);