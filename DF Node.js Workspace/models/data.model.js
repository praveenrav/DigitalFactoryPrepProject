// Defining data dictionary schema:

const mongoose = require('mongoose');

var dataSchema = new mongoose.Schema({
    category: {
        type: String,
        required: true,
    },
    id: {
        type: String,
        required: true,
    },
    deviceUUID: {
        type: String,
        required: true,
    },
    name: {
        type: String,
        required: true,
        default: "null",
    },
    type: {
        type: String,
        required: true,
        default: "null",
    },
});

// var dataSchema = new mongoose.Schema({
//     category: {
//         type: String,
//         required: true,
//     },
//     id: {
//         type: String,
//         required: true,
//     },
//     deviceUUID: {
//         type: String,
//         required: true,
//     },
//     name: {
//         type: String,
//         required: true,
//         default: "null",
//     },
//     type: {
//         type: String,
//         required: true,
//         default: "null",
//     },
//     subtype: {
//         type: String,
//         required: true,
//         default: "null",
//     },
//     units: {
//         type: String,
//         required: true,
//         default: "null",
//     },
//     native_units: {
//         type: String,
//         required: true,
//         default: "null",
//     },
//     representation: {
//         type: String,
//         required: true,
//         default: "null",
//     },
//     sample_rate: {
//         type: String,
//         required: true,
//         default: "null",
//     },
//     native_scale: {
//         type: String,
//         required: true,
//         default: "null",
//     },
//     statistic: {
//         type: String,
//         required: true,
//         default: "null",
//     },

// });

const Data = mongoose.model('Data', dataSchema); // Registers the equipment dictionarys schema with Mongoose
module.exports = Data;