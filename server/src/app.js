const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const musicRouter = require('./routes/music.router');

const app = express();

app.use(morgan('dev'));
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.use('/api/music', musicRouter);

module.exports = app;
