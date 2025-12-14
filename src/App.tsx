import { useState, useEffect } from "react";
import { useAuthenticator } from "@aws-amplify/ui-react";
import { 
  createDetection, 
  updateDetection, 
  getDetection, 
  deleteDetection, 
  listAllDetections,
  LeafDetection 
} from "./api/leafDetectionApi";
import "./App.css";

function App() {
  const { user, signOut } = useAuthenticator();
  
  // Upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [farmerId, setFarmerId] = useState("farmer-brian");
  const [location, setLocation] = useState("");
  const [selectedLabel, setSelectedLabel] = useState("unlabeled");
  const [selectedPestType, setSelectedPestType] = useState("unknown");
  
  // Detection state
  const [currentDetection, setCurrentDetection] = useState<LeafDetection | null>(null);
  const [allDetections, setAllDetections] = useState<LeafDetection[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Search state
  const [searchId, setSearchId] = useState("");
  const [showHistory, setShowHistory] = useState(false);

  // Load all detections on mount
  useEffect(() => {
    loadAllDetections();
  }, []);

  // Load all detections
  const loadAllDetections = async () => {
    try {
      const detections = await listAllDetections();
      setAllDetections(detections);
      console.log("Loaded detections:", detections.length);
    } catch (error) {
      console.error("Failed to load detections:", error);
    }
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Validation
  const validateForm = (): boolean => {
    if (!selectedFile) {
      alert("❌ Please select a photo!");
      return false;
    }
    if (!farmerId.trim()) {
      alert("❌ Please enter Farmer ID!");
      return false;
    }
    if (!location.trim()) {
      alert("❌ Please enter Location!");
      return false;
    }
    if (selectedLabel === "unlabeled") {
      alert("❌ Please select a label (Good or Bad)!");
      return false;
    }
    return true;
  };

  // Upload image with label
  const handleUpload = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = (reader.result as string).split(',')[1];
        
        const detection = await createDetection({
          farmerId,
          content: `${selectedLabel} - ${selectedPestType}`,
          location,
          imageData: base64String,
          imageType: selectedFile!.type,
        });
        
        if (selectedLabel !== 'unlabeled') {
          const updated = await updateDetection(detection.id, selectedLabel, selectedPestType);
          setCurrentDetection({ ...updated, photoUrl: previewUrl });
        } else {
          setCurrentDetection({ ...detection, photoUrl: previewUrl });
        }
        
        // Reload all detections to update history
        await loadAllDetections();
        
        alert("✅ Detection uploaded successfully!");
        
        // Reset form but keep result
        setSelectedFile(null);
        setLocation("");
        setSelectedLabel("unlabeled");
        setSelectedPestType("unknown");
      };
      reader.readAsDataURL(selectedFile!);
    } catch (error) {
      console.error(error);
      alert("❌ Failed to upload detection");
    } finally {
      setLoading(false);
    }
  };

  // Quick label buttons
  const quickLabel = (label: string, pestType: string) => {
    setSelectedLabel(label);
    setSelectedPestType(pestType);
  };

  // Load existing detection by ID
  const handleLoadDetection = async () => {
    if (!searchId.trim()) {
      alert("❌ Please enter a Detection ID!");
      return;
    }

    setLoading(true);
    try {
      const detection = await getDetection(searchId);
      setCurrentDetection(detection);
      setPreviewUrl(detection.photoUrl);
      alert("✅ Detection loaded!");
    } catch (error) {
      console.error(error);
      alert("❌ Detection not found!");
    } finally {
      setLoading(false);
    }
  };

  // Load detection from history list
  const handleSelectFromHistory = (detection: LeafDetection) => {
    setCurrentDetection(detection);
    setPreviewUrl(detection.photoUrl);
    setShowHistory(false);
  };

  // Update label of current detection
  const handleUpdateLabel = async (newLabel: string, newPestType: string) => {
    if (!currentDetection) {
      alert("❌ No detection loaded!");
      return;
    }

    if (!confirm(`Change label to: ${newLabel} (${newPestType})?`)) {
      return;
    }

    setLoading(true);
    try {
      const updated = await updateDetection(currentDetection.id, newLabel, newPestType);
      setCurrentDetection({ ...updated, photoUrl: currentDetection.photoUrl });
      
      // Reload all detections to update history
      await loadAllDetections();
      
      alert("✅ Label updated successfully!");
    } catch (error) {
      console.error(error);
      alert("❌ Failed to update label!");
    } finally {
      setLoading(false);
    }
  };

  // Delete current detection
  const handleDelete = async () => {
    if (!currentDetection) {
      alert("❌ No detection to delete!");
      return;
    }

    if (!confirm(`Are you sure you want to delete detection ${currentDetection.id}?`)) {
      return;
    }

    setLoading(true);
    try {
      await deleteDetection(currentDetection.id);
      setCurrentDetection(null);
      setPreviewUrl("");
      setSearchId("");
      
      // Reload all detections to update history
      await loadAllDetections();
      
      alert("✅ Detection deleted successfully!");
    } catch (error) {
      console.error(error);
      alert("❌ Failed to delete detection!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ padding: "20px", maxWidth: "1200px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1>🍃 LeafAI - Pest Detection System</h1>
          <p>Welcome, {user?.signInDetails?.loginId?.split("@")[0]}!</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ fontSize: "18px", fontWeight: "bold", color: "#2196F3" }}>
            📊 Total Uploads: {allDetections.length}
          </p>
        </div>
      </div>

      {/* UPLOAD HISTORY DROPDOWN */}
      <div style={{ 
        marginTop: "20px", 
        marginBottom: "20px",
        border: "2px solid #2196F3",
        borderRadius: "10px",
        padding: "15px",
        background: "#f0f8ff"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0 }}>📜 Upload History ({allDetections.length})</h3>
          <button
            onClick={() => setShowHistory(!showHistory)}
            style={{
              background: "#2196F3",
              color: "white",
              padding: "8px 15px",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer"
            }}
          >
            {showHistory ? "▲ Hide" : "▼ Show"} History
          </button>
        </div>

        {showHistory && (
          <div style={{ marginTop: "15px", maxHeight: "300px", overflowY: "auto" }}>
            {allDetections.length === 0 ? (
              <p style={{ textAlign: "center", color: "#999" }}>No uploads yet</p>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#e3f2fd" }}>
                    <th style={{ padding: "10px", textAlign: "left", border: "1px solid #ddd" }}>ID</th>
                    <th style={{ padding: "10px", textAlign: "left", border: "1px solid #ddd" }}>Farmer</th>
                    <th style={{ padding: "10px", textAlign: "left", border: "1px solid #ddd" }}>Location</th>
                    <th style={{ padding: "10px", textAlign: "left", border: "1px solid #ddd" }}>Label</th>
                    <th style={{ padding: "10px", textAlign: "left", border: "1px solid #ddd" }}>Date</th>
                    <th style={{ padding: "10px", textAlign: "center", border: "1px solid #ddd" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {allDetections.map((detection) => (
                    <tr key={detection.id} style={{ borderBottom: "1px solid #ddd" }}>
                      <td style={{ padding: "8px", fontSize: "12px", border: "1px solid #ddd" }}>
                        {detection.id.substring(0, 20)}...
                      </td>
                      <td style={{ padding: "8px", border: "1px solid #ddd" }}>{detection.farmerId}</td>
                      <td style={{ padding: "8px", border: "1px solid #ddd" }}>{detection.location || "N/A"}</td>
                      <td style={{ padding: "8px", border: "1px solid #ddd" }}>
                        <span style={{
                          background: detection.label === "good" ? "#4CAF50" : "#f44336",
                          color: "white",
                          padding: "3px 8px",
                          borderRadius: "3px",
                          fontSize: "12px"
                        }}>
                          {detection.label}
                        </span>
                      </td>
                      <td style={{ padding: "8px", fontSize: "12px", border: "1px solid #ddd" }}>
                        {new Date(detection.createdAt).toLocaleDateString()}
                      </td>
                      <td style={{ padding: "8px", textAlign: "center", border: "1px solid #ddd" }}>
                        <button
                          onClick={() => handleSelectFromHistory(detection)}
                          style={{
                            background: "#FF9800",
                            color: "white",
                            padding: "5px 10px",
                            border: "none",
                            borderRadius: "3px",
                            cursor: "pointer",
                            fontSize: "12px"
                          }}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginTop: "20px" }}>
        
        {/* LEFT PANEL - Upload */}
        <div style={{ border: "2px solid #ddd", padding: "20px", borderRadius: "10px" }}>
          <h2>📸 Upload & Label Image</h2>
          
          {/* File Input */}
          <div style={{ marginBottom: "15px" }}>
            <label style={{ fontWeight: "bold", display: "block", marginBottom: "5px" }}>
              Photo: <span style={{ color: "red" }}>*</span>
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              style={{ marginBottom: "10px", width: "100%" }}
            />
          </div>

          {/* Image Preview */}
          {previewUrl && (
            <div style={{ marginBottom: "15px", textAlign: "center" }}>
              <img 
                src={previewUrl} 
                alt="Preview" 
                style={{ 
                  maxWidth: "100%", 
                  maxHeight: "300px", 
                  border: "2px solid #4CAF50",
                  borderRadius: "8px"
                }}
              />
            </div>
          )}

          {/* Farmer Details */}
          <div style={{ marginBottom: "15px" }}>
            <label style={{ fontWeight: "bold", display: "block", marginBottom: "5px" }}>
              Farmer ID: <span style={{ color: "red" }}>*</span>
            </label>
            <input
              type="text"
              placeholder="Farmer ID"
              value={farmerId}
              onChange={(e) => setFarmerId(e.target.value)}
              style={{ padding: "8px", width: "100%", marginBottom: "8px" }}
            />
            
            <label style={{ fontWeight: "bold", display: "block", marginBottom: "5px" }}>
              Location: <span style={{ color: "red" }}>*</span>
            </label>
            <input
              type="text"
              placeholder="Location (e.g., Field A-23)"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              style={{ padding: "8px", width: "100%" }}
            />
          </div>

          {/* Label Selection */}
          <div style={{ marginBottom: "15px" }}>
            <h3>🏷️ Select Label: <span style={{ color: "red" }}>*</span></h3>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <button 
                onClick={() => quickLabel("good", "healthy")}
                style={{ 
                  background: selectedLabel === "good" ? "#4CAF50" : "#ddd",
                  color: selectedLabel === "good" ? "white" : "black",
                  padding: "10px 15px",
                  border: "none",
                  borderRadius: "5px",
                  cursor: "pointer",
                  flex: "1"
                }}
              >
                ✅ Good (Healthy)
              </button>
              <button 
                onClick={() => quickLabel("bad", "aphid")}
                style={{ 
                  background: selectedLabel === "bad" && selectedPestType === "aphid" ? "#f44336" : "#ddd",
                  color: selectedLabel === "bad" && selectedPestType === "aphid" ? "white" : "black",
                  padding: "10px 15px",
                  border: "none",
                  borderRadius: "5px",
                  cursor: "pointer",
                  flex: "1"
                }}
              >
                ❌ Bad 
              </button>
            </div>
            
            <p style={{ marginTop: "10px", fontSize: "14px" }}>
              Current: <strong>{selectedLabel}</strong> - <strong>{selectedPestType}</strong>
            </p>
          </div>

          {/* Upload Button */}
          <button
            onClick={handleUpload}
            disabled={loading}
            style={{
              background: "#2196F3",
              color: "white",
              padding: "15px",
              width: "100%",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
              fontSize: "16px",
              fontWeight: "bold",
              opacity: loading ? 0.6 : 1
            }}
          >
            {loading ? "⏳ Uploading..." : "📤 Upload & Save Detection"}
          </button>
          
          <p style={{ fontSize: "12px", color: "#666", marginTop: "10px" }}>
            <span style={{ color: "red" }}>*</span> Required fields
          </p>

          {/* Load Existing Detection */}
          <div style={{ marginTop: "30px", paddingTop: "20px", borderTop: "2px solid #ddd" }}>
            <h3>🔍 Load by ID</h3>
            <div style={{ display: "flex", gap: "10px" }}>
              <input
                type="text"
                placeholder="Enter Detection ID"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                style={{ padding: "8px", flex: "1" }}
              />
              <button
                onClick={handleLoadDetection}
                disabled={loading}
                style={{
                  background: "#FF9800",
                  color: "white",
                  padding: "8px 15px",
                  border: "none",
                  borderRadius: "5px",
                  cursor: "pointer"
                }}
              >
                Load
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL - Result */}
        <div style={{ border: "2px solid #ddd", padding: "20px", borderRadius: "10px" }}>
          <h2>📊 Detection Result</h2>
          
          {currentDetection ? (
            <div>
              <div style={{ 
                background: currentDetection.label === "good" ? "#e8f5e9" : "#ffebee",
                padding: "15px",
                borderRadius: "8px",
                marginBottom: "15px"
              }}>
                <h3 style={{ margin: "0 0 10px 0" }}>
                  {currentDetection.label === "good" ? "✅ Healthy Leaf" : "❌ Diseased Leaf"}
                </h3>
                <p><strong>ID:</strong> {currentDetection.id}</p>
                <p><strong>Farmer:</strong> {currentDetection.farmerId}</p>
                <p><strong>Location:</strong> {currentDetection.location || "N/A"}</p>
                <p><strong>Pest Type:</strong> {currentDetection.pestType}</p>
                <p><strong>Label:</strong> {currentDetection.label}</p>
                <p><strong>Uploaded:</strong> {new Date(currentDetection.createdAt).toLocaleString()}</p>
              </div>

              {/* Show uploaded image */}
              {currentDetection.photoUrl && (
                <div style={{ textAlign: "center", marginTop: "15px", marginBottom: "15px" }}>
                  <h4>Uploaded Image:</h4>
                  <img 
                    src={currentDetection.photoUrl} 
                    alt="Uploaded detection"
                    style={{ 
                      maxWidth: "100%", 
                      maxHeight: "300px",
                      borderRadius: "8px",
                      border: "2px solid #ccc"
                    }}
                  />
                </div>
              )}

              {/* UPDATE LABEL BUTTONS */}
              <div style={{ marginBottom: "15px" }}>
                <h4>🔄 Update Label:</h4>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    onClick={() => handleUpdateLabel("good", "healthy")}
                    disabled={loading}
                    style={{
                      background: "#4CAF50",
                      color: "white",
                      padding: "10px",
                      flex: "1",
                      border: "none",
                      borderRadius: "5px",
                      cursor: "pointer"
                    }}
                  >
                    ✅ Mark as Good
                  </button>
                  <button
                    onClick={() => handleUpdateLabel("bad", "aphid")}
                    disabled={loading}
                    style={{
                      background: "#f44336",
                      color: "white",
                      padding: "10px",
                      flex: "1",
                      border: "none",
                      borderRadius: "5px",
                      cursor: "pointer"
                    }}
                  >
                    ❌ Mark as Bad
                  </button>
                </div>
              </div>

              {/* DELETE BUTTON */}
              <button
                onClick={handleDelete}
                disabled={loading}
                style={{
                  background: "#d32f2f",
                  color: "white",
                  padding: "12px",
                  width: "100%",
                  border: "none",
                  borderRadius: "5px",
                  cursor: "pointer",
                  fontWeight: "bold"
                }}
              >
                🗑️ Delete Detection
              </button>

              <details style={{ marginTop: "15px" }}>
                <summary style={{ cursor: "pointer", fontWeight: "bold" }}>
                  View Raw Data
                </summary>
                <pre style={{ 
                  background: "#f5f5f5", 
                  padding: "10px", 
                  borderRadius: "5px",
                  overflow: "auto",
                  fontSize: "12px"
                }}>
                  {JSON.stringify(currentDetection, null, 2)}
                </pre>
              </details>
            </div>
          ) : (
            <div style={{ 
              textAlign: "center", 
              padding: "50px", 
              color: "#999" 
            }}>
              <p>📭 No detection selected</p>
              <p>Upload an image, load by ID, or select from history</p>
            </div>
          )}
        </div>
      </div>

      <button 
        onClick={signOut} 
        style={{ 
          marginTop: "30px",
          background: "#333",
          color: "white",
          padding: "10px 20px",
          border: "none",
          borderRadius: "5px",
          cursor: "pointer"
        }}
      >
        Sign Out
      </button>
    </main>
  );
}

export default App;