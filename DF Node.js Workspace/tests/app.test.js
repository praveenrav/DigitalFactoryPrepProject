
request = require('supertest');
const app = require('../app');
const fs = require('fs');

// Loading package.json:
const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf-8'));
const version = packageJson.version;


// Testing GET status:
describe('Testing status', () => {
    test('GET /{version}/api/status', (done) => {
      
      request(app).get(`/${version}/api/status`)
      .expect("Content-Type", /json/)
      .expect(200)
      .expect((res) => {
        res.body.message = 'Successful connection.';
      });

      done();

    });
});


// Testing GET version:
describe('Testing version', () => {
  test('GET /{version}/api/version', (done) => {
    
    request(app).get(`/${version}/api/version`)
    .expect("Content-Type", /json/)
    .expect(200)
    .expect((res) => {
      res.body.message = '1.0.0';
    });

    done();

  });
});


// Testing POST command to InfluxDB:
describe('Testing writing data to InfluxDB', () => {
  test('POST /{version}/api/data/write', (done) => {
    
    const writeCommands = [
      { measurement: 'your_measurement', fields: { field1: 'value1' } },
      { measurement: 'your_measurement', fields: { field2: 'value2' } },
    ];

    request(app).post(`/${version}/api/data/write`)
    .send(writeCommands)
    .expect("Content-Type", /json/)
    .expect(200)
    .expect((res) => {
      res.body.message = 'Write request was successful.';
    });

    done();

  });
});


// Testing GET command from InfluxDB:
describe('Testing reading data from InfluxDB', () => {
  test('GET /{version}/api/data/read/{measurement}', (done) => { // Assuming your GET endpoint is /{version}/api/data/read/{measurement}
    
    const measurement = 'your_measurement'; // Replace with the measurement you want to read
    const tags = 'your_tags'; // Replace with tags (if any)
    const from_t = 'your_start_time'; // Replace with the start time
    const to_t = 'your_end_time'; // Replace with the end time
    const count = 'your_count'; // Replace with the count (if any)


    request(app)
      .get(`/${version}/api/data/read/${measurement}`)
      .query({ tags, from_t, to_t, count })
      .expect("Content-Type", /json/)
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body.data)).toBe(true);
      });

      done();
      
  });
});


