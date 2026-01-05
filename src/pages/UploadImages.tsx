import { useState, useEffect } from "react";
import { useAuthenticator } from "@aws-amplify/ui-react";
import {
  Plus,
  History,
  Search,
  Trash2,
  CheckCircle2,
  XCircle,
  Edit3,
  UploadCloud,
  MapPin,
  User as UserIcon,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import {
  createDetection,
  updateDetection,
  getDetection,
  deleteDetection,
  listAllDetections,
  LeafDetection,
} from "../hooks/leafDetectionApi";

function UploadImages() {
  const { user } = useAuthenticator();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [farmerId, setFarmerId] = useState("farmer-brian");
  const [location, setLocation] = useState("");
  const [selectedLabel, setSelectedLabel] = useState("unlabeled");
  const [selectedPestType, setSelectedPestType] = useState("unknown");
  const [currentDetection, setCurrentDetection] =
    useState<LeafDetection | null>(null);
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

  useEffect(() => {
    loadAllDetections();
  }, []);

  const loadAllDetections = async () => {
    try {
      const detections = await listAllDetections(user?.signInDetails?.loginId);
      setAllDetections(detections);
    } catch (error) {
      console.error("Failed to load:", error);
    }
  };

  const getFilteredDetections = () =>
    allDetections.filter(
      (d) =>
        (filterGood && d.label === "good") || (filterBad && d.label === "bad")
    );

  const handleFileSelect = (
    e: React.ChangeEvent<HTMLInputElement>,
    isEdit = false
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (isEdit) {
          setEditFile(file);
          setEditPreviewUrl(reader.result as string);
        } else {
          setSelectedFile(file);
          setPreviewUrl(reader.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const clearForm = () => {
    setSelectedFile(null);
    setPreviewUrl("");
    setFarmerId("farmer-brian");
    setLocation("");
    setSelectedLabel("unlabeled");
    setSelectedPestType("unknown");
  };

  const handleUpload = async () => {
    if (
      !selectedFile ||
      !farmerId.trim() ||
      !location.trim() ||
      selectedLabel === "unlabeled"
    ) {
      alert("❌ Please fill all required fields!");
      return;
    }
    setLoading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = (reader.result as string).split(",")[1];
        const detection = await createDetection({
          farmerId,
          content: `${selectedLabel} - ${selectedPestType}`,
          location,
          imageData: base64,
          imageType: selectedFile!.type,
          userEmail: user?.signInDetails?.loginId,
        });
        if (selectedLabel !== "unlabeled") {
          const updated = await updateDetection(detection.id, {
            label: selectedLabel,
            pestType: selectedPestType,
          });
          setCurrentDetection({ ...updated, photoUrl: previewUrl });
        } else {
          setCurrentDetection({ ...detection, photoUrl: previewUrl });
        }
        await loadAllDetections();
        alert("✅ Uploaded!");
        clearForm();
      };
      reader.readAsDataURL(selectedFile!);
    } catch (error) {
      alert("❌ Upload failed");
    } finally {
      setLoading(false);
    }
  };

  const handleLoadDetection = async () => {
    if (!searchId.trim()) {
      alert("❌ Enter Detection ID!");
      return;
    }
    setLoading(true);
    try {
      const detection = await getDetection(searchId);
      setCurrentDetection(detection);
      setEditMode(false);
      clearForm();
    } catch (error) {
      alert("❌ Not found!");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectFromHistory = (detection: LeafDetection) => {
    setCurrentDetection(detection);
    setShowHistory(false);
    setEditMode(false);
    clearForm();
  };

  const handleSaveEdit = async () => {
    if (!currentDetection || !editFarmerId.trim() || !editLocation.trim()) {
      alert("❌ Fill required fields!");
      return;
    }
    setLoading(true);
    try {
      const updates: any = { farmerId: editFarmerId, location: editLocation };
      if (editFile) {
        const reader = new FileReader();
        reader.onloadend = async () => {
          updates.imageData = (reader.result as string).split(",")[1];
          updates.imageType = editFile.type;
          const updated = await updateDetection(currentDetection.id, updates);
          setCurrentDetection(updated);
          await loadAllDetections();
          setEditMode(false);
          alert("✅ Updated!");
          setLoading(false);
        };
        reader.readAsDataURL(editFile);
      } else {
        const updated = await updateDetection(currentDetection.id, updates);
        setCurrentDetection(updated);
        await loadAllDetections();
        setEditMode(false);
        alert("✅ Updated!");
        setLoading(false);
      }
    } catch (error) {
      alert("❌ Update failed!");
      setLoading(false);
    }
  };

  const handleUpdateLabel = async (label: string, pestType: string) => {
    if (!currentDetection || !confirm(`Change to ${label}?`)) return;
    setLoading(true);
    try {
      const updated = await updateDetection(currentDetection.id, {
        label,
        pestType,
      });
      setCurrentDetection({ ...updated, photoUrl: currentDetection.photoUrl });
      await loadAllDetections();
      alert("✅ Updated!");
    } catch (error) {
      alert("❌ Failed!");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!currentDetection || !confirm("Delete this detection?")) return;
    setLoading(true);
    try {
      await deleteDetection(currentDetection.id);
      setCurrentDetection(null);
      setPreviewUrl("");
      setSearchId("");
      setEditMode(false);
      await loadAllDetections();
      alert("✅ Deleted!");
    } catch (error) {
      alert("❌ Failed!");
    } finally {
      setLoading(false);
    }
  };

  const enterEditMode = () => {
    if (!currentDetection) return;
    setEditFarmerId(currentDetection.farmerId);
    setEditLocation(currentDetection.location || "");
    setEditFile(null);
    setEditPreviewUrl("");
    setEditMode(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm transition-all mb-8">
        <div className="flex items-start gap-4">
          {/* Icon wrapped in a styled box to match the modern dashboard look */}
          <div className="p-3.5 bg-emerald-50 rounded-2xl text-emerald-600 shadow-sm border border-emerald-100/50">
            <UploadCloud size={28} strokeWidth={2.5} />
          </div>

          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">
              Field Data <span className="text-emerald-600">Upload</span>
            </h1>
            <p className="text-slate-500 text-sm mt-1 font-medium">
              Submit and manage agricultural pest detections for LeafCorp AI.
            </p>
          </div>
        </div>

        {/* Stats Badge - Standardized colors and spacing */}
        <div className="flex items-center gap-3">
          <div className="bg-slate-50 px-6 py-2.5 rounded-2xl border border-slate-100 text-center min-w-[140px]">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-0.5">
              Total Detections
            </p>
            <p className="text-2xl font-black text-slate-700 leading-none">
              {allDetections.length}
            </p>
          </div>
        </div>
      </div>

      {/* Top Controls: Search & History Toggle */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 flex gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center pl-3 text-slate-400">
            <Search size={18} />
          </div>
          <input
            type="text"
            placeholder="Search by Detection ID..."
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
            className="flex-1 p-2 bg-transparent outline-none text-sm"
          />
          <button
            onClick={handleLoadDetection}
            disabled={loading}
            className="bg-slate-900 text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            Find
          </button>
        </div>

        <button
          onClick={() => setShowHistory(!showHistory)}
          className="flex items-center justify-center gap-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
        >
          <History size={18} />
          {showHistory ? "Hide History" : "View History"}
          {showHistory ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {/* History Table (Conditional) */}
      {showHistory && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden animate-in slide-in-from-top-4 duration-300">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
            <h3 className="font-bold text-slate-700">Records History</h3>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filterGood}
                  onChange={(e) => setFilterGood(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                Healthy
              </label>
              <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filterBad}
                  onChange={(e) => setFilterBad(e.target.checked)}
                  className="rounded border-slate-300 text-red-600 focus:ring-red-500"
                />
                Diseased
              </label>
            </div>
          </div>
          <div className="max-h-80 overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-white shadow-sm">
                <tr className="text-[11px] uppercase tracking-widest text-slate-400 border-b border-slate-100">
                  <th className="p-4">Farmer</th>
                  <th className="p-4">Location</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Date</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {getFilteredDetections().map((d) => (
                  <tr
                    key={d.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="p-4 font-medium text-slate-700">
                      {d.farmerId}
                    </td>
                    <td className="p-4 text-slate-500">
                      {d.location || "---"}
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${
                          d.label === "good"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {d.label}
                      </span>
                    </td>
                    <td className="p-4 text-slate-400 text-xs">
                      {new Date(d.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleSelectFromHistory(d)}
                        className="text-emerald-600 font-bold text-xs hover:underline"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* LEFT PANEL: UPLOAD FORM */}
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
              <Plus size={20} />
            </div>
            <h2 className="text-xl font-bold text-slate-900">New Submission</h2>
          </div>

          <div className="space-y-4">
            {/* Custom File Upload UI */}
            <div className="relative group">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileSelect(e)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div
                className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
                  previewUrl
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-slate-200 group-hover:border-emerald-400 bg-slate-50"
                }`}
              >
                {previewUrl ? (
                  <div className="relative inline-block">
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="max-h-48 rounded-xl shadow-md border-4 border-white"
                    />
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        setSelectedFile(null);
                        setPreviewUrl("");
                      }}
                      className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-1 shadow-lg hover:bg-red-600"
                    >
                      <XCircle size={20} />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="mx-auto w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center text-slate-400 group-hover:text-emerald-500 transition-colors">
                      <UploadCloud />
                    </div>
                    <p className="text-sm font-bold text-slate-700">
                      Click or drag to upload photo
                    </p>
                    <p className="text-xs text-slate-400">
                      JPG, PNG or WEBP up to 10MB
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <UserIcon size={12} /> Farmer ID
                </label>
                <input
                  type="text"
                  value={farmerId}
                  onChange={(e) => setFarmerId(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <MapPin size={12} /> Field Location
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sector 4-B"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Health Status Assessment
              </label>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setSelectedLabel("good");
                    setSelectedPestType("healthy");
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl font-bold transition-all ${
                    selectedLabel === "good"
                      ? "bg-emerald-600 text-white shadow-lg shadow-emerald-200"
                      : "bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  <CheckCircle2 size={18} /> Healthy
                </button>
                <button
                  onClick={() => {
                    setSelectedLabel("bad");
                    setSelectedPestType("unhealthy");
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl font-bold transition-all ${
                    selectedLabel === "bad"
                      ? "bg-red-500 text-white shadow-lg shadow-red-200"
                      : "bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  <XCircle size={18} /> Diseased
                </button>
              </div>
            </div>

            <button
              onClick={handleUpload}
              disabled={loading}
              className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-lg hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
              ) : (
                <UploadCloud size={20} />
              )}
              {loading ? "Processing..." : "Submit to Database"}
            </button>
          </div>
        </div>

        {/* RIGHT PANEL: ANALYSIS RESULT */}
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col min-h-[500px]">
          <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-6">
            <h2 className="text-xl font-bold text-slate-900">
              Analysis Result
            </h2>
            {currentDetection && (
              <button
                onClick={enterEditMode}
                className="p-2 text-slate-400 hover:text-emerald-600 transition-colors"
              >
                <Edit3 size={20} />
              </button>
            )}
          </div>

          {currentDetection ? (
            <div className="space-y-6 flex-grow animate-in zoom-in-95 duration-300">
              {editMode ? (
                <div className="bg-emerald-50/50 p-6 rounded-2xl border border-emerald-100 space-y-4">
                  <h3 className="text-sm font-black text-emerald-700 uppercase tracking-widest flex items-center gap-2">
                    <Edit3 size={14} /> Edit Entry
                  </h3>

                  <div className="flex justify-center py-4">
                    <label className="cursor-pointer">
                      <div className="relative w-32 h-32 rounded-xl overflow-hidden border-2 border-emerald-200">
                        <img
                          src={editPreviewUrl || currentDetection.photoUrl}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white opacity-0 hover:opacity-100 transition-opacity">
                          <UploadCloud size={20} />
                        </div>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileSelect(e, true)}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <input
                    type="text"
                    value={editFarmerId}
                    onChange={(e) => setEditFarmerId(e.target.value)}
                    placeholder="Farmer ID"
                    className="w-full p-3 bg-white border border-emerald-100 rounded-xl outline-none"
                  />
                  <input
                    type="text"
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    placeholder="Location"
                    className="w-full p-3 bg-white border border-emerald-100 rounded-xl outline-none"
                  />

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={handleSaveEdit}
                      disabled={loading}
                      className="flex-1 bg-emerald-600 text-white p-3 rounded-xl font-bold hover:bg-emerald-700"
                    >
                      Update
                    </button>
                    <button
                      onClick={() => setEditMode(false)}
                      className="flex-1 bg-white text-slate-500 p-3 rounded-xl border border-slate-200"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div
                    className={`p-6 rounded-2xl border flex items-start gap-4 ${
                      currentDetection.label === "good"
                        ? "bg-emerald-50 border-emerald-100"
                        : "bg-red-50 border-red-100"
                    }`}
                  >
                    <div
                      className={`p-3 rounded-xl ${
                        currentDetection.label === "good"
                          ? "bg-emerald-600 text-white"
                          : "bg-red-600 text-white"
                      }`}
                    >
                      {currentDetection.label === "good" ? (
                        <CheckCircle2 size={24} />
                      ) : (
                        <XCircle size={24} />
                      )}
                    </div>
                    <div>
                      <p
                        className={`text-[10px] font-black uppercase tracking-[0.2em] ${
                          currentDetection.label === "good"
                            ? "text-emerald-600"
                            : "text-red-600"
                        }`}
                      >
                        Diagnosis
                      </p>
                      <h3 className="text-xl font-black text-slate-900 leading-none mt-1">
                        {currentDetection.label === "good"
                          ? "Healthy Specimen"
                          : "Disease Detected"}
                      </h3>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-y-4 text-sm px-2">
                    <div>
                      <p className="text-slate-400 text-[10px] uppercase font-bold">
                        Detection ID
                      </p>
                      <p className="font-mono text-xs text-slate-600">
                        {currentDetection.id.substring(0, 18)}...
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-[10px] uppercase font-bold">
                        Captured Date
                      </p>
                      <p className="font-bold text-slate-700">
                        {new Date(currentDetection.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-[10px] uppercase font-bold">
                        Farmer
                      </p>
                      <p className="font-bold text-slate-700">
                        {currentDetection.farmerId}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-[10px] uppercase font-bold">
                        Location
                      </p>
                      <p className="font-bold text-slate-700">
                        {currentDetection.location || "Not Specified"}
                      </p>
                    </div>
                  </div>

                  {currentDetection.photoUrl && (
                    <div className="relative group">
                      <img
                        src={currentDetection.photoUrl}
                        alt="Detection"
                        className="w-full max-h-56 object-cover rounded-2xl border border-slate-100 shadow-sm"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-2xl" />
                    </div>
                  )}

                  <div className="pt-6 mt-auto space-y-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleUpdateLabel("good", "healthy")}
                        className="flex-1 text-xs font-bold py-2 px-4 rounded-lg border border-emerald-200 text-emerald-600 hover:bg-emerald-50 transition-colors"
                      >
                        Mark Healthy
                      </button>
                      <button
                        onClick={() => handleUpdateLabel("bad", "unhealthy")}
                        className="flex-1 text-xs font-bold py-2 px-4 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                      >
                        Mark Diseased
                      </button>
                    </div>
                    <button
                      onClick={handleDelete}
                      disabled={loading}
                      className="w-full flex items-center justify-center gap-2 py-3 text-red-400 hover:text-red-600 font-bold text-xs transition-colors"
                    >
                      <Trash2 size={14} /> Remove Record Permanentely
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="flex-grow flex flex-col items-center justify-center text-center space-y-4 opacity-40">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 border-2 border-dashed border-slate-200">
                <UploadCloud size={32} />
              </div>
              <div>
                <p className="font-bold text-slate-900">Waiting for Data</p>
                <p className="text-xs max-w-[200px] mx-auto">
                  Upload a photo or select an existing record to view details
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default UploadImages;
