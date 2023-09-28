// Defining equipment dictionary schema:

const mongoose = require('mongoose');

var equipmentSchema = new mongoose.Schema({
    deviceId: {
        type: String,
        required: true,
    },
    deviceName: {
        type: String,
        required: true,
    },
    deviceUUID: {
        type: String,
        required: true,
    },
    manufacturer: {
        type: String,
        required: true,
        default: "null",
    },
    model: {
        type: String,
        required: true,
        default: "null",
    },
    description: {
        type: String,
        required: true,
        default: "null",
    },
//     availability: {
//         type: String,
//         required: true,
//         default: "null",
//     },
//     emergencyStop: {
//         type: String,
//         required: true,
//         default: "null",
//     },
//     system: {
//         type: String,
//         required: true,
//         default: "null",
//     },
//     assetChanged: {
//         type: String,
//         required: true,
//         default: "null",
//     },
//     assetRemoved: {
//         type: String,
//         required: true,
//         default: "null",
//     },
});

const Equipment = mongoose.model('Equipment', equipmentSchema); // Registers the equipment dictionary schema with Mongoose
module.exports = Equipment;
