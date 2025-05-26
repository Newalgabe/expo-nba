const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());

app.get('/api/nba/scoreboard', async (req, res) => {
  try {
    const { date } = req.query;
    const response = await axios.get(`https://cdn.nba.com/static/json/liveData/scoreboard/todaysScoreboard_00.json`);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch NBA data' });
  }
});

app.listen(3000);