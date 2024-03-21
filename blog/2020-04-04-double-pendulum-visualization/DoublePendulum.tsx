import { useEffect, useId, useMemo, useState } from "react";
import * as d3 from "d3";
import DoublePendulum, { AnimationLock } from "./doublePendulumBuilder";

import styles from "./styles.module.css";

let goodColorScales = [
    d3.interpolateOranges,
    d3.interpolateInferno,
    d3.interpolatePlasma,
];

let baseConstants = {
    l1: 8,
    m1: 5,
    l2: 6,
    m2: 5,
    phi1Init: 0.5,
    phi2Init: 0.5,
    pendulumNumber: 1,
    deviation: 0,
    trailUpdateInterval: 3,
    trailLength: 60,
    trails: false,
    colorscale: goodColorScales[1],
    explain: true,
    caption: "A double pendulum with a small oscillation",
};

let lock = new AnimationLock();

export function DoublePendulumDemo(
    constantOverrides: Partial<typeof baseConstants>
) {
    let constants = useMemo(() => {
        return { ...baseConstants, ...constantOverrides };
    }, [constantOverrides]);

    let id = useId();

    let key = useMemo(() => {
        return Math.random();
    }, [constants, id]);

    useEffect(() => {
        let demo = new DoublePendulum({ ...constants, location: id }, lock);
        demo.init();
        const demoLocation = document.getElementById(id);
        if (!demoLocation) return;

        // Check for hover vs touch device
        if ("ontouchstart" in window || navigator.maxTouchPoints > 0) {
            demoLocation.onclick = function (d) {
                if (d.target != d.currentTarget) return;
                if (demo.continueLooping) {
                    demo.stop.bind(demo)();
                }
            };
            demoLocation.ondblclick = demo.restart.bind(demo);
        } else {
            demoLocation.onmouseenter = demo.start.bind(demo);
            demoLocation.onmouseleave = demo.stop.bind(demo);
            demoLocation.onclick = demo.restart.bind(demo);
        }
    }, [constants, id]);

    return <div className={styles.wrapper} id={id} key={key} />;
}

export function DoublePendulumSliderDemo(
    constantOverrides: Partial<typeof baseConstants>
) {
    let [sliderOverrides, setSliderOverrides] = useState<
        Partial<typeof baseConstants>
    >({ ...baseConstants, ...constantOverrides });

    const slidersConstants = [
        ["Pendulum Number", "pendulumNumber", 1, 200, true],
        ["Trail Length", "trailLength", 0, 200, true],
        ["Rod A Length", "l1", 3, 10, false],
        ["Rod B Length", "l2", 3, 10, false],
        ["Mass A", "m1", 1, 10, false],
        ["Mass B", "m2", 1, 10, false],
        ["Angle A Initial", "phi1Init", 0, 2 * Math.PI, false],
        ["Angle B Initial", "phi2Init", 0, 2 * Math.PI, false],
    ] as [string, string, number, number, boolean][];

    return (
        <>
            <DoublePendulumDemo {...sliderOverrides} />
            <div className={styles.sliderWrapper}>
                {slidersConstants.map((item, i) => (
                    <Slider
                        key={i}
                        id={item[1] as string}
                        name={item[0] as string}
                        startValue={item[2] as number}
                        stopValue={item[3] as number}
                        isInteger={item[4] as boolean}
                        value={
                            sliderOverrides[item[1] as string] ??
                            (item[2] + item[3]) / 2
                        }
                        onChange={(name, value) => {
                            console.log("CHANGING", name, value);
                            setSliderOverrides({
                                ...sliderOverrides,
                                [name]: value,
                            });
                        }}
                    />
                ))}
            </div>
        </>
    );
}

interface SliderProps {
    name: string;
    id: string;
    startValue: number;
    stopValue: number;
    isInteger: boolean;
    value: number;
    onChange: (name: string, value: number) => void;
}

const Slider: React.FC<SliderProps> = ({
    name,
    id,
    startValue,
    stopValue,
    isInteger,
    value,
    onChange,
}) => {
    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = isInteger
            ? parseInt(event.target.value)
            : parseFloat(event.target.value);
        onChange(id, newValue);
    };

    return (
        <div className="sliderWrapper">
            <div>
                {name}: <span style={{ fontWeight: "bold" }}>{value}</span>
            </div>
            <input
                type="range"
                min={startValue}
                max={stopValue}
                value={value}
                step={isInteger ? 1 : 0.1}
                className="slider"
                onChange={handleInputChange}
            />
        </div>
    );
};
