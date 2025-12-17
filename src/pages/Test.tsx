import { useEffect, useRef, useState } from "react";
import ImageMapper from 'react-img-mapper';


const MyMapper = () => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [w, setW] = useState(0);
  const [areas, setAreas] = useState(farmArea);

  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setW(Math.round(e.contentRect.width));
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  const map =
    "https://raw.githubusercontent.com/trinityprime/amplify-x-leafai/refs/heads/latiffv2/src/assets/farm-map.png";

  return (
    <div ref={ref} style={{ width: "100%" }}>
      <ImageMapper
        src={map}
        name="farm-map"
        areas={areas}
        responsive
        parentWidth={w}
        // onClick={(tes) => { console.log(tes.id) }}
        onChange={(_, newAreas) => setAreas(newAreas)}
        isMulti={false}
        strokeColor="rgba(0, 0, 0, 0)"
        disabled={true}
      />
    </div>
  );
};

const farmArea = [
  {
    "id": "tent-1",
    "shape": "poly",
    "coords": [
      140, 57, 73, 53, 66, 212, 136, 212
    ],
    "preFillColor": "rgba(255, 181, 181, 0.5)"
  },
  {
    "id": "tent-2",
    "shape": "poly",
    "coords": [
      149, 54, 202, 52, 199, 210, 148, 215
    ],
    "preFillColor": "rgba(255, 181, 181, 0.5)"
  },
  {
    "id": "tent-3",
    "shape": "poly",
    "coords": [
      214, 55, 270, 53, 268, 214, 212, 212
    ],
  },
  {
    id: "tent-4",
    shape: "poly",
    coords: [282, 57, 340, 57, 336, 212, 278, 214],
  },
  {
    id: "tent-5",
    shape: "poly",
    coords: [347, 55, 407, 57, 403, 219, 345, 214],
  },
  {
    id: "tent-6",
    shape: "poly",
    coords: [411, 58, 478, 57, 471, 214, 411, 212],
  },
  {
    id: "tent-7",
    shape: "poly",
    coords: [484, 57, 538, 58, 540, 210, 482, 214],
  },
  {
    id: "tent-8",
    shape: "poly",
    coords: [568, 62, 628, 58, 628, 212, 568, 214],
  },

]

function Test() {
  return (
    <div className="border border-black">
      {/* <div>
        <Mapper />
      </div> */}
      <div className="border-2 border-red-400">
        <MyMapper />
      </div>
    </div>
  )
}

export default Test
