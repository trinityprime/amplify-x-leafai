import { useEffect, useRef, useState } from "react";
import ImageMapper from 'react-img-mapper';

type Props = {
    onSelectTent?: (id: string) => void;
};

function FarmLocationClicker({ onSelectTent }: Props) {
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
        <div ref={ref} className="w-full">
            <ImageMapper
                src={map}
                name="farm-map"
                areas={areas}
                responsive
                parentWidth={w}
                onClick={(area) => {
                    // area.id comes from your farmArea items
                    if (area?.id) onSelectTent?.(String(area.id));
                }}
                onChange={(_, newAreas) => setAreas(newAreas)}
                isMulti={false}
                fillColor="rgba(255, 181, 181, 0.5)"
            />
        </div>

    );
}

export default FarmLocationClicker

const farmArea = [
    {
        "id": "tent-1",
        "shape": "poly",
        "coords": [
            140, 57, 73, 53, 66, 212, 136, 212
        ],
    },
    {
        "id": "tent-2",
        "shape": "poly",
        "coords": [
            149, 54, 202, 52, 199, 210, 148, 215
        ],
    },
    {
        "id": "tent-3",
        "shape": "poly",
        "coords": [
            214, 55, 270, 53, 268, 214, 212, 212
        ],
    },
    {
        "id": "tent-4",
        "shape": "poly",
        "coords": [282, 57, 340, 57, 336, 212, 278, 214]
    },
    {
        "id": "tent-5",
        "shape": "poly",
        "coords": [347, 55, 407, 57, 403, 219, 345, 214]
    },
    {
        "id": "tent-6",
        "shape": "poly",
        "coords": [411, 58, 478, 57, 471, 214, 411, 212]
    },
    {
        "id": "tent-7",
        "shape": "poly",
        "coords": [484, 57, 538, 58, 540, 210, 482, 214]
    },
    {
        "id": "tent-8",
        "shape": "poly",
        "coords": [568, 62, 628, 58, 628, 212, 568, 214]
    },
    {
        "id": "tent-9",
        "shape": "poly",
        "coords": [645, 49, 699, 57, 694, 218, 641, 216]
    },
    {
        "id": "tent-10",
        "shape": "poly",
        "coords": [709, 57, 767, 57, 763, 214, 703, 214]
    },
    {
        "id": "tent-11",
        "shape": "poly",
        "coords": [772, 57, 832, 57, 826, 214, 772, 214]
    },
    {
        "id": "tent-12",
        "shape": "poly",
        "coords": [838, 55, 898, 57, 894, 210, 838, 216]
    },
    {
        "id": "tent-13",
        "shape": "poly",
        "coords": [911, 57, 965, 57, 965, 214, 907, 214]
    },
    {
        "id": "tent-14",
        "shape": "poly",
        "coords": [976, 58, 1027, 57, 1031, 208, 974, 208]
    },
    {
        "id": "tent-15",
        "shape": "poly",
        "coords": [1040, 55, 1096, 53, 1094, 206, 1040, 212]
    },
    {
        "id": "tent-16",
        "shape": "poly",
        "coords": [1107, 57, 1167, 55, 1162, 205, 1107, 214]
    },
    {
        "id": "tent-17",
        "shape": "poly",
        "coords": [1175, 49, 1229, 53, 1231, 212, 1177, 210]
    },
    {
        "id": "tent-18",
        "shape": "poly",
        "coords": [207, 251, 268, 255, 267, 433, 205, 433]
    },
    {
        "id": "tent-19",
        "shape": "poly",
        "coords": [280, 259, 332, 259, 334, 427, 278, 424]
    },
    {
        "id": "tent-20",
        "shape": "poly",
        "coords": [695, 253, 763, 251, 763, 399, 699, 401]
    },
    {
        "id": "tent-21",
        "shape": "poly",
        "coords": [772, 251, 825, 257, 819, 399, 770, 401]
    },
    {
        "id": "tent-22",
        "shape": "poly",
        "coords": [840, 251, 896, 246, 898, 401, 838, 405]
    },
    {
        "id": "tent-23",
        "shape": "poly",
        "coords": [905, 248, 963, 253, 958, 397, 903, 401]
    },
    {
        "id": "tent-24",
        "shape": "poly",
        "coords": [969, 249, 1025, 249, 1029, 399, 973, 403]
    },
    {
        "id": "tent-25",
        "shape": "poly",
        "coords": [1040, 248, 1092, 251, 1090, 396, 1038, 396]
    },
    {
        "id": "tent-26",
        "shape": "poly",
        "coords": [1105, 244, 1160, 246, 1158, 394, 1105, 401]
    },
    {
        "id": "tent-27",
        "shape": "poly",
        "coords": [1169, 249, 1227, 253, 1235, 407, 1173, 409]
    },
    {
        "id": "tent-28",
        "shape": "poly",
        "coords": [697, 411, 755, 412, 753, 558, 697, 564]
    },
    {
        "id": "tent-29",
        "shape": "poly",
        "coords": [767, 413, 823, 413, 817, 570, 765, 570]
    },
    {
        "id": "tent-30",
        "shape": "poly",
        "coords": [832, 415, 892, 421, 888, 567, 834, 570]
    },
    {
        "id": "tent-31",
        "shape": "poly",
        "coords": [694, 590, 755, 600, 753, 749, 695, 746]
    },
    {
        "id": "tent-32",
        "shape": "poly",
        "coords": [763, 602, 821, 603, 817, 749, 763, 748]
    },
    {
        "id": "tent-33",
        "shape": "poly",
        "coords": [830, 594, 892, 600, 888, 746, 830, 749]
    },
    {
        "id": "tent-34",
        "shape": "poly",
        "coords": [898, 600, 956, 598, 956, 753, 898, 753]
    },
    {
        "id": "tent-35",
        "shape": "poly",
        "coords": [967, 598, 1019, 600, 1019, 746, 965, 749]
    },
    {
        "id": "tent-36",
        "shape": "poly",
        "coords": [1036, 600, 1088, 603, 1084, 746, 1026, 749]
    },
    {
        "id": "tent-37",
        "shape": "poly",
        "coords": [1101, 598, 1154, 600, 1154, 744, 1101, 742]
    },
    {
        "id": "tent-38",
        "shape": "poly",
        "coords": [1169, 596, 1223, 596, 1223, 738, 1165, 738]
    }

]

