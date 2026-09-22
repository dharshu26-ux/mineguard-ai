import { useState, useEffect } from "react";
import "./App.css";

function App() {
  const [page, setPage] = useState("dashboard");
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [ventilation, setVentilation] = useState(80);
  const [training, setTraining] = useState(80);
  const [assistantQuestion, setAssistantQuestion] = useState("");
  const [assistantAnswer, setAssistantAnswer] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [selectedRisk, setSelectedRisk] = useState(null);
  const [realtimeData, setRealtimeData] = useState(null);
  const [mines, setMines] = useState([]);
  const [gasHistory, setGasHistory] = useState([]);
  const [complianceData, setComplianceData] = useState([]);
  const [fieldActivities, setFieldActivities] = useState([]);
  const [inspectionList, setInspectionList] = useState([]);

 useEffect(() => {
const fetchGasData = async () => {
  try {
    const response = await fetch(
      "http://127.0.0.1:8000/api/realtime-gas?mine_id=1&sector_id=1"
    );

    if (!response.ok) {
      throw new Error("Failed to fetch real-time data");
    }

    const data = await response.json();

    const readings = data.readings || {};

    const newData = {
      mine: data.mine,
      sector: data.sector,
      
      timestamp:
        readings.Oxygen?.recorded_at ||
        new Date().toISOString(),

      oxygen: readings.Oxygen?.value ?? null,
      carbon_dioxide: readings["Carbon Dioxide"]?.value ?? null,
      carbon_monoxide: readings["Carbon Monoxide"]?.value ?? null,
      methane: readings.Methane?.value ?? null,
      temperature: readings.Temperature?.value ?? null,
      airflow: readings.Airflow?.value ?? null,
      water_level: readings["Water Level"]?.value ?? null,

      risk_score: 0,
      risk_level: "LOW"
    };

    setRealtimeData(newData);

  } catch (error) {
    console.error("Error fetching real-time data:", error);
  }
};
  const fetchMines = async () => {
  try {
    const response = await fetch(
      "http://127.0.0.1:8000/api/mines"
    );

    const data = await response.json();

    setMines(data.mines);
  } catch (error) {
    console.error("Mine data error:", error);
  }
};
const fetchCompliance = async () => {
  try {
    const response = await fetch(
      "http://127.0.0.1:8000/api/compliance?mine_id=1&sector_id=1"
    );

    const data = await response.json();

    setComplianceData(data.compliance_records || []);
  } catch (error) {
    console.error("Compliance data error:", error);
  }
};
const fetchFieldActivities = async () => {
  try {
    const response = await fetch(
      "http://127.0.0.1:8000/api/field-activities?mine_id=1&sector_id=1"
    );

    const data = await response.json();

    setFieldActivities(data.field_activities || []);

  } catch (error) {
    console.error("Field activity data error:", error);
  }
};

const fetchInspectionPriority = async () => {
  try {
    const response = await fetch(
      "http://127.0.0.1:8000/api/inspection-priority"
    );

    const data = await response.json();

    setInspectionList(data.inspection_priority);
  } catch (error) {
    console.error("Inspection priority error:", error);
  }
};

fetchMines();

  fetchGasData();
  fetchCompliance();
  fetchFieldActivities();
  fetchInspectionPriority();



  const interval = setInterval(fetchGasData, 2000);

  return () => clearInterval(interval);
}, []);
  
  
  const documents = [
    {
      id: 1,
      name: "Mine A Safety Report.pdf",
      mine: "Mine A",
      type: "Safety Report",
      status: "Needs Review",
      score: 68,
      missing: [
        "Emergency preparedness document",
        "Recent ventilation inspection record",
      ],
      recommendation:
        "Review the missing documents and schedule a compliance inspection.",
    },
    {
      id: 2,
      name: "Mine B Compliance Report.pdf",
      mine: "Mine B",
      type: "Compliance Report",
      status: "Mostly Compliant",
      score: 84,
      missing: ["Worker training record update"],
      recommendation:
        "Update the worker training record and continue regular monitoring.",
    },
    {
      id: 3,
      name: "Mine C Inspection Report.pdf",
      mine: "Mine C",
      type: "Inspection Report",
      status: "Compliant",
      score: 94,
      missing: [],
      recommendation:
        "No major missing requirements detected. Continue routine monitoring.",
    },
  ];

  // ---------------- DOCUMENT ANALYZER ----------------

  if (page === "documents") {
    return (
      <div className="app">
        <button className="back-btn" onClick={() => setPage("dashboard")}>
          ← Back to Dashboard
        </button>

        <div className="compliance-header">
          <h1>📄 AI Document Analyzer</h1>
          <p>
            AI-assisted analysis of mine documents to identify missing
            compliance requirements.
          </p>
        </div>

        <div className="document-list">
          {documents.map((doc) => (
            <div className="document-card" key={doc.id}>
              <div className="document-title">
                <div>
                  <h2>📄 {doc.name}</h2>
                  <p>
                    {doc.mine} • {doc.type}
                  </p>
                </div>

                <span
                  className={
                    doc.status === "Compliant"
                      ? "status-compliant"
                      : doc.status === "Mostly Compliant"
                      ? "status-warning"
                      : "status-violation"
                  }
                >
                  {doc.status}
                </span>
              </div>

              <div className="document-score">
                <span>AI Compliance Score</span>
                <strong>{doc.score}%</strong>
              </div>

              <div className="compliance-bar">
                <div style={{ width: `${doc.score}%` }}></div>
              </div>

              <button
                className="analyze-btn"
                onClick={() => setSelectedDocument(doc)}
              >
                🤖 Analyze Document
              </button>

              {selectedDocument?.id === doc.id && (
                <div className="analysis-result">
                  <h3>🔍 AI Analysis Result</h3>

                  <p>
                    <strong>Document:</strong> {doc.name}
                  </p>

                  <h4>Missing / Attention Required</h4>

                  {doc.missing.length === 0 ? (
                    <p className="rule-compliant">
                      ✓ No major missing requirements detected.
                    </p>
                  ) : (
                    <ul>
                      {doc.missing.map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  )}

                  <div className="ai-action">
                    <strong>Recommended Action:</strong>
                    <p>{doc.recommendation}</p>
                  </div>

                  <p className="demo-note">
                    ⚠️ Prototype result using synthetic demo data.
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ---------------- COMPLIANCE MONITORING ----------------

  if (page === "compliance") {
    return (
      <div className="app">
        <button className="back-btn" onClick={() => setPage("dashboard")}>
          ← Back to Dashboard
        </button>

        <div className="compliance-header">
          <h1>📋 Compliance Monitoring</h1>
          <p>
            Monitor mine requirements and identify areas needing attention.
          </p>
        </div>

        <div className="compliance-mine">

  {complianceData.length === 0 ? (
    <div className="compliance-card">
      <h3>No compliance records available</h3>
      <p>
        No compliance records have been recorded for this mine and sector.
      </p>
    </div>
  ) : (
    complianceData.map((record) => (
      <div className="compliance-card" key={record.id}>

        <div className="compliance-title">
          <div>
            <h2>{record.requirement}</h2>
            <p>
              Mine ID: {record.mine_id} | Sector ID: {record.sector_id}
            </p>
          </div>

          <span className={`compliance-status ${record.status?.toLowerCase()}`}>
            {record.status}
          </span>
        </div>

        <div className="compliance-details">
          <p>
            <strong>Due Date:</strong>{" "}
            {record.due_date
              ? new Date(record.due_date).toLocaleDateString()
              : "Not specified"}
          </p>

          <p>
            <strong>Evidence:</strong>{" "}
            {record.evidence || "No evidence recorded"}
          </p>

          <p>
            <strong>Updated:</strong>{" "}
            {record.updated_at
              ? new Date(record.updated_at).toLocaleString()
              : "Not available"}
          </p>
        </div>

      </div>
    ))
  )}

</div>
      </div>
    );
  }

  // ---------------- SILENT RISK ----------------

  if (page === "silent-risk") {
    const silentRisks = [
  {
    mine: "Mine A",
    location: "Jharkhand",
    signal: "Ventilation performance decreasing",
    change: "18%",
    risk: "High",
    recommendation: "Immediate inspection recommended",
  },
  {
    mine: "Mine B",
    location: "Odisha",
    signal: "Inspection frequency decreasing",
    change: "12%",
    risk: "Medium",
    recommendation: "Schedule inspection",
  },
  {
    mine: "Mine C",
    location: "Chhattisgarh",
    signal: "Compliance trend improving",
    change: "9%",
    risk: "Low",
    recommendation: "Continue monitoring",
  },
];

    return (
      <div className="app">
        <button className="back-btn" onClick={() => setPage("dashboard")}>
          ← Back to Dashboard
        </button>

        <div className="silent-header">
          <h1>⚠️ Silent Risk Detector</h1>
          <p>
            Detect gradual changes that may become future compliance or safety
            risks.
          </p>
        </div>

        <div className="silent-list">
          {silentRisks.map((item) => (
            <div className="silent-card" key={item.mine}>
              <h2>{item.mine}</h2>
              <p className="mine-location">
                  📍{item.location}
              </p>
              <p>
                <strong>Signal:</strong> {item.signal}
              </p>
              <p>
                <strong>Change:</strong> {item.change}
              </p>
              <p>
                <strong>Risk:</strong>{" "}
                <span
                  className={
                    item.risk === "High"
                      ? "risk-high"
                      : item.risk === "Medium"
                      ? "risk-medium"
                      : "risk-low"
                  }
                >
                  {item.risk}
                </span>
              </p>

              <button
  className="recommendation-btn"
  onClick={() => setSelectedRisk(item)}
>
  🤖 View AI Recommendation
</button>

{selectedRisk?.mine === item.mine && (
  <div className="ai-action">
    <strong>🤖 AI Recommendation</strong>

    <p>{item.recommendation}</p>

    <button
      className="close-recommendation"
      onClick={() => setSelectedRisk(null)}
    >
      Close
    </button>
  </div>
)}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ---------------- INSPECTION PRIORITY ----------------

  if (page === "inspection") {
    
    return (
      <div className="app">
        <button className="back-btn" onClick={() => setPage("dashboard")}>
          ← Back to Dashboard
        </button>

        <div className="inspection-header">
          <h1>🎯 Smart Inspection Priority</h1>
          <p>
            AI-assisted ranking of mines based on risk indicators and
            compliance trends.
          </p>
        </div>

        <div className="inspection-list">
          {inspectionList.map((item) => (
            <div className="inspection-card" key={item.rank}>
              <div className="rank">#{item.rank}</div>

              <h2>{item.mine}</h2>

              <p>
                <strong>Risk Score:</strong> {item.risk}%
              </p>

              <div className="progress">
                <div
                  className="progress-fill"
                  style={{ width: `${item.risk}%` }}
                ></div>
              </div>

              <p>
                <strong>Priority:</strong>{" "}
                <span
                  className={
                    item.priority === "Urgent"
                      ? "priority-urgent"
                      : item.priority === "High"
                      ? "priority-high"
                      : item.priority === "Medium"
                      ? "priority-medium"
                      : "priority-low"
                  }
                >
                  {item.priority}
                </span>
              </p>

              <p>
  <strong>Reason:</strong>{" "}
  {item.compliance_issues > 0
    ? `${item.compliance_issues} compliance issue(s) identified`
    : item.pending_activities > 0
    ? `${item.pending_activities} pending field activity/activities`
    : "No immediate compliance issue detected"}
</p>

<p>
  <strong>Recommendation:</strong>{" "}
  {item.priority === "Urgent"
    ? "Immediate inspection recommended."
    : item.priority === "High"
    ? "Schedule inspection at the earliest."
    : item.priority === "Medium"
    ? "Plan inspection and continue monitoring."
    : "Continue routine monitoring."}
</p>
              <button className="inspect-btn">View Inspection Plan</button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ---------------- RISK FINGERPRINT ----------------

  if (page === "fingerprint") {
    const mine = mines[0];

    return (
      <div className="app">
        <button className="back-btn" onClick={() => setPage("dashboard")}>
          ← Back to Dashboard
        </button>

        <div className="fingerprint">
          <h1>📊 Mine Risk Overview</h1>
          <p>AI-assisted risk profile for {mine.name}</p>

          <div className="overall">
            <h2>Overall Risk Score</h2>
            <strong>{mine.overall}</strong>
            <p>High Risk</p>
          </div>

          <div className="risk-grid">
            <div>
              <h3>Safety</h3>
              <strong>{mine.safety}</strong>
            </div>

            <div>
              <h3>Compliance</h3>
              <strong>{mine.compliance}</strong>
            </div>

            <div>
              <h3>Inspection</h3>
              <strong>{mine.inspection}</strong>
            </div>

            <div>
              <h3>Violations</h3>
              <strong>{mine.violations}</strong>
            </div>
          </div>

          <div className="explanation">
            <h2>🤖 AI Explanation</h2>
            <p>
              The risk score is elevated because the mine shows compliance
              concerns, increasing risk trends and inspection-related signals.
            </p>

            <button className="action-btn">
              Recommended: Schedule Inspection
            </button>
          </div>
        </div>
      </div>
    );
  }
  // ---------------- WHAT-IF REGULATION SIMULATOR ----------------

if (page === "simulator") {
  const complianceScore = Math.round(
    ventilation * 0.6 + training * 0.4
  );

  const riskScore = 100 - complianceScore;

  let riskLevel = "Low";

  if (riskScore >= 60) {
    riskLevel = "High";
  } else if (riskScore >= 35) {
    riskLevel = "Medium";
  }

  return (
    <div className="app">
      <button
        className="back-btn"
        onClick={() => setPage("dashboard")}
      >
        ← Back to Dashboard
      </button>

      <div className="simulator-header">
        <h1>🔄 What-If Regulation Simulator</h1>

        <p>
          Simulate how changes in compliance requirements could affect
          the predicted mine risk.
        </p>
      </div>

      <div className="simulator-card">

        <h2>⚙️ Regulation Parameters</h2>

        <div className="slider-section">
          <label>
            Ventilation Compliance Requirement:
            <strong>{ventilation}%</strong>
          </label>

          <input
            type="range"
            min="0"
            max="100"
            value={ventilation}
            onChange={(e) =>
              setVentilation(Number(e.target.value))
            }
          />
        </div>

        <div className="slider-section">
          <label>
            Worker Training Compliance Requirement:
            <strong>{training}%</strong>
          </label>

          <input
            type="range"
            min="0"
            max="100"
            value={training}
            onChange={(e) =>
              setTraining(Number(e.target.value))
            }
          />
        </div>

      </div>

      <div className="simulation-result">

        <h2>🤖 Simulation Result</h2>

        <div className="simulation-score">
          <span>Predicted Compliance</span>
          <strong>{complianceScore}%</strong>
        </div>

        <div className="compliance-bar">
          <div
            style={{
              width: `${complianceScore}%`,
            }}
          ></div>
        </div>

        <div className="simulation-score">
          <span>Predicted Risk</span>

          <strong
            className={
              riskLevel === "High"
                ? "risk-high"
                : riskLevel === "Medium"
                ? "risk-medium"
                : "risk-low"
            }
          >
            {riskScore}%
          </strong>
        </div>

        <h3>
          Risk Level:{" "}
          <span
            className={
              riskLevel === "High"
                ? "risk-high"
                : riskLevel === "Medium"
                ? "risk-medium"
                : "risk-low"
            }
          >
            {riskLevel}
          </span>
        </h3>

        <div className="ai-action">
          <strong>AI Explanation</strong>

          <p>
            Changing the regulation parameters changes the expected
            compliance level. Higher compliance requirements may increase
            the predicted risk when a mine cannot meet them.
          </p>
        </div>

        <p className="demo-note">
          ⚠️ Prototype simulation using synthetic data.
        </p>

      </div>
    </div>
  );
}
// ---------------- AI GOVERNANCE ASSISTANT ----------------

if (page === "assistant") {
  const askAssistant = () => {
    const question = assistantQuestion.toLowerCase();

    if (question.includes("highest risk") || question.includes("most risky")) {
      setAssistantAnswer(
        "Mine A currently has the highest risk score among the sample mines, with an overall risk score of 82%. It should receive higher inspection priority."
      );
    } 
    else if (question.includes("mine a") && question.includes("why")) {
      setAssistantAnswer(
        "Mine A shows elevated risk because its compliance score is 76%, violation indicator is 72%, and inspection risk indicator is 91%. The increasing risk trend also requires attention."
      );
    } 
    else if (
      question.includes("inspect first") ||
      question.includes("inspection priority")
    ) {
      setAssistantAnswer(
        "Mine A should be considered first for inspection because it has the highest overall risk score and an increasing risk trend."
      );
    } 
    else if (
      question.includes("best compliance") ||
      question.includes("highest compliance")
    ) {
      setAssistantAnswer(
        "Mine C currently has the highest compliance score among the sample mines, with a compliance score of 40%."
      );
    } 
    else if (
      question.includes("action") ||
      question.includes("recommendation")
    ) {
      setAssistantAnswer(
        "Recommended action: prioritize Mine A for inspection, review its compliance violations, verify safety documentation, and continue monitoring its risk trend."
      );
    } 
    else {
      setAssistantAnswer(
        "I can help with mine risk, compliance, inspection priority, violations, and recommended actions. Try asking: 'Which mine has the highest risk?'"
      );
    }
  };

  return (
    <div className="app">

      <button
        className="back-btn"
        onClick={() => setPage("dashboard")}
      >
        ← Back to Dashboard
      </button>

      <div className="assistant-header">

        <h1>🤖 AI Governance Assistant</h1>

        <p>
          AI-assisted decision support for coal mine governance,
          compliance monitoring, risk analysis and inspection planning.
        </p>

      </div>

      <div className="assistant-card">

        <h2>💬 Ask MineGuard AI</h2>

        <p className="assistant-help">
          Ask a question about mine risk, compliance or inspection priority.
        </p>

        <input
          type="text"
          placeholder="Example: Which mine has the highest risk?"
          value={assistantQuestion}
          onChange={(e) =>
            setAssistantQuestion(e.target.value)
          }
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              askAssistant();
            }
          }}
        />

        <button
          className="ask-btn"
          onClick={askAssistant}
        >
          🤖 Ask AI
        </button>

        {assistantAnswer && (
          <div className="assistant-answer">

            <h3>🤖 MineGuard AI Response</h3>

            <p>{assistantAnswer}</p>

          </div>
        )}

      </div>

      <div className="suggested-questions">

        <h2>💡 Suggested Questions</h2>

        <button
          onClick={() => {
            setAssistantQuestion(
              "Which mine has the highest risk?"
            );
            setAssistantAnswer(
              "Mine A currently has the highest risk score among the sample mines, with an overall risk score of 82%. It should receive higher inspection priority."
            );
          }}
        >
          Which mine has the highest risk?
        </button>

        <button
          onClick={() => {
            setAssistantQuestion(
              "Why is Mine A risky?"
            );
            setAssistantAnswer(
              "Mine A shows elevated risk because its compliance score is 76%, violation indicator is 72%, and inspection risk indicator is 91%. The increasing risk trend also requires attention."
            );
          }}
        >
          Why is Mine A risky?
        </button>

        <button
          onClick={() => {
            setAssistantQuestion(
              "Which mine should be inspected first?"
            );
            setAssistantAnswer(
              "Mine A should be considered first for inspection because it has the highest overall risk score and an increasing risk trend."
            );
          }}
        >
          Which mine should be inspected first?
        </button>

        <button
          onClick={() => {
            setAssistantQuestion(
              "What action should authorities take?"
            );
            setAssistantAnswer(
              "Recommended action: prioritize Mine A for inspection, review its compliance violations, verify safety documentation, and continue monitoring its risk trend."
            );
          }}
        >
          What action should authorities take?
        </button>

      </div>

      <p className="demo-note">
        ⚠️ Prototype AI assistant using synthetic demonstration data.
        Final deployment should use validated mine data and approved governance rules.
      </p>

    </div>
  );
}
// ---------------- LOGIN PAGE ----------------

if (!isLoggedIn) {
  const handleLogin = (e) => {
    e.preventDefault();

    if (username === "admin" && password === "mineguard123") {
      setIsLoggedIn(true);
      setLoginError("");
    } else {
      setLoginError("Invalid username or password");
    }
  };

  return (
    <div className="login-page">

      <div className="login-card">

        <div className="login-icon">
          ⛏️
        </div>

        <h1>MineGuard AI</h1>

        <h2>Smart Coal Mine Governance</h2>

        <p className="login-subtitle">
          AI-assisted compliance monitoring and risk prioritization
        </p>

        <form onSubmit={handleLogin}>

          <label>Username</label>

          <input
            type="text"
            placeholder="Enter username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />

          <label>Password</label>

          <input
            type="password"
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {loginError && (
            <p className="login-error">
              ⚠️ {loginError}
            </p>
          )}

          <button type="submit" className="login-btn">
            🔐 Login
          </button>

        </form>

        <p className="demo-login">
          Demo Login: admin / mineguard123
        </p>

      </div>

    </div>
  );
}

  // ---------------- DASHBOARD ----------------

return (
  <div className="app">

    {/* ================= HEADER ================= */}

    <header className="dashboard-header">

      <div className="brand">
        <h1>⛏️ MineGuard AI</h1>

        <h2>
          Smart Coal Mine Governance Dashboard
        </h2>

        <p>
          AI-assisted compliance monitoring and real-time risk prioritization
        </p>
      </div>

      <div className="system-status">
        <span className="status-dot"></span>
        SYSTEM LIVE
      </div>

    </header>


    {/* ================= SUMMARY ================= */}

    <section className="stats">

      <div className="stat-card total">
        <span className="stat-icon">🏭</span>
        <div>
          <h3>Total Mines</h3>
          <strong>128</strong>
          <p>Monitored Sites</p>
        </div>
      </div>


      <div className="stat-card high">
        <span className="stat-icon">🔴</span>
        <div>
          <h3>High Risk</h3>
          <strong>17</strong>
          <p>Needs Attention</p>
        </div>
      </div>


      <div className="stat-card medium">
        <span className="stat-icon">🟠</span>
        <div>
          <h3>Medium Risk</h3>
          <strong>43</strong>
          <p>Under Monitoring</p>
        </div>
      </div>


      <div className="stat-card low">
        <span className="stat-icon">🟢</span>
        <div>
          <h3>Low Risk</h3>
          <strong>68</strong>
          <p>Normal Monitoring</p>
        </div>
      </div>

    </section>


    {/* ================= REAL-TIME MONITORING ================= */}

    <section className="realtime-section">

      <div className="section-header">

        <div>
          <h2>🔴 Real-Time Mine Monitoring</h2>

          <p>
            {realtimeData
              ? `${realtimeData.mine} • ${realtimeData.sector}`
              : "Connecting to monitoring service..."}
          </p>
        </div>


        <div className="live-badge">
          <span></span>
          LIVE
        </div>

      </div>


      {/* ================= SENSOR CARDS ================= */}

      {realtimeData ? (

        <div className="sensor-grid">

          <div className="sensor-card oxygen">
            <span className="sensor-label">O₂</span>
            <strong>
              {realtimeData.oxygen}%
            </strong>
            <small>Oxygen</small>
          </div>


          <div className="sensor-card co2">
            <span className="sensor-label">CO₂</span>
            <strong>
              {realtimeData.co2}%
            </strong>
            <small>Carbon Dioxide</small>
          </div>


          <div className="sensor-card co">
            <span className="sensor-label">CO</span>
            <strong>
              {realtimeData.carbon_monoxide}
            </strong>
            <small>ppm</small>
          </div>


          <div className="sensor-card methane">
            <span className="sensor-label">CH₄</span>
            <strong>
              {realtimeData.methane}%
            </strong>
            <small>Methane</small>
          </div>


          <div className="sensor-card">
            <span className="sensor-label">🌡️</span>
            <strong>
              {realtimeData.temperature}°C
            </strong>
            <small>Temperature</small>
          </div>


          <div className="sensor-card">
            <span className="sensor-label">💨</span>
            <strong>
              {realtimeData.airflow}
            </strong>
            <small>Airflow</small>
          </div>


          <div className="sensor-card">
            <span className="sensor-label">💧</span>
            <strong>
              {realtimeData.water_level}
            </strong>
            <small>Water Level</small>
          </div>


          <div className="sensor-card risk">
            <span className="sensor-label">⚠️</span>
            <strong>
              {realtimeData.risk_score}%
            </strong>
            <small>
              {realtimeData.risk} Risk
            </small>
          </div>

        </div>

      ) : (

        <div className="connecting">
          Loading real-time sensor data...
        </div>

      )}


    {/* ================= GAS LIMIT MONITORING ================= */}

<div className="graph-card">

  <div className="graph-header">
    <div>
      <h3>📊 Gas Readings vs Safety Limits</h3>
      <p>Real-time gas monitoring and risk detection</p>
    </div>

    <div>
      <span>🔵 Current Reading</span>
      <span style={{ marginLeft: "20px" }}>
        🔴 Safety Limit
      </span>
    </div>
  </div>

  {realtimeData && (
    <div className="gas-limit-grid">

      {/* METHANE */}
      <div className="gas-limit-item">
        <h3>CH₄</h3>

        <p>
          Current:
          <strong>
            {realtimeData.methane}%
          </strong>
        </p>

        <p>
          Limit:
          <strong>0.75%</strong>
        </p>

        {realtimeData.methane > 0.75 ? (
          <div className="gas-danger">
            🔴 LIMIT CROSSED
          </div>
        ) : (
          <div className="gas-safe">
            🟢 NORMAL
          </div>
        )}
      </div>


      {/* CARBON DIOXIDE */}
      <div className="gas-limit-item">
        <h3>CO₂</h3>

        <p>
          Current:
          <strong>
            {realtimeData.co2}%
          </strong>
        </p>

        <p>
          Limit:
          <strong>0.5%</strong>
        </p>

        {realtimeData.co2 > 0.5 ? (
          <div className="gas-danger">
            🔴 LIMIT CROSSED
          </div>
        ) : (
          <div className="gas-safe">
            🟢 NORMAL
          </div>
        )}
      </div>


      {/* CARBON MONOXIDE */}
      <div className="gas-limit-item">
        <h3>CO</h3>

        <p>
          Current:
          <strong>
            {realtimeData.carbon_monoxide} ppm
          </strong>
        </p>

        <p>
          Limit:
          <strong>50 ppm</strong>
        </p>

        {realtimeData.carbon_monoxide > 50 ? (
          <div className="gas-danger">
            🔴 LIMIT CROSSED
          </div>
        ) : (
          <div className="gas-safe">
            🟢 NORMAL
          </div>
        )}
      </div>


      {/* OXYGEN */}
      <div className="gas-limit-item">
        <h3>O₂</h3>

        <p>
          Current:
          <strong>
            {realtimeData.oxygen}%
          </strong>
        </p>

        <p>
          Minimum:
          <strong>Configurable</strong>
        </p>

        <div className="gas-safe">
          🟢 MONITORED
        </div>
      </div>

    </div>
  )}


  {/* OVERALL GAS RISK */}

  {realtimeData && (
    <div className="gas-risk-banner">

      {(
        realtimeData.methane > 0.75 ||
        realtimeData.co2 > 0.5 ||
        realtimeData.carbon_monoxide > 50
      ) ? (

        <>
          <strong>🔴 GAS LIMIT CROSSED</strong>

          <span>
            Immediate attention required. Mine risk has increased.
          </span>
        </>

      ) : (

        <>
          <strong>🟢 GAS LEVELS WITHIN CONFIGURED LIMITS</strong>

          <span>
            Continue real-time monitoring.
          </span>
        </>

      )}

    </div>
  )}

</div>

{/* ================= CURRENT STATUS ================= */}

      {realtimeData && (

        <div className="current-status">

          <div>
            <span>Current Risk</span>
            <strong>
              {realtimeData.risk}
            </strong>
          </div>


          <div>
            <span>Risk Score</span>
            <strong>
              {realtimeData.risk_score}%
            </strong>
          </div>


          <div>
            <span>Mine</span>
            <strong>
              {realtimeData.mine}
            </strong>
          </div>


          <div>
            <span>Last Update</span>
            <strong>
              {realtimeData.timestamp}
            </strong>
          </div>

        </div>

      )}

    </section>

    {/* ================= FEATURES ================= */}

    <section className="features-section">

      <div className="features-heading">

        <h2>MineGuard AI Features</h2>

        <p>
          AI-assisted governance and decision-support modules
        </p>

      </div>


      <div className="features">

        <button
          onClick={() => setPage("fingerprint")}
        >
          <span>📊</span>
          <div>
            <strong>Mine Risk Overview</strong>
            <small>View overall mine risk</small>
          </div>
        </button>


        <button
          onClick={() => setPage("silent-risk")}
        >
          <span>⚠️</span>
          <div>
            <strong>Silent Risk Detector</strong>
            <small>Detect hidden risk patterns</small>
          </div>
        </button>


        <button
          onClick={() => setPage("compliance")}
        >
          <span>📋</span>
          <div>
            <strong>Compliance Monitoring</strong>
            <small>Track safety requirements</small>
          </div>
        </button>


        <button
          onClick={() => setPage("inspection")}
        >
          <span>🎯</span>
          <div>
            <strong>Smart Inspection Priority</strong>
            <small>Prioritize inspections</small>
          </div>
        </button>


        <button
          onClick={() => setPage("documents")}
        >
          <span>📄</span>
          <div>
            <strong>AI Document Analyzer</strong>
            <small>Analyze compliance documents</small>
          </div>
        </button>


        <button
          onClick={() => setPage("simulator")}
        >
          <span>🔄</span>
          <div>
            <strong>What-If Regulation Simulator</strong>
            <small>Test possible scenarios</small>
          </div>
        </button>


        <button
          onClick={() => setPage("assistant")}
        >
          <span>🤖</span>
          <div>
            <strong>AI Governance Assistant</strong>
            <small>Ask governance questions</small>
          </div>
        </button>

      </div>

    </section>


    {/* ================= FOOTER ================= */}

    <footer className="dashboard-footer">

      <strong>MineGuard AI</strong>

      <span>
        AI-assisted coal mine governance and compliance monitoring
      </span>

      <small>
        Prototype • Real-time monitoring stream is simulated for demonstration
      </small>

    </footer>

  </div>
);
}
export default App;