require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const fetch = require('node-fetch');

const app = express();
const PORT = 4000;

app.use(cors());

app.get('/api/zq', async (req, res) => {
  try {
    const data = await fs.readFile('../ZQ_futures.json', 'utf-8');
    res.json(JSON.parse(data));
  } catch {
    res.status(500).json({ error: 'ZQ data unavailable' });
  }
});

app.get('/api/sr3', async (req, res) => {
  try {
    const data = await fs.readFile('../SR3_futures.json', 'utf-8');
    res.json(JSON.parse(data));
  } catch {
    res.status(500).json({ error: 'SR3 data unavailable' });
  }
});

// app.get('/api/spot', async (req, res) => {
//   try {
//     const fredApiKey = process.env.FRED_API_KEY || '';
//     let effr = 4.33; // Fallback
//     if (fredApiKey) {
//       const effrRes = await fetch(`https://api.stlouisfed.org/fred/series/observations?series_id=EFFR&api_key=${fredApiKey}&file_type=json`);
//       if (effrRes.ok) {
//         const effrData = await effrRes.json();
//         effr = parseFloat(effrData.observations.pop().value);
//       }
//     }

//     const sofrRes = await fetch('https://markets.newyorkfed.org/api/rates/secured/sofr/last/1.json');
//     if (!sofrRes.ok) throw new Error('NY Fed API error');
//     const sofrData = await sofrRes.json();
//     const sofr = parseFloat(sofrData.refRates[0].rate);

//     res.json({ SOFR: sofr, EFFR: effr });
//   } catch (error) {
//     console.error('Error fetching spot prices:', error.message);
//     res.status(500).json({ error: 'Spot prices unavailable' });
//   }
// });

app.listen(PORT, () => {
  console.log(`API server running at http://localhost:${PORT}`);
});