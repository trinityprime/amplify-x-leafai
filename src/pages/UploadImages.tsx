import { useState, useEffect } from "react";
import { useAuthenticator } from "@aws-amplify/ui-react";
import { createDetection, updateDetection, getDetection, deleteDetection, listAllDetections, LeafDetection } from "../hooks/leafDetectionApi";

function UploadImages() {
    const { user } = useAuthenticator();
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState("");
    const [farmerId, setFarmerId] = useState("farmer-brian");
    const [location, setLocation] = useState("");
    const [selectedLabel, setSelectedLabel] = useState("unlabeled");
    const [selectedPestType, setSelectedPestType] = useState("unknown");
    const [currentDetection, setCurrentDetection] = useState<LeafDetection | null>(null);
    const [allDetections, setAllDetections] = useState<LeafDetection[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchId, setSearchId] = useState("");
    const [showHistory, setShowHistory] = useState(false);
    const [filterGood, setFilterGood] = useState(true);
    const [filterBad, setFilterBad] = useState(true);
    const [editMode, setEditMode] = useState(false);
    const [editFarmerId, setEditFarmerId] = useState("");
    const [editLocation, setEditLocation] = useState("");
    const [editFile, setEditFile] = useState<File | null>(null);
    const [editPreviewUrl, setEditPreviewUrl] = useState("");

    useEffect(() => { loadAllDetections(); }, []);

    const loadAllDetections = async () => {
        try {
            const detections = await listAllDetections(user?.signInDetails?.loginId);
            setAllDetections(detections);
        } catch (error) { console.error("Failed to load:", error); }
    };

    const getFilteredDetections = () => allDetections.filter(d => (filterGood && d.label === "good") || (filterBad && d.label === "bad"));

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, isEdit = false) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                if (isEdit) { setEditFile(file); setEditPreviewUrl(reader.result as string); }
                else { setSelectedFile(file); setPreviewUrl(reader.result as string); }
            };
            reader.readAsDataURL(file);
        }
    };

    const clearForm = () => {
        setSelectedFile(null); setPreviewUrl(""); setFarmerId("farmer-brian");
        setLocation(""); setSelectedLabel("unlabeled"); setSelectedPestType("unknown");
    };

    const handleUpload = async () => {
        if (!selectedFile || !farmerId.trim() || !location.trim() || selectedLabel === "unlabeled") {
            alert("❌ Please fill all required fields!"); return;
        }
        setLoading(true);
        try {
            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64 = (reader.result as string).split(',')[1];
                const detection = await createDetection({ farmerId, content: `${selectedLabel} - ${selectedPestType}`, location, imageData: base64, imageType: selectedFile!.type, userEmail: user?.signInDetails?.loginId });
                if (selectedLabel !== 'unlabeled') {
                    const updated = await updateDetection(detection.id, { label: selectedLabel, pestType: selectedPestType });
                    setCurrentDetection({ ...updated, photoUrl: previewUrl });
                } else { setCurrentDetection({ ...detection, photoUrl: previewUrl }); }
                await loadAllDetections();
                alert("✅ Uploaded!"); clearForm();
            };
            reader.readAsDataURL(selectedFile!);
        } catch (error) { alert("❌ Upload failed"); }
        finally { setLoading(false); }
    };

    const handleLoadDetection = async () => {
        if (!searchId.trim()) { alert("❌ Enter Detection ID!"); return; }
        setLoading(true);
        try {
            const detection = await getDetection(searchId);
            setCurrentDetection(detection); setEditMode(false); clearForm();
            alert("✅ Loaded!");
        } catch (error) { alert("❌ Not found!"); }
        finally { setLoading(false); }
    };

    const handleSelectFromHistory = (detection: LeafDetection) => {
        setCurrentDetection(detection); setShowHistory(false); setEditMode(false); clearForm();
    };

    const handleSaveEdit = async () => {
        if (!currentDetection || !editFarmerId.trim() || !editLocation.trim()) { alert("❌ Fill required fields!"); return; }
        setLoading(true);
        try {
            const updates: any = { farmerId: editFarmerId, location: editLocation };
            if (editFile) {
                const reader = new FileReader();
                reader.onloadend = async () => {
                    updates.imageData = (reader.result as string).split(',')[1];
                    updates.imageType = editFile.type;
                    const updated = await updateDetection(currentDetection.id, updates);
                    setCurrentDetection(updated); await loadAllDetections(); setEditMode(false);
                    alert("✅ Updated!"); setLoading(false);
                };
                reader.readAsDataURL(editFile);
            } else {
                const updated = await updateDetection(currentDetection.id, updates);
                setCurrentDetection(updated); await loadAllDetections(); setEditMode(false);
                alert("✅ Updated!"); setLoading(false);
            }
        } catch (error) { alert("❌ Update failed!"); setLoading(false); }
    };

    const handleUpdateLabel = async (label: string, pestType: string) => {
        if (!currentDetection || !confirm(`Change to ${label}?`)) return;
        setLoading(true);
        try {
            const updated = await updateDetection(currentDetection.id, { label, pestType });
            setCurrentDetection({ ...updated, photoUrl: currentDetection.photoUrl });
            await loadAllDetections(); alert("✅ Updated!");
        } catch (error) { alert("❌ Failed!"); }
        finally { setLoading(false); }
    };

    const handleDelete = async () => {
        if (!currentDetection || !confirm("Delete this detection?")) return;
        setLoading(true);
        try {
            await deleteDetection(currentDetection.id);
            setCurrentDetection(null); setPreviewUrl(""); setSearchId(""); setEditMode(false);
            await loadAllDetections(); alert("✅ Deleted!");
        } catch (error) { alert("❌ Failed!"); }
        finally { setLoading(false); }
    };

    const enterEditMode = () => {
        if (!currentDetection) return;
        setEditFarmerId(currentDetection.farmerId); setEditLocation(currentDetection.location || "");
        setEditFile(null); setEditPreviewUrl(""); setEditMode(true);
    };

   

    return (
        <div className="bg-gradient-to-b from-white to-green-600 min-h-screen w-full">
            <main className="p-5 max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-center mb-5">
                    <div>
                        <h1 className="text-3xl font-bold">🍃 LeafAI - Pest Detection System</h1>
                        <p className="text-gray-600">User: {user?.signInDetails?.loginId?.split("@")[0]}</p>
                    </div>
                    <p className="text-lg font-bold text-blue-500">📊 Total: {allDetections.length}</p>
                </div>

                {/* Load by ID */}
                <div className="mb-5 border-2 border-orange-400 rounded-lg p-4 bg-orange-50 flex gap-2">
                    <input type="text" placeholder="Enter Detection ID" value={searchId} onChange={(e) => setSearchId(e.target.value)} className="p-2 flex-1 border border-gray-300 rounded" />
                    <button onClick={handleLoadDetection} disabled={loading} className="bg-orange-500 text-black px-4 py-2 rounded cursor-pointer font-bold hover:bg-orange-600 disabled:opacity-60 border-none">Load</button>
                </div>

                {/* History */}
                <div className="mb-5 border-2 border-blue-500 rounded-lg p-4 bg-blue-50">
                    <div className="flex justify-between items-center">
                        <h3 className="font-semibold">📜 History ({allDetections.length})</h3>
                        <button onClick={() => setShowHistory(!showHistory)} className="bg-blue-500 text-black px-4 py-2 rounded cursor-pointer font-bold hover:bg-blue-600 border-none">{showHistory ? "▲ Hide" : "▼ Show"}</button>
                    </div>
                    {showHistory && (
                        <div className="mt-4">
                            <div className="flex gap-4 mb-3">
                                <label className="flex items-center gap-1 cursor-pointer">
                                    <input type="checkbox" checked={filterGood} onChange={(e) => setFilterGood(e.target.checked)} />
                                    <span className="bg-green-500 text-white px-2 py-1 rounded text-sm">✅ Good</span>
                                </label>
                                <label className="flex items-center gap-1 cursor-pointer">
                                    <input type="checkbox" checked={filterBad} onChange={(e) => setFilterBad(e.target.checked)} />
                                    <span className="bg-red-500 text-white px-2 py-1 rounded text-sm">❌ Bad</span>
                                </label>
                            </div>
                            <div className="max-h-60 overflow-y-auto">
                                <table className="w-full border-collapse text-sm">
                                    <thead><tr className="bg-blue-100">
                                        {["ID", "Farmer", "Location", "Label", "Date", "Action"].map(h => <th key={h} className="p-2 border border-gray-300 text-left">{h}</th>)}
                                    </tr></thead>
                                    <tbody>
                                        {getFilteredDetections().map((d) => (
                                            <tr key={d.id}>
                                                <td className="p-2 border border-gray-300 text-xs">{d.id.substring(0, 15)}...</td>
                                                <td className="p-2 border border-gray-300">{d.farmerId}</td>
                                                <td className="p-2 border border-gray-300">{d.location || "N/A"}</td>
                                                <td className="p-2 border border-gray-300">
                                                    <span className={`${d.label === "good" ? "bg-green-500" : "bg-red-500"} text-white px-2 py-1 rounded text-xs`}>{d.label}</span>
                                                </td>
                                                <td className="p-2 border border-gray-300 text-xs">{new Date(d.createdAt).toLocaleDateString()}</td>
                                                <td className="p-2 border border-gray-300 text-center">
                                                    <button onClick={() => handleSelectFromHistory(d)} className="bg-orange-500 text-white px-2 py-1 rounded text-xs">View</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                {/* Two Panels */}
                <div className="grid grid-cols-2 gap-5">
                    {/* LEFT - Upload */}
                    <div className="border-2 border-gray-300 p-5 rounded-lg bg-white">
                        <h2 className="text-xl font-bold mb-4">📸 Upload Image</h2>
                        <div className="mb-3">
                            <label className="font-bold block mb-1">Photo: <span className="text-red-500">*</span></label>
                            <label className="text-blue-500 underline cursor-pointer">
                                {selectedFile ? `📎 ${selectedFile.name}` : "📁 Choose File"}
                                <input type="file" accept="image/*" onChange={(e) => handleFileSelect(e)} className="hidden" />
                            </label>
                        </div>
                        {previewUrl && (
                            <div className="mb-3 flex justify-center">
                                <div className="relative inline-block">
                                    <img src={previewUrl} alt="Preview" className="max-h-48 border-2 border-green-500 rounded-lg" />
                                    <button onClick={() => { setSelectedFile(null); setPreviewUrl(""); }} className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white text-sm flex items-center justify-center">✕</button>
                                </div>
                            </div>
                        )}
                        <div className="mb-3">
                            <label className="font-bold block mb-1">Farmer ID: <span className="text-red-500">*</span></label>
                            <input type="text" value={farmerId} onChange={(e) => setFarmerId(e.target.value)} className="p-2 w-full border border-black rounded mb-2" />
                            <label className="font-bold block mb-1">Location: <span className="text-red-500">*</span></label>
                            <input type="text" placeholder="e.g., Field A-23" value={location} onChange={(e) => setLocation(e.target.value)} className="p-2 w-full border border-black rounded" />
                        </div>
                        <div className="mb-3">
                            <label className="font-bold block mb-1">Label: <span className="text-red-500">*</span></label>
                            <div className="flex gap-2">
                                <button onClick={() => { setSelectedLabel("good"); setSelectedPestType("healthy"); }} className={`flex-1 p-2 rounded ${selectedLabel === "good" ? "bg-green-500 text-white" : "bg-gray-200"}`}>✅ Good</button>
                                <button onClick={() => { setSelectedLabel("bad"); setSelectedPestType("unhealthy"); }} className={`flex-1 p-2 rounded ${selectedLabel === "bad" ? "bg-red-500 text-white" : "bg-gray-200"}`}>❌ Bad</button>
                            </div>
                        </div>
                        <button onClick={handleUpload} disabled={loading} className="w-full p-3 bg-blue-500 text-black rounded cursor-pointer font-bold hover:bg-blue-600 disabled:opacity-60 border-none">{loading ? "⏳ Uploading..." : "📤 Upload"}</button>
                    </div>

                    {/* RIGHT - Result */}
                    <div className="border-2 border-gray-300 p-5 rounded-lg bg-white min-h-96 overflow-y-auto">
                        <div className="flex justify-between items-center mb-3">
                            <h2 className="text-xl font-bold">📊 Result</h2>
                            <button onClick={enterEditMode} className="bg-orange-500 text-black px-4 py-2 rounded cursor-pointer font-bold hover:bg-orange-600 border-none">✏️ Edit</button>
                        </div>
                        {currentDetection ? (
                            <div>
                                {editMode ? (
                                    <div className="bg-orange-50 p-4 rounded-lg border-2 border-orange-400 mb-3">
                                        <h3 className="font-bold text-orange-500 mb-3">✏️ Editing</h3>
                                        <label className="text-orange-500 underline cursor-pointer block mb-3">
                                            {editFile ? `📎 ${editFile.name}` : "📁 Replace Image"}
                                            <input type="file" accept="image/*" onChange={(e) => handleFileSelect(e, true)} className="hidden" />
                                        </label>
                                        {editPreviewUrl && <img src={editPreviewUrl} alt="Preview" className="max-h-32 rounded mb-3 mx-auto block" />}
                                        <input type="text" value={editFarmerId} onChange={(e) => setEditFarmerId(e.target.value)} placeholder="Farmer ID" className="p-2 w-full border border-black rounded mb-2" />
                                        <input type="text" value={editLocation} onChange={(e) => setEditLocation(e.target.value)} placeholder="Location" className="p-2 w-full border border-black rounded mb-3" />
                                        <div className="flex gap-2">
                                            <button onClick={handleSaveEdit} disabled={loading} className="flex-1 bg-green-500 text-black p-2 rounded cursor-pointer font-bold hover:bg-green-600 disabled:opacity-60 border-none">💾 Save</button>
                                            <button onClick={() => setEditMode(false)} className="flex-1 bg-gray-500 text-white p-2 rounded">❌ Cancel</button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className={`p-4 rounded-lg mb-3 ${currentDetection.label === "good" ? "bg-green-50" : "bg-red-50"}`}>
                                        <h3 className="font-bold mb-2">{currentDetection.label === "good" ? "✅ Healthy" : "❌ Diseased"}</h3>
                                        <p><b>ID:</b> {currentDetection.id}</p>
                                        <p><b>Farmer:</b> {currentDetection.farmerId}</p>
                                        <p><b>Location:</b> {currentDetection.location || "N/A"}</p>
                                        <p><b>Label:</b> {currentDetection.label}</p>
                                        <p><b>Date:</b> {new Date(currentDetection.createdAt).toLocaleString()}</p>
                                    </div>
                                )}
                                {currentDetection.photoUrl && !editMode && (
                                    <img src={currentDetection.photoUrl} alt="Detection" className="max-h-48 rounded-lg border-2 border-gray-300 mx-auto block mb-3" />
                                )}
                                {!editMode && (
                                    <>
                                        <div className="flex gap-2 mb-3">
                                            <button onClick={() => handleUpdateLabel("good", "healthy")} disabled={loading} className="flex-1 bg-green-500 text-black p-2 rounded cursor-pointer font-bold hover:bg-green-600 disabled:opacity-60 border-none">✅ Good</button>
                                            <button onClick={() => handleUpdateLabel("bad", "unhealthy")} disabled={loading} className="flex-1 bg-red-500 text-black p-2 rounded cursor-pointer font-bold hover:bg-red-600 disabled:opacity-60 border-none">❌ Bad</button>
                                        </div>
                                        <button onClick={handleDelete} disabled={loading} className="w-full bg-red-700 text-black p-3 rounded cursor-pointer font-bold hover:bg-red-800 disabled:opacity-60 border-none">🗑️ Delete</button>
                                    </>
                                )}
                            </div>
                        ) : (
                            <div className="text-center text-gray-400 py-20">
                                <p>📭 No detection selected</p>
                                <p>Upload, load by ID, or select from history</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}

export default UploadImages;