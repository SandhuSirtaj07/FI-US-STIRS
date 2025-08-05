import React, { useState, useEffect, useMemo } from 'react';
import './strategy.css';

// Mock ZQ futures data (used for contract structure)
const mockZqData = [
  { contract: 'Aug25', price: 94.75 }, // Implied rate: 100 - 94.75 = 5.25%
  { contract: 'Sep25', price: 94.80 }, // 5.20%
  { contract: 'Oct25', price: 94.85 }, // 5.15%
  { contract: 'Nov25', price: 94.90 }, // 5.10%
  { contract: 'Dec25', price: 94.95 }, // 5.05%
  { contract: 'Jan26', price: 95.00 }, // 5.00%
  { contract: 'Feb26', price: 95.05 }, // 4.95%
  { contract: 'Mar26', price: 95.10 }, // 4.90%
  { contract: 'Apr26', price: 95.15 }, // 4.85%
  { contract: 'May26', price: 95.20 }, // 4.80%
];

// Meetings array
const meetings = [
  { date: '2025-09-17', label: 'Sep25', prevContract: 'Aug25', nextContract: 'Oct25' },
  { date: '2025-10-29', label: 'Oct25', prevContract: 'Oct25', nextContract: 'Nov25' },
  { date: '2025-12-10', label: 'Dec25', prevContract: 'Nov25', nextContract: 'Jan26' },
  { date: '2026-01-28', label: 'Jan26', prevContract: 'Jan26', nextContract: 'Feb26' },
  { date: '2026-03-18', label: 'Mar26', prevContract: 'Feb26', nextContract: 'Apr26' },
  { date: '2026-05-06', label: 'May26', prevContract: 'Apr26', nextContract: 'May26' },
  { date: '2026-06-17', label: 'Jun26', prevContract: 'May26', nextContract: 'Jul26' },
  { date: '2026-07-29', label: 'Jul26', prevContract: 'Jul26', nextContract: 'Aug26' },
];

// Meeting spreads
const meetingSpreads = {
  Sep25: ['Aug25', 'Oct25'],
  Oct25: ['Oct25', 'Nov25'],
  Dec25: ['Nov25', 'Jan26'],
  Jan26: ['Jan26', 'Feb26'],
  Mar26: ['Feb26', 'Apr26'],
  May26: ['Apr26', 'May26'],
  Jun26: ['May26', 'Jul26'],
  Jul26: ['Jul26', 'Aug26'],
};

const Strategy = () => {
  const [zqData, setZqData] = useState(mockZqData);
  const [customMeetingValues, setCustomMeetingValues] = useState({});
  const [selectedItem, setSelectedItem] = useState(null);

  // Filter upcoming meetings
  const todayStr = new Date().toISOString().slice(0, 10);
  const upcomingMeetings = meetings.filter(m => m.date >= todayStr).slice(0, 8);

  // Initialize custom meeting values
  useEffect(() => {
    setCustomMeetingValues(prev => {
      const newValues = { ...prev };
      upcomingMeetings.forEach(m => {
        if (!(m.label in newValues)) {
          newValues[m.label] = 0;
        }
      });
      console.log('Initialized customMeetingValues:', newValues);
      return newValues;
    });
  }, []);

  // Handle user input
  const handleInputChange = (label, value) => {
    const newValue = parseFloat(value) || 0;
    setCustomMeetingValues(prev => {
      const updated = { ...prev, [label]: newValue };
      console.log(`Input changed: ${label} = ${newValue}`, updated);
      return updated;
    });
  };

  // Calculate spreads and butterflies
  const calculateSpreadsAndFlies = useMemo(() => {
    // Custom contract values
    const deriveCustomContractValues = () => {
      const contractValues = new Array(zqData.length).fill(null);
      const contractIndexMap = zqData.reduce((acc, item, idx) => {
        acc[item.contract] = idx;
        return acc;
      }, {});
      console.log('Contract index map:', contractIndexMap);

      // Seed front contract
      const frontImpliedRate = zqData[0]?.price && !isNaN(zqData[0].price) ? 100 - zqData[0].price : 5.25;
      contractValues[0] = Number(frontImpliedRate.toFixed(4));
      console.log(`Seeded front contract (${zqData[0]?.contract || 'Unknown'}): ${contractValues[0]}`);

      // Apply user-input bps
      upcomingMeetings.forEach(meeting => {
        const [contract1, contract2] = meetingSpreads[meeting.label] || [];
        const idx1 = contractIndexMap[contract1];
        const idx2 = contractIndexMap[contract2];
        const bps = customMeetingValues[meeting.label] || 0;

        console.log(`Processing ${meeting.label}: ${contract1} -> ${contract2}, bps = ${bps}, idx1 = ${idx1}, idx2 = ${idx2}`);

        if (idx1 !== undefined && idx2 !== undefined && idx2 < contractValues.length && contractValues[idx1] !== null) {
          contractValues[idx2] = Number((contractValues[idx1] - bps / 100).toFixed(4));
          console.log(`Set ${contract2} = ${contractValues[idx1]} - ${bps}/100 = ${contractValues[idx2]}`);
        } else {
          console.warn(`Skipping ${meeting.label}: Invalid indices (idx1=${idx1}, idx2=${idx2}) or null value`);
        }
      });

      // Fill gaps (e.g., Sep25)
      for (let i = 1; i < contractValues.length; i++) {
        if (contractValues[i] === null) {
          const prevValue = contractValues[i - 1] || frontImpliedRate;
          let nextValue = null;
          let steps = 1;
          for (let j = i + 1; j < contractValues.length; j++) {
            if (contractValues[j] !== null) {
              nextValue = contractValues[j];
              steps = j - i + 1;
              break;
            }
          }
          if (nextValue !== null) {
            contractValues[i] = Number((prevValue + (nextValue - prevValue) / steps).toFixed(4));
            console.log(`Interpolated ${zqData[i]?.contract || 'Unknown'} = ${prevValue} + (${nextValue} - ${prevValue}) / ${steps} = ${contractValues[i]}`);
          } else {
            contractValues[i] = prevValue;
            console.log(`Carried forward ${zqData[i]?.contract || 'Unknown'} = ${prevValue}`);
          }
        }
      }

      console.log('Custom contract values:', contractValues.map((v, i) => `${zqData[i]?.contract || 'Unknown'}: ${v}`));
      return contractValues;
    };

    const customContractValues = zqData.length > 0 ? deriveCustomContractValues() : [];

    const oneMonthSpreads = [];
    const twoMonthSpreads = [];
    const flies = [];

    // 1-Month Spreads
    for (let i = 0; i < zqData.length - 1 && oneMonthSpreads.length < 9; i++) {
      const customSpread = customContractValues.length > i + 1
        ? ((customContractValues[i + 1] - customContractValues[i]) * 100).toFixed(1)
        : '0.0';
      console.log(`1-Month Spread ${zqData[i].contract}-${zqData[i + 1].contract}: Custom = ${customSpread}`);
      oneMonthSpreads.push({
        label: `${zqData[i].contract}-${zqData[i + 1].contract}`,
        customValue: customSpread,
      });
    }

    // 2-Month Spreads
    for (let i = 0; i < zqData.length - 2 && twoMonthSpreads.length < 9; i++) {
      const customSpread = customContractValues.length > i + 2
        ? ((customContractValues[i + 2] - customContractValues[i]) * 100).toFixed(1)
        : '0.0';
      console.log(`2-Month Spread ${zqData[i].contract}-${zqData[i + 2].contract}: Custom = ${customSpread}`);
      twoMonthSpreads.push({
        label: `${zqData[i].contract}-${zqData[i + 2].contract}`,
        customValue: customSpread,
      });
    }

    // Butterflies
    for (let i = 0; i < zqData.length - 2 && flies.length < 9; i++) {
      const customFly = customContractValues.length > i + 2
        ? ((customContractValues[i] - 2 * customContractValues[i + 1] + customContractValues[i + 2]) * 100).toFixed(1)
        : '0.0';
      console.log(`Fly ${zqData[i].contract}: Custom = ${customFly}`);
      flies.push({
        label: `${zqData[i].contract} Fly`,
        customValue: customFly,
      });
    }

    console.log('Spreads and Flies:', { oneMonthSpreads, twoMonthSpreads, flies });
    return { oneMonthSpreads, twoMonthSpreads, flies };
  }, [zqData, customMeetingValues]);

  const { oneMonthSpreads, twoMonthSpreads, flies } = calculateSpreadsAndFlies;

  return (
    <div className="strategy-container">
      <h1>Design Your Own Market Strategy</h1>
      <p>
        Enter expected rate changes (in basis points) in the FOMC Meetings table.<br />
        Spreads and butterflies update with custom (user-input) values.
      </p>
      {selectedItem && <p className="selected-item">Selected: {selectedItem}</p>}

      <div className="full-width">
        <h2>FOMC Meetings</h2>
        <table className="strategy-table">
          <thead>
            <tr>
              <th>Meeting</th>
              <th>Custom Case (bps)</th>
            </tr>
          </thead>
          <tbody>
            {upcomingMeetings.map((meeting) => (
              <tr key={meeting.label}>
                <td>{meeting.label}</td>
                <td>
                  <input
                    type="number"
                    value={customMeetingValues[meeting.label] ?? ''}
                    onChange={(e) => handleInputChange(meeting.label, e.target.value)}
                    placeholder="Enter bps"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="spreads-container">
        <div className="spread-table">
          <h3>1-Month Spreads</h3>
          <table className="strategy-table">
            <thead>
              <tr>
                <th>Spread</th>
                <th>Custom Value (bps)</th>
              </tr>
            </thead>
            <tbody>
              {oneMonthSpreads.map((spread, index) => (
                <tr
                  key={index}
                  onClick={() =>
                    setSelectedItem(`1-Month Spread ${spread.label}: Custom ${spread.customValue} bps`)
                  }
                  className="clickable"
                >
                  <td>{spread.label}</td>
                  <td>{spread.customValue}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="spread-table">
          <h3>2-Month Spreads</h3>
          <table className="strategy-table">
            <thead>
              <tr>
                <th>Spread</th>
                <th>Custom Value (bps)</th>
              </tr>
            </thead>
            <tbody>
              {twoMonthSpreads.map((spread, index) => (
                <tr
                  key={index}
                  onClick={() =>
                    setSelectedItem(`2-Month Spread ${spread.label}: Custom ${spread.customValue} bps`)
                  }
                  className="clickable"
                >
                  <td>{spread.label}</td>
                  <td>{spread.customValue}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="spread-table">
          <h3>Butterflies</h3>
          <table className="strategy-table">
            <thead>
              <tr>
                <th>Fly</th>
                <th>Custom Value (bps)</th>
              </tr>
            </thead>
            <tbody>
              {flies.map((fly, index) => (
                <tr
                  key={index}
                  onClick={() =>
                    setSelectedItem(`Fly ${fly.label}: Custom ${fly.customValue} bps`)
                  }
                  className="clickable"
                >
                  <td>{fly.label}</td>
                  <td>{fly.customValue}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Strategy;