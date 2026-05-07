import { useEffect, useState } from "react";
import api from "../services/api";

import HospitalApproval from "../components/admin/HospitalApproval";
import BloodBankApproval from "../components/admin/BloodBankApproval";
import BlockchainLogs from "../components/admin/BlockchainLogs";
import UserManagement from "../components/admin/UserManagement";
import BloodPrediction from "../components/admin/BloodPrediction";
import BloodHeatmap from "../components/features/BloodHeatmap";
import FraudDetection from "../components/features/FraudDetection";
import LifecycleTracker from "../components/features/LifecycleTracker";
import CrossBankNetwork from "../components/features/CrossBankNetwork";
import BlockchainViewer from "../components/admin/BlockchainViewer";
import blockchainIntegrityIcon from "../assets/blockchainlogs.png";
import dashboardIcon from "../assets/admin.png";
import hospitalIcon from "../assets/hospital.png";
import usersIcon from "../assets/user.png";
import donorsIcon from "../assets/donor.png";
import predictionIcon from "../assets/bloodprediction.png";
import heatmapIcon from "../assets/bloodheatmap.png";
import fraudIcon from "../assets/fraud.png";
import lifecycleIcon from "../assets/lifecycle.png";
import networkIcon from "../assets/cross.png";
import blockchainIcon from "../assets/blockchainlogs.png";
import logsIcon from "../assets/blockchainviewer.png";
import adminIcon from "../assets/admin.png";


export default function AdminDashboard({ activeSection = "dashboard" }) {
  const [securityAlerts, setSecurityAlerts] = useState([]);
  const [blockchainStatus, setBlockchainStatus] = useState(null); // null = not checked yet
  const [verifying, setVerifying] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const [repairStatus, setRepairStatus] = useState(null); // null | "success" | "error"
  const [dismissing, setDismissing] = useState(false);

  useEffect(() => {
    // Fetch ONLY unread security alerts (not all notifications)
    fetchSecurityAlerts();
  }, []);

  const fetchSecurityAlerts = async () => {
    try {
      const res = await api.get("/notifications/security-alerts");
      setSecurityAlerts(res.data);
    } catch (error) {
      console.error("Security alerts fetch error", error);
    }
  };

  const verifyBlockchain = async () => {
    setVerifying(true);
    setRepairStatus(null);
    try {
      const res = await api.get("/blockchain/validate");
      setBlockchainStatus(res.data.valid);
      // Refresh security alerts after verification
      await fetchSecurityAlerts();
    } catch (error) {
      console.error("Blockchain validation error", error);
      setBlockchainStatus(false);
    } finally {
      setVerifying(false);
    }
  };

  const repairBlockchain = async () => {
    setRepairing(true);
    setRepairStatus(null);
    try {
      await api.get("/donors/repair");
      setRepairStatus("success");
      setBlockchainStatus(null); // reset so admin re-verifies after repair
      await fetchSecurityAlerts();
    } catch (error) {
      console.error("Blockchain repair error", error);
      setRepairStatus("error");
    } finally {
      setRepairing(false);
    }
  };

  const dismissAlerts = async () => {
    setDismissing(true);
    try {
      await api.put("/notifications/dismiss-security-alerts");
      setSecurityAlerts([]);
      setBlockchainStatus(null);
      setRepairStatus(null);
    } catch (err) {
      console.error("Dismiss error", err);
    } finally {
      setDismissing(false);
    }
  };

  const showTamperingAlert = blockchainStatus === false;
  const sectionTitles = {
    dashboard: (
      <span className="flex items-center gap-2">
        <img src={dashboardIcon} className="w-5 h-5" />
        Admin Dashboard
      </span>
    ),
    hospitals: (
      <span className="flex items-center gap-2">
        <img src={hospitalIcon} className="w-5 h-5" />
        Hospital Approval
      </span>
    ),
    users: (
      <span className="flex items-center gap-2">
        <img src={usersIcon} className="w-5 h-5" />
        User Management
      </span>
    ),
    donors: (
      <span className="flex items-center gap-2">
        <img src={donorsIcon} className="w-5 h-5" />
        Donors List
      </span>
    ),
    prediction: (
      <span className="flex items-center gap-2">
        <img src={predictionIcon} className="w-5 h-5" />
        Blood Prediction
      </span>
    ),
    heatmap: (
      <span className="flex items-center gap-2">
        <img src={heatmapIcon} className="w-5 h-5" />
        Blood Heatmap
      </span>
    ),
    fraud: (
      <span className="flex items-center gap-2">
        <img src={fraudIcon} className="w-5 h-5" />
        Fraud Detection
      </span>
    ),
    lifecycle: (
      <span className="flex items-center gap-2">
        <img src={lifecycleIcon} className="w-5 h-5" />
        Lifecycle Tracker
      </span>
    ),
    network: (
      <span className="flex items-center gap-2">
        <img src={networkIcon} className="w-5 h-5" />
        Cross-Bank Network
      </span>
    ),
    blockchain: (
      <span className="flex items-center gap-2">
        <img src={blockchainIcon} className="w-5 h-5" />
        Blockchain Viewer
      </span>
    ),
    logs: (
      <span className="flex items-center gap-2">
        <img src={logsIcon} className="w-5 h-5" />
        Blockchain Logs
      </span>
    ),
  };

  return (
    <div>
      <div className="panel" style={{ marginBottom:16 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <h2
  style={{
    fontSize: "1.4rem",
    fontWeight: 700,
    fontFamily: "'Times New Roman',Times,serif",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  }}
>
  {sectionTitles[activeSection] || (
    <>
      <img src={adminIcon} alt="admin" style={{ width: 22, height: 22 }} />
      Admin Dashboard
    </>
  )}
</h2>
          <div style={{ position:"relative" }}>
            <span style={{ fontSize:"1.5rem" }}>🔔</span>
            {securityAlerts.length > 0 && (
              <span style={{ position:"absolute", top:-4, right:-6, background:"#dc2626", color:"#fff", fontSize:"0.65rem", padding:"1px 6px", borderRadius:"9999px", fontWeight:700 }}>
                {securityAlerts.length}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Blockchain Integrity — always visible on dashboard */}
      {(activeSection === "dashboard" || activeSection === "blockchain") && (
        <div className="panel">
          <h3 className="panel-title flex items-center gap-2">
            <img
              src={blockchainIntegrityIcon}
              alt="blockchain"
              className="w-5 h-5"
            />
            Blockchain Integrity
          </h3>
          {/* Verify row */}
          <div style={{ display:"flex", alignItems:"center", gap:16, flexWrap:"wrap", marginBottom:12 }}>
            <button onClick={verifyBlockchain} disabled={verifying || repairing} style={{ background:"#0096FF" }}>
              {verifying ? " Verifying…" : " Verify Blockchain Integrity"}
            </button>
            {blockchainStatus === true  && <span style={{ color:"#059669", fontWeight:700 }}> Blockchain Verified — No Tampering Detected</span>}
            {blockchainStatus === false && <span style={{ color:"#dc2626", fontWeight:700 }}> Blockchain Invalid — Tampering Detected!</span>}
            {blockchainStatus === null  && <span style={{ color:"#9ca3af", fontStyle:"italic" }}></span>}
          </div>
          {/* Repair row */}
          <div style={{ display:"flex", alignItems:"center", gap:16, flexWrap:"wrap" }}>
            <button
              onClick={repairBlockchain}
              disabled={repairing || verifying}
              style={{ background:"#7C3AED" }}
            >
              {repairing ? " Repairing…" : " Repair Blockchain"}
            </button>
            {repairStatus === "success" && (
              <span style={{ color:"#059669", fontWeight:700 }}>
                Blockchain repaired successfully — please verify again to confirm
              </span>
            )}
            {repairStatus === "error" && (
              <span style={{ color:"#dc2626", fontWeight:700 }}>
                 Repair failed — check server logs
              </span>
            )}
            {repairStatus === null && (
              <span style={{ color:"#9ca3af", fontStyle:"italic" }}>
              </span>
            )}
          </div>
        </div>
      )}

      {showTamperingAlert && (
        <div className="alert alert-error"> Blockchain tampering detected! Please review immediately.</div>
      )}

      {securityAlerts.length > 0 && (activeSection === "dashboard" || activeSection === "blockchain") && (
        <div className="panel" style={{ borderLeft:"4px solid #dc2626" }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:12 }}>
            <h3 className="panel-title" style={{ marginBottom:0, borderBottom:"none" }}> Security Alerts ({securityAlerts.length})</h3>
            <button onClick={dismissAlerts} disabled={dismissing} className="btn-gray" style={{ fontSize:"0.78rem", padding:"5px 12px" }}>
              {dismissing ? "Dismissing…" : "Dismiss All"}
            </button>
          </div>
          {securityAlerts.map(a => (
            <p key={a._id} style={{ fontSize:"0.85rem", color:"#374151", marginBottom:8, borderBottom:"1px solid #f3f4f6", paddingBottom:6 }}>
              {a.message}<span style={{ color:"#9ca3af", fontSize:"0.75rem", marginLeft:8 }}>{new Date(a.createdAt).toLocaleString()}</span>
            </p>
          ))}
        </div>
      )}

      {securityAlerts.length === 0 && blockchainStatus !== false && activeSection === "dashboard" && (
        <div className="alert alert-success"> No security alerts. System is operating normally.</div>
      )}

      {(activeSection === "dashboard" || activeSection === "hospitals") && (
        <div className="panel"><HospitalApproval /></div>
      )}
      {(activeSection === "dashboard" || activeSection === "bloodbanks") && (
        <div className="panel"><BloodBankApproval /></div>
      )}
      {activeSection === "blockchain" && (
        <div className="panel"><BlockchainViewer /></div>
      )}
      {(activeSection === "dashboard" || activeSection === "heatmap") && (
        <div className="panel"><BloodHeatmap /></div>
      )}
      {(activeSection === "dashboard" || activeSection === "fraud") && (
        <div className="panel"><FraudDetection /></div>
      )}
      {(activeSection === "dashboard" || activeSection === "lifecycle") && (
        <div className="panel"><LifecycleTracker /></div>
      )}
      {(activeSection === "dashboard" || activeSection === "network") && (
        <div className="panel"><CrossBankNetwork /></div>
      )}
      {(activeSection === "dashboard" || activeSection === "logs") && (
        <div className="panel"><BlockchainLogs /></div>
      )}
      {(activeSection === "dashboard" || activeSection === "users") && (
        <div className="panel"><UserManagement /></div>
      )}
      {(activeSection === "dashboard" || activeSection === "prediction") && (
        <div className="panel"><BloodPrediction /></div>
      )}
    </div>
  );
}
