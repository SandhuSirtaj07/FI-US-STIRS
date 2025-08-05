import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import Strategy from './strategy';
import Footer from './footer';
import './App.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend);

// Meetings array
const meetings = [
  { date: '2025-09-17', label: 'Sep25', serialDate: '45735', prevContract: 'Aug25', nextContract: 'Oct25', isQuarterly: true },
  { date: '2025-10-29', label: 'Oct25', serialDate: '45777', prevContract: 'Oct25', nextContract: 'Nov25', isQuarterly: false },
  { date: '2025-12-10', label: 'Dec25', serialDate: '45828', prevContract: 'Nov25', nextContract: 'Jan26', isQuarterly: true },
  { date: '2026-01-28', label: 'Jan26', serialDate: '45877', prevContract: 'Jan26', nextContract: 'Feb26', isQuarterly: false },
  { date: '2026-03-18', label: 'Mar26', serialDate: '45926', prevContract: 'Feb26', nextContract: 'Apr26', isQuarterly: true },
  { date: '2026-05-06', label: 'May26', serialDate: '45976', prevContract: 'Apr26', nextContract: 'May26', isQuarterly: false },
  { date: '2026-06-17', label: 'Jun26', serialDate: '46018', prevContract: 'May26', nextContract: 'Jul26', isQuarterly: true },
  { date: '2026-07-29', label: 'Jul26', serialDate: '46060', prevContract: 'Jul26', nextContract: 'Aug26', isQuarterly: false },
  { date: '2026-09-16', label: 'Sep26', serialDate: '46109', prevContract: 'Aug26', nextContract: 'Oct26', isQuarterly: true },
  { date: '2026-11-02', label: 'Nov26', serialDate: '46199', prevContract: 'Oct26', nextContract: 'Nov26', isQuarterly: true },
  { date: '2026-12-16', label: 'Dec26', serialDate: '46231', prevContract: 'Nov26', nextContract: 'Jan27', isQuarterly: true },
];

// Normalize contracts for matching (e.g., from 'Sep25' to 'Sep5')
function normalizeContract(contract) {
  if (!contract) return null;
  const month = contract.slice(0, 3);
  const year = contract.slice(3);
  return month + (year.length > 1 ? year[year.length - 1] : year);
}

// Define specific spreads for each meeting
const meetingSpreads = {
  Sep25: ['Aug25', 'Oct25'],
  Oct25: ['Oct25', 'Nov25'],
  Dec25: ['Nov25', 'Jan26'],
  Jan26: ['Jan26', 'Feb26'],
  Mar26: ['Feb26', 'Apr26'],
  May26: ['Apr26', 'May26'],
  Jun26: ['May26', 'Jul26'],
  Jul26: ['Jul26', 'Aug26'],
  Sep26: ['Aug26', 'Oct26'],
  Nov26: ['Oct26', 'Nov26'],
  Dec26: ['Nov26', 'Jan27'],
};

// Calculate bps for a meeting
const calculateMeetingBps = (meeting, zqPrices, contractIndexMap) => {
  const spread = meetingSpreads[meeting.label];
  if (!spread) return 0;

  const [contract1, contract2] = spread;
  const idx1 = contractIndexMap[normalizeContract(contract1)];
  const idx2 = contractIndexMap[normalizeContract(contract2)];

  const price1 = idx1 !== undefined ? zqPrices[idx1] : null;
  const price2 = idx2 !== undefined ? zqPrices[idx2] : price1;

  if (price1 === null || price2 === null || isNaN(price1) || isNaN(price2)) {
    return 0; // Default to 0 bps if data is missing
  }

  return parseFloat(((price1 - price2) * 100).toFixed(2));
};

// Market table showing all contracts/prices as provided by API data
const MarketTable = ({ data, contractPrefix, spotPrice }) => {
  if (!data || data.length === 0) {
    return <div className="sheet-container">Error: {contractPrefix} Data unavailable</div>;
  }

  return (
    <div className="sheet-container">
      <h2>{contractPrefix === 'SR3' ? 'SOFR Futures Prices (SR3)' : 'Fed Funds Futures Prices (ZQ)'}</h2>
      <p><strong>Spot Rate:</strong> {spotPrice ? `${spotPrice.toFixed(4)}%` : 'N/A'}</p>
      <table className="sheet-table">
        <thead>
          <tr>
            <th>Contract</th>
            {data.map(({ contract }) => (
              <th key={contract}>{`${contractPrefix}-${contract}`}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Price</td>
            {data.map(({ contract, price }) => (
              <td key={contract}>{Number(price).toFixed(4)}</td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
};


// Table displaying upcoming meetings with probabilities and a single news table for US market and economy
const MeetingsTable = ({ liveData }) => {
  const [news, setNews] = useState([]);
  const [dataError, setDataError] = useState(null);

  // Map from normalized contract name to index in zqData for price lookup
  const contractIndexMap = liveData.zqData.reduce((acc, item, idx) => {
    acc[normalizeContract(item.contract)] = idx;
    return acc;
  }, {});

  // Filter meetings to only those with date >= today
  const todayStr = new Date().toISOString().slice(0, 10);
  const upcomingMeetings = meetings.filter(m => m.date >= todayStr);

  const meetingRows = upcomingMeetings.map(meeting => {
    const bps = calculateMeetingBps(meeting, liveData.zqprice, contractIndexMap);

    let probability, rateLabel;
    if (bps > 0) {
      probability = Math.min((bps / 25) * 100, 100).toFixed(0);
      rateLabel = '+25 bps';
    } else if (bps < 0) {
      probability = Math.min((Math.abs(bps) / 25) * 100, 100).toFixed(0);
      rateLabel = '-25 bps';
    } else {
      probability = 100;
      rateLabel = 'No Change';
    }

    return {
      serialDate: meeting.serialDate,
      label: meeting.label,
      probability: `${probability}% (${rateLabel})`,
      bps: bps,
    };
  });

  useEffect(() => {
    // Mock data for news table fallback (US market and economy)
    const mockNewsData = [
      {
        speaker: 'Reuters',
        date: '2025-08-04',
        headline: 'US stock markets drop as tariffs and weak jobs data spark sell-off',
        source: 'Reuters',
      },
      {
        speaker: 'CNBC',
        date: '2025-08-03',
        headline: 'Stock futures rise amid uncertainty over economy and tariffs',
        source: 'CNBC',
      },
      {
        speaker: 'Bloomberg',
        date: '2025-08-02',
        headline: 'Bond market sees payoff after jobs data shock',
        source: 'Bloomberg',
      },
    ];

    // Fetch with retry for CORS or transient errors
    const fetchWithRetry = async (url, retries = 1) => {
      for (let i = 0; i <= retries; i++) {
        try {
          const response = await fetch(url);
          if (response.ok) return response;
          throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        } catch (err) {
          if (i === retries) throw err;
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s before retry
        }
      }
    };

    const fetchData = async () => {
      let errorMessages = [];
      try {
        // Fetch News from NewsAPI (US market and economy)
        const newsApiKey = '27cf8dd61dd84b0d9b669a2f545a17eb';
        const newsResponse = await fetchWithRetry(
          `https://newsapi.org/v2/everything?q=us+market+economy&sortBy=publishedAt&apiKey=${newsApiKey}&pageSize=5`
        );
        const newsData = await newsResponse.json();
        console.log('NewsAPI Response:', newsData); // Debug log
        if (newsData.status !== 'ok' || !newsData.articles) {
          throw new Error('NewsAPI: Invalid response format');
        }
        const newsItems = newsData.articles.map(article => ({
          speaker: article.author || 'Unknown',
          date: article.publishedAt ? article.publishedAt.slice(0, 10) : 'Unknown',
          headline: (article.title || 'No headline available').substring(0, 120),
          source: article.source?.name || 'Unknown',
        }));
        setNews(newsItems.length > 0 ? newsItems : mockNewsData);
      } catch (err) {
        console.error('NewsAPI Error:', err.message);
        errorMessages.push(err.message);
        setNews(mockNewsData);
      }

      setDataError(errorMessages.length > 0 ? errorMessages.join('; ') : null);
    };

    fetchData();
    const interval = setInterval(fetchData, 300000); // Refresh every 5 minutes
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="meetings-container">
      <div className="meetings-table">
        <h2>FOMC Meeting Probabilities</h2>
        <table className="sheet-table">
          <thead>
            <tr>
              <th style={{ width: '40%' }}>Meeting</th>
              <th style={{ width: '40%' }}>Probability (%)</th>
              <th style={{ width: '20%' }}>BPS</th>
            </tr>
          </thead>
          <tbody>
            {meetingRows.map(({ serialDate, label, probability, bps }, idx) => (
              <tr key={idx}>
                <td>{label}</td>
                <td>{probability}</td>
                <td>{bps} bps</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p>Note: Probabilities are derived from ZQ futures bps calculations using 25 bps increments.</p>
      </div>

      <div className="news-feed">
        {dataError && <p style={{ color: '#ff9999', fontSize: '0.9rem' }}>{dataError}</p>}
        <div className="news-table">
          <h2>US Market & Economy News</h2>
          <table className="sheet-table news-table">
            <thead>
              <tr>
                <th style={{ width: '15%' }}>Author</th>
                <th style={{ width: '10%' }}>Date</th>
                <th style={{ width: '60%' }}>Headline</th>
                <th style={{ width: '15%' }}>Source</th>
              </tr>
            </thead>
            <tbody>
              {news.length > 0 ? (
                news.map((item, idx) => (
                  <tr key={idx}>
                    <td>{item.speaker}</td>
                    <td>{item.date}</td>
                    <td>{item.headline}</td>
                    <td>{item.source}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4">Loading news...</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
// Graph component for implied rate changes using live data contracts directly
const FedFundsFuturesGraph = ({ liveData }) => {
  const [graphType, setGraphType] = useState('bar');

  const zqPrices = Array.isArray(liveData.zqprice) ? liveData.zqprice.map(Number) : [];

  const contractIndexMap = (liveData.zqData || []).reduce((acc, item, idx) => {
    acc[normalizeContract(item.contract)] = idx;
    return acc;
  }, {});

  // Function to check if a contract is expired
  const isContractExpired = (contract) => {
    if (!contract) return true;
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = contract.slice(0, 3);
    const year = parseInt(contract.slice(3), 10) + 2000;
    const monthIndex = monthNames.indexOf(month);
    if (monthIndex === -1) return true;
    const contractEndDate = new Date(year, monthIndex + 1, 0); // Last day of the contract month
    const today = new Date();
    return contractEndDate < today;
  };

  // Select the first 7 meetings in order
  const todayStr = new Date().toISOString().slice(0, 10);
  const desiredMeetings = ['Sep25', 'Oct25', 'Dec25', 'Jan26', 'Mar26', 'May26', 'Jun26'];
  const validMeetings = meetings
    .filter(m => m.date >= todayStr)
    .filter(m => !isContractExpired(m.nextContract))
    .filter(m => desiredMeetings.includes(m.label))
    .filter(m => {
      const spread = meetingSpreads[m.label];
      if (!spread) return false;
      const [contract1, contract2] = spread;
      return contractIndexMap.hasOwnProperty(normalizeContract(contract1));
    })
    .sort((a, b) => a.serialDate - b.serialDate)
    .slice(0, 7);

  const rateChanges = validMeetings.map(meeting => 
    calculateMeetingBps(meeting, zqPrices, contractIndexMap)
  );

  const meetingLabels = validMeetings.map(m => m.label);
  const plottedRateChanges = rateChanges;
  const dataReady = meetingLabels.length > 0 && plottedRateChanges.length > 0;

  const data = {
    labels: meetingLabels,
    datasets: [
      {
        label: 'Rate Change (bps, negative = cut)',
        data: plottedRateChanges,
        borderColor: 'rgba(255,77,77,1)',
        backgroundColor: graphType === 'bar' ? 'rgba(255,77,77,0.5)' : 'rgba(255,77,77,0.2)',
        borderWidth: 2,
        tension: 0.4,
        fill: graphType === 'line',
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { labels: { color: '#d0d0d0' } },
      title: {
        display: true,
        text: 'Implied Rate Changes from ZQ Futures',
        color: '#d0d0d0',
        font: { size: 18 },
      },
    },
    scales: {
      x: {
        title: { display: true, text: 'Meeting', color: '#d0d0d0' },
        ticks: { color: '#d0d0d0' },
      },
      y: {
        title: { display: true, text: 'Cut (-) / Hike (+) in Basis Points', color: '#d0d0d0' },
        ticks: {
          color: '#d0d0d0',
          callback: (val) => `${val} bps`,
        },
        suggestedMin: -50,
        suggestedMax: 50,
      },
    },
  };

  return (
    <div className="sheet-container">
      <h2>FOMC Implied Rate Changes</h2>
      <div style={{ marginBottom: '1rem' }}>
        <button
          onClick={() => setGraphType('bar')}
          style={{
            marginRight: '1rem',
            padding: '0.5rem 1rem',
            background: graphType === 'bar' ? 'rgba(255,77,77,0.5)' : 'rgba(255,255,255,0.1)',
            color: '#d0d0d0',
            border: '1px solid #4a4a7a',
            borderRadius: '5px',
            cursor: 'pointer',
          }}
        >
          Bar Graph
        </button>
        <button
          onClick={() => setGraphType('line')}
          style={{
            padding: '0.5rem 1rem',
            background: graphType === 'line' ? 'rgba(255,77,77,0.5)' : 'rgba(255,255,255,0.1)',
            color: '#d0d0d0',
            border: '1px solid #4a4a7a',
            borderRadius: '5px',
            cursor: 'pointer',
          }}
        >
          Line Graph
        </button>
      </div>

      {dataReady ? (
        graphType === 'bar' ? <Bar data={data} options={options} /> : <Line data={data} options={options} />
      ) : (
        <p style={{ color: '#ff9999' }}>Insufficient data to plot chart. Check ZQ table.</p>
      )}
      <p>Based on ZQ futures prices.</p>
    </div>
  );
};

const App = () => {
  const [liveData, setLiveData] = useState({
    sr3Data: [],
    zqData: [],
    sofrprice: [],
    zqprice: [],
    spotPrices: {
      SOFR: 0,
      EFFR: 0,
    },
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchLiveData = async () => {
      setLoading(true);
      try {
        const [zqRes, sr3Res] = await Promise.all([
          fetch('http://127.0.0.1:4000/api/zq'),
          fetch('http://127.0.0.1:4000/api/sr3'),
        ]);

        if (!zqRes.ok) throw new Error('Failed to fetch ZQ data');
        if (!sr3Res.ok) throw new Error('Failed to fetch SR3 data');

        const zqData = await zqRes.json();
        const sr3Data = await sr3Res.json();

        const zqprice = zqData.map(item => item.price);
        const sofrprice = sr3Data.map(item => item.price);

        const spotZQ = zqprice.length ? 100 - zqprice[0] : 4.33;
        const spotSR3 = sofrprice.length ? 100 - sofrprice[0] : 4.37;

        setLiveData({
          zqData,
          sr3Data,
          zqprice,
          sofrprice,
          spotPrices: {
            EFFR: spotZQ,
            SOFR: spotSR3,
          },
        });

        setError(null);
      } catch (err) {
        console.error('Error fetching live data:', err.message);
        setError('Failed to load market data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchLiveData();
    const intervalId = setInterval(fetchLiveData, 300000); // refresh every 5 minutes
    return () => clearInterval(intervalId);
  }, []);

  return (
    <Router>
      <div className="app">
        <header className="header">
          <h1>HAWK</h1>
          <nav className="navbar">
            <Link to="/" className="nav-link">Main</Link>
            <Link to="/strategy" className="nav-link">Custom Strategy</Link>
          </nav>
        </header>
        <main className="main-content">
          {loading && <div style={{ color: '#d0d0d0', textAlign: 'center' }}>Loading...</div>}
          {error && <div className="error-message" style={{ color: 'red', textAlign: 'center' }}>{error}</div>}
          <Routes>
            <Route
              path="/"
              element={
                <>
                  <MarketTable data={liveData.sr3Data} contractPrefix="SR3" spotPrice={liveData.spotPrices.SOFR} />
                  <MarketTable data={liveData.zqData} contractPrefix="ZQ" spotPrice={liveData.spotPrices.EFFR} />
                  <FedFundsFuturesGraph liveData={liveData} />
                  <MeetingsTable liveData={liveData} />
                </>
              }
            />
            <Route path="/strategy" element={<Strategy mainSheetDataTemplate={liveData.spotPrices} />} />
          </Routes>
        </main>
        <Footer/>
      </div>
    </Router>
  );
  
};

export default App;