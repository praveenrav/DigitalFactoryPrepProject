
const fs = require('fs');

// Loading package.json:
const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf-8'));
const version = packageJson.version;

/**
 * @swagger
 * /{version}/api/status:
 *   get:
 *     summary: Get the API status.
 *     parameters:
 *       - name: status
 *         in: path
 *         required: true
 *         description: The API status.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successful connection.
 *         content:
 *           application/json:
 *             example:
 *               message: Success
 */


function getStatus(req, res) 
{
    res.status(200).json( {message: 'Successful connection.'} );
}


/**
 * @swagger
 * /{version}/api/version:
 *   get:
 *     summary: Get the API version.
 *     parameters:
 *       - name: version
 *         in: path
 *         required: true
 *         description: The API version.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successful connection.
 *         content:
 *           application/json:
 *             example:
 *               message: Success
 */


function getVersion(req, res)
{
    res.status(200).json( {version: `${version}`} );
}


// InfluxDB methods:

const { InfluxDB, Point } = require('@influxdata/influxdb-client');

// Defining InfluxDB Connection Details:
const influx = new InfluxDB({
    url: 'http://localhost:8086',
    token: 'SbQRJxPM1TgT796SfxPR7e3b6zM8Gmz63QFsMxcb3SFUS-WXMQP-G3Ig1ipHR4tAe7_jGITz0KnfV-BFGe7Lag==',
});


// Specifying InfluxDB org and bucket:
const org = 'CCAM_DF';
const bucket = 'CCAM_DF_Prep_Project';

// Create a write client from the getWriteApi method:
const writeApi = influx.getWriteApi(org, bucket);

// Create a query client from the getQueryApi method:
const queryApi = influx.getQueryApi(org, bucket);


/**
 * @swagger
 * /{version}/api/data/write:
 *   post:
 *     summary: Send a list of write commands to pass into the Influx Database.
 *     parameters:
 *       - name: writeData
 *         in: path
 *         required: true
 *         description: Write commands to the Influx Database.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successful connection.
 *         content:
 *           application/json:
 *             example:
 *               message: Success
 *       402:
 *         description: At least 1 invalid command.
 *         content:
 *           application/json:
 *            example:
 *              message: At least 1 invalid command.
 *       500:
 *         description: Failed to connect to database.
 *         content:
 *           application/json:
 *            example:
 *              message: Failed to connect to database. */


async function writeData(req, res)
{

    const writeCommands = req.body; // Receiving write commands

    // Validate all commands before writing to the database, ending the method early if an invalid command is found:
    for(const command of writeCommands) 
    {
        const { measurement, tags, fields, timestamp } = command;
    
        // Validate required fields:
        if (!measurement || !fields) {
            return res.status(402).json({ error: 'At least 1 invalid command.'});
        }
    }

    const errors = [];

    // Writing commands to InfluxDB:
    for(const command of writeCommands) 
    {
        const { measurement, tags, fields, timestamp } = command;

        // Creating a new point for writing to InfluxDB:
        const point = new Point(measurement);

        // Adding tags, if given:
        if (tags) {
            point.tag(tags);
        }

        // Adding fields:
        for (const [fieldKey, fieldValue] of Object.entries(fields)) {
            point.floatField(fieldKey, fieldValue);
        }

        // Adding timestamp, if given:
        if (timestamp) {
            const timestamp_date = new Date(timestamp);
            point.timestamp(timestamp_date);
        }

        // Writing the point to InfluxDB:
        try {
            await writeApi.writePoint(point);
            
            writeApi.close().then(() => {
                // console.log("WRITE FINISHED");
            });

        } catch (error) {
            errors.push(error);
        }
    }    

    if (errors.length > 0) {
        // Return a 500 response if any errors were present:
        res.status(500).json({ error: 'Failed to connect to the database.'});
    } else {
        // Return 200 indicating that all commands were executed successfully:
        res.status(200).json({ message: 'Write request was successful.'});
    }

}


/**
 * @swagger
 * /{version}/api/data/read/{measurement}:
 *   get:
 *     summary: Return data to pass into the Influx Database.
 *     parameters:
 *       - name: readData
 *         in: path
 *         required: true
 *         description: Read data associated with a particular measurement within the Influx Database.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successful connection.
 *         content:
 *           application/json:
 *             example:
 *               message: Success
 *       402:
 *         description: At least 1 invalid command.
 *         content:
 *           application/json:
 *            example:
 *              message: At least 1 invalid command.
 *       500:
 *         description: Failed to connect to database.
 *         content:
 *           application/json:
 *            example:
 *              message: Failed to connect to database. */


async function readData(req, res)
{
    const { measurement } = req.params; // Extracting inputted measurement
    const { tags, from_t, to_t, count } = req.query; // Extracting InfluxDB query parameters

    // Returning 402 error due to invalid request:
    if(count !== undefined && to_t !== undefined) {
        return res.status(402).json({ error: 'Invalid request: Cannot use both "count" and "to" parameters.' });
    }

    // Initializing query for given measurement:
    let fluxQuery = `from(bucket: "${bucket}")
        |> range(start: 0)
        |> filter(fn: (r) => r._measurement == "${measurement}")`;
        
    // Add tags filter:
    if (tags) {
        fluxQuery += ` |> filter(fn: (r) => r["tagKey"] == "${tags}")`;
    }

    // Add from_t filter:
    if (from_t) {
        fluxQuery += ` |> filter(fn: (r) => r._time >= "${from_t}")`;
    }
    
    // Add to_t filter:
    if (to_t) {
        fluxQuery += ` |> filter(fn: (r) => r._time <= "${to_t}")`;
    }

    // List specified number of measurements:
    if (count) {
        fluxQuery += ` |> limit(n: ${count})`;
    }


    try {
        
        // Execute the query:
        let resultEmpty = true; // Boolean to indicate whether or not desired measurement was found
        const data = []; // List to eventually contain all resulting row data outputted by the query

        // Write asynchronous query function:
        const myQuery = async () => {
            for await (const {values, tableMeta} of queryApi.iterateRows(fluxQuery)) 
            {

              resultEmpty = false;
              const o = tableMeta.toObject(values);
             
              const dataPoint = {
                time: o._time,
                measurement: o._measurement,
                field: o._field,
                value: o._value,
              };
              
              data.push(dataPoint);

            //   console.log(`${o._time} ${o._measurement}: ${o._field}=${o._value}`);
            }

            // Returning 402 if inputted measurement data cannot be found:
            if ( resultEmpty ) {
                return res.status(402).json({ error: 'Could not find measurement.'});
            } else {
                // Returning 200 with the extracted measurement data:
                return res.status(200).json ({ data });
            }
          }
          
          // Execute the query:
          myQuery();

    } catch(error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to connect to the InfluxDB database.'});
    }

}


// MongoDB Methods:

// Import the Mongoose models for Equipment and Data dictionaries:
const Equipment = require('../models/equipment.model');
const Data = require('../models/data.model');


/**
 * @swagger
 * /{version}/api/dataDictionary/write:
 *   post:
 *     summary: Write data dictionaries to MongoDB.
 *     parameters:
 *       - name: writeDataDict
 *         in: path
 *         required: true
 *         description: Write data dictionaries from the MTConnect probe operation to MongoDB.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successful connection.
 *         content:
 *           application/json:
 *             example:
 *               message: Success
 *       402:
 *         description: At least 1 invalid command.
 *         content:
 *           application/json:
 *            example:
 *              message: At least 1 invalid command.
 *       500:
 *         description: Failed to connect to database.
 *         content:
 *           application/json:
 *            example:
 *              message: Failed to connect to database. */

async function writeDataDict(req, res)
{
    const dataEntries = req.body; // JSON objects containing data dictionary entries

    // Required fields for a potential data dictionary to be entered into the database:
    const requiredFields = ['category',
                            'id',
                            'deviceUUID'
    ];

    const optionalFields = ['name',
    'type'
    ];

    for (const entry of dataEntries) {
        
        const isValid = requiredFields.every((field) => field in entry);
        
        for (const field of optionalFields) {
            if (field in entry && entry[field] === null) {
                entry[field] = "null";
            }
        }

        // If at least one of the data entries is invalid, send a 402 indicating at least one invalid data dictionary:
        if(!isValid) {
            return res.status(402).json({ error: 'At least 1 invalid data dictionary.' });
        }

    }

    try {
        const savedEntries = await Data.insertMany(dataEntries);

        // Send success message indicating data was entered into database:
        res.status(200).json({ message: 'Successfully entered data into database.'});
    } catch (error) {
        
        // If failure to connect to the database occurs:
        res.status(500).json({ error: `${error}` });
    }


}


/**
 * @swagger
 * /{version}/api/dataDictionary/read:
 *   get:
 *     summary: Read data dictionaries from MongoDB.
 *     parameters:
 *       - name: readDataDict
 *         in: path
 *         required: true
 *         description: Read data dictionaries from MongoDB following any specified equipmentUUID and dataItemID. If both are specified, this method returns the item specified by the dataItemID.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successful connection.
 *         content:
 *           application/json:
 *             example:
 *               message: Success
 *       402:
 *         description: Could not find dataItemID or dictionary entries for specified equipmentUUID.
 *         content:
 *           application/json:
 *            example:
 *              message: Could not find dataItemID or dictionary entries for specified equipmentUUID.
 *       500:
 *         description: Failed to connect to database.
 *         content:
 *           application/json:
 *            example:
 *              message: Failed to connect to database. */

async function readDataDict(req, res)
{
    const { equipmentUUID, dataItemID } = req.query;

    try {
        let query = {};

        if (dataItemID) {
            query.id = dataItemID;
        } else if(equipmentUUID) {
            query.deviceUUID = equipmentUUID;
        }

        // Running the query using the specified parameters:
        const dataDictionaryEntries = await Data.find(query);

        // Returning appropriate error messages if no data dictionary entries were found:
        if (dataDictionaryEntries.length === 0) {

            if(dataItemID) {
                return res.status(402).json({error: 'Could not find dataItemID.'});
            } else if(equipmentUUID) {
                return res.status(402).json({error: 'Could not find dictionary entries for specified equipmentUUID.'});
            }
            
        } else {
            return res.status(200).json({ message: 'Successful read.', data: dataDictionaryEntries});
        }
        

    } catch (error) {
        res.status(500).json({ error: 'Failed to connect to database.'});
    }

}


/**
 * @swagger
 * /{version}/api/equipmentDictionary/write:
 *   post:
 *     summary: Write equipment dictionaries to MongoDB.
 *     parameters:
 *       - name: writeEquipDict
 *         in: path
 *         required: true
 *         description: Read data dictionaries from MongoDB following any specified equipmentUUID and dataItemID. If both are specified, this method returns the item specified by the dataItemID.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successful connection.
 *         content:
 *           application/json:
 *             example:
 *               message: Success
 *       402:
 *         description: At least 1 invalid command.
 *         content:
 *           application/json:
 *            example:
 *              message: At least 1 invalid command.
 *       500:
 *         description: Failed to connect to database.
 *         content:
 *           application/json:
 *            example:
 *              message: Failed to connect to database. */


async function writeEquipDict(req, res)
{

    const equipEntries = req.body; // JSON objects containing data dictionary entries

    const requiredFields = ['deviceId',
                            'deviceName',
                            'deviceUUID',
    ];

    // Schema validation:
    for (const entry of equipEntries) {
        const isValid = requiredFields.every((field) => field in entry);
        
        if(!isValid) {
            return res.status(402).json({ error: 'At least 1 invalid data dictionary.' });
        }
    }

    console.log(equipEntries);
    const savedEntries = await Equipment.insertMany(equipEntries, { timeout: 30000 })
                                        .then(() => {
                                            res.status(200).json({message: 'Successfully entered data into database.'});})
                                        .catch((error) => { 
                                            res.status(500).json({ error: `${error}` });});


}


/**
 * @swagger
 * /{version}/api/equipmentDictionary/read:
 *   get:
 *     summary: Read equipment dictionaries from MongoDB.
 *     parameters:
 *       - name: readDataDict
 *         in: path
 *         required: true
 *         description: Read equipment dictionaries from MongoDB following any specified equipmentUUID, equipmentName, and equipmentId. If more than one are specified, this method returns an error signifying an invalid request.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successful connection.
 *         content:
 *           application/json:
 *             example:
 *               message: Success
 *       402:
 *          description: Could not find measurement or invalid request (parameters wrong).
 *          content:
 *            application/json:
 *             example:
 *               message: Could not find measurement or invalid request (parameters wrong).
 *       500:
 *          description: Failed to connect to database.
 *          content:
 *            application/json:
 *             example:
 *               message: Failed to connect to database. */


async function readEquipDict(req, res)
{
    const { equipmentUUID, equipmentName, equipmentId} = req.query;

    try {
        let query = {};

        // Checking to see if all three parameters are defined in the same request, returning an error if this condition is true:
        if (equipmentUUID && equipmentName && equipmentId) {
            return res.status(402).json({ error: "Invalid request (parameters wrong)"});
        }

        // Assigning any given query parameters:
        if(equipmentUUID) {
            query.deviceUUID = equipmentUUID;
        }

        if(equipmentName) {
            query.deviceName = equipmentName;
        }

        if(equipmentId) {
            query.deviceId = equipmentId;
        }


        // Running the query using the specified parameters:
        const equipmentDictionaryEntries = await Equipment.find(query);

        // Returning appropriate error messages if no data dictionary entries were found:
        if (equipmentDictionaryEntries.length === 0) {
            return res.status(402).json({error: 'Could not find equipment.'});
        } else {
            return res.status(200).json({ message: 'Successful read.', data: equipmentDictionaryEntries});
            
        }
        

    } catch (error) {
        res.status(500).json({ error: 'Failed to connect to database.'});
    }



}

// Exporting methods:
module.exports = { getStatus, getVersion, writeData, readData, writeDataDict, readDataDict, writeEquipDict, readEquipDict };

