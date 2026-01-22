const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const musicRouter = require('./routes/music.router');

const app = express();

app.use(morgan('dev'));
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Увеличиваем лимит для больших запросов синхронизации
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static('public'));

app.use('/api/music', musicRouter);

module.exports = app;
