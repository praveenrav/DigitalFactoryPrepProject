const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUI = require('swagger-ui-express');

const options = {
    definition: {
        openapi: '3.0.0', // Version of OpenAPI (Swagger)
        info: {
            title: 'Digital Factory Clone API Documentation',
            version: '1.0.0',
            description: 'API Documentation for DF Development Preparation',
        },
    },

    // Specifying the paths to route files:
    apis: ['./routes/*.js'],


};

const specs = swaggerJsdoc(options);

module.exports = { specs, swaggerUI };

