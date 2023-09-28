
const express = require('express');
const {allowInsecurePrototypeAccess} = require('@handlebars/allow-prototype-access');
const bodyparser = require('body-parser');
const fs = require('fs');
const app = express();
const mongoose = require('mongoose');

// Importing specs and UI options from swagger.js:
const { specs, swaggerUI } = require('./swagger');
const { getStatus, getVersion, writeData, readData, writeDataDict, readDataDict, writeEquipDict, readEquipDict } = require('./routes/routes');

// Loading package.json:
const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf-8'));
const version = packageJson.version;


// Configures middleware:
app.use(bodyparser.urlencoded({extended: false}));
app.use(bodyparser.json());

// Setting up swaggerUI:
app.use('/api/docs', swaggerUI.serve, swaggerUI.setup(specs));


// Configuring MongoDB position:
mongoose.connect(
    'mongodb://127.0.0.1:27017/DigFactDB', 
    { useNewUrlParser: true,
    useUnifiedTopology: true });


////// Endpoints //////

// Debug endpoint 1 - returning connection status:
app.get(`/${version}/api/status`, getStatus);

// Debug endpoint 2 - returning API version:
app.get(`/${version}/api/version`, getVersion);

// POST method to write commands to pass to the Influx Database:
app.post(`/${version}/api/data/write`, writeData);

// GET method to return all data associated with a particular measurement from the Influx Database:
app.get(`/${version}/api/data/read/:measurement`, readData);

// Writing data dictionaries to MongoDB database:
app.post(`/${version}/api/dataDictionary/write`, writeDataDict);

// Reading data dictionaries from MongoDB database:
app.get(`/${version}/api/dataDictionary/read`, readDataDict);

// Writing equipment dictionaries to MongoDB database:
app.post(`/${version}/api/equipmentDictionary/write`, writeEquipDict);

// Reading data dictionaries from MongoDB database:
app.get(`/${version}/api/equipmentDictionary/read`, readEquipDict);


// Exporting app to global module:
module.exports = app;


