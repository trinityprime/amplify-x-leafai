import { useState } from "react";
import CreateReportForm from "../../components/FarmReport/CreateReportForm";
import FarmLocationClicker from "../../components/FarmReport/FarmLocationClicker";

export default function NewReport() {
  const [tentId, setTentId] = useState<string>("");

  return <div className="flex flex-col w-full">
    <div>
      <div>

        <FarmLocationClicker
          onSelectTent={(id) => setTentId(id)}
        />

      </div>
      <div>

        <CreateReportForm
          tentId={tentId}
          onChangeTent={(id) => setTentId(id)}

        />
      </div>

    </div>
  </div>;
}