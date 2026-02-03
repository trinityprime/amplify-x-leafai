import { useState } from "react";
import CreateReportForm from "../../components/FarmReport/CreateReportForm";
import FarmLocationClicker from "../../components/FarmReport/FarmLocationClicker";

export default function NewReport() {
  const [tentId, setTentId] = useState<string>("");

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">
          📝 Create New Report
        </h1>
        <p className="text-gray-500 mt-1">
          Select a tent location and fill in the pest report details
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Panel - Map Selection */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <span>🗺️</span> Select Tent Location
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Click on a tent in the map below to select it for your report
          </p>

          <FarmLocationClicker onSelectTent={(id) => setTentId(id)} />

          {tentId && (
            <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-3">
              <span className="text-2xl">📍</span>
              <div>
                <p className="text-sm text-emerald-600 font-medium">
                  Selected Location
                </p>
                <p className="text-lg font-bold text-emerald-800">{tentId}</p>
              </div>
            </div>
          )}

          {!tentId && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-3">
              <span className="text-2xl">👆</span>
              <p className="text-sm text-amber-700">
                Click on a tent in the map to select it, or enter the Tent ID
                manually in the form
              </p>
            </div>
          )}
        </div>

        {/* Right Panel - Form */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <span>📋</span> Report Details
          </h2>

          <CreateReportForm
            tentId={tentId}
            onChangeTent={(id) => setTentId(id)}
            onCreated={() => {
              setTentId("");
            }}
          />
        </div>
      </div>
    </div>
  );
}