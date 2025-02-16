import { useEffect, useId, useMemo, useState } from "react";
import * as d3 from "d3";

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

export class AnimationLock {
    locked;
    constructor() {
        this.locked = false;
    }
    request() {
        if (this.locked) {
            return true;
        }
        this.locked = true;
        return false;
    }
    release() {
        this.locked = false;
    }
}

class DoublePendulum {
    stepSize = 0.001;
    repeats = 32;
    randomness = 0.4;
    started = false;

    currentCoords;
    currentTime;
    currentCartCoords;
    width;
    height;

    origin;
    dots1;
    lines1;
    dots2;
    lines2;
    trails;

    continueLooping = false;
    restartable = false;
    colorscaleVariable = 0;
    currentStep = 0;
    lineResizer = 0.3;
    dotResizer = 0.1;

    isReset;

    lineGenerator = d3.line().curve(d3.curveNatural);

    constructor(constantsDict, animationLock) {
        this.isReset = true;
        this.lock = animationLock;
        this.constants = [
            constantsDict.l1,
            constantsDict.m1,
            constantsDict.l2,
            constantsDict.m2,
        ];
        this.phi1Init = constantsDict.phi1Init;
        this.phi2Init = constantsDict.phi2Init;
        this.pendulumNumber = constantsDict.pendulumNumber;
        this.deviation = constantsDict.deviation;
        this.location = constantsDict.location;
        this.trailUpdateInterval = constantsDict.trailUpdateInterval;
        this.trailLength = constantsDict.trailLength;
        this.useTrails = constantsDict.trails;
        this.trailPaths = new Array(this.pendulumNumber);
        this.explanation = constantsDict.explanation;
        this.trailPathsNumeric = new Array(this.pendulumNumber);
        this.trailCounter = 0;
        this.windowSize = 100 / (2 * 1.05 * (this.l1_ + this.l2_));
        this.dotsResizer = 0.1 / this.windowSize;
        this.caption = constantsDict.caption;
        if ("colorScale" in constantsDict) {
            this.colorScale = constants.colorScale;
        } else {
            this.colorScale = d3.interpolateInferno;
        }
        this.currentTime = 0;
        this.initialCoords = this.getInitialCoords();
        this.lastCoords = this.initialCoords.clone();
        this.initialCoordsCart = convertToCoordinates(
            this.initialCoords,
            this.constants
        );

        this.lastTrailUpdateCoords = this.initialCoordsCart.slice(2);
        let location = document.getElementById(this.location);
        this.svg = d3
            .select(location)
            .append("svg")
            .attr("viewBox", "0 0 100 100");
        let explanation = "Hover to play. Click to restart";
        // Check if has tap controls or can't hover
        if ("ontouchstart" in window || navigator.maxTouchPoints > 0) {
            explanation = "Tap to play. Double tap to restart";
        }
        if (this.explanation) {
            explanation = this.explanation;
        }
        let caption = d3
            .select(location)
            .append("p")
            .attr("class", styles.demoCaption)
            .html(this.caption);
        if (constantsDict.explain || this.explanation) {
            caption
                .append("div")
                .attr("class", styles.demoExplanation)
                .html(explanation);
        }
    }

    get l1_() {
        return this.constants[0];
    }
    get m1_() {
        return this.constants[1];
    }
    get l2_() {
        return this.constants[2];
    }
    get m2_() {
        return this.constants[3];
    }
    set l1_(newValue) {
        this.constants[0] = newValue;
        this.windowSize = 100 / (2 * 1.05 * (this.l1_ + this.l2_));
        this.dotsResizer = 0.1 / this.windowSize;
        this.restart.bind(this)();
    }
    set m1_(newValue) {
        this.constants[1] = newValue;
        this.restart.bind(this)();
    }
    set l2_(newValue) {
        this.constants[2] = newValue;
        this.windowSize = 100 / (2 * 1.05 * (this.l1_ + this.l2_));
        this.dotsResizer = 0.1 / this.windowSize;
        this.restart.bind(this)();
    }
    set m2_(newValue) {
        this.constants[3] = newValue;
        this.restart.bind(this)();
    }
    set pendulumNumber_(newValue) {
        this.pendulumNumber = newValue;
        this.initialCoords = this.getInitialCoords();
        this.currentCoords = this.initialCoords.clone();
        this.currentCartCoords = convertToCoordinates(
            this.currentCoords,
            this.constants
        );
        this.initialCoordsCart = convertToCoordinates(
            this.initialCoords,
            this.constants
        );
        // this.restart.bind(this)();
    }
    set phi1Init_(newValue) {
        this.phi1Init = newValue;
        // this.restart.bind(this)();
    }
    set phi2Init_(newValue) {
        this.phi2Init = newValue;
        // this.restart.bind(this)();
    }
    set trailLength_(newValue) {
        this.trailLength = newValue;
        // this.restart.bind(this)();
    }
    get pendulumNumber_() {
        return this.pendulumNumber;
    }
    get phi1Init_() {
        return this.phi1Init;
    }
    get phi2Init_() {
        return this.phi2Init;
    }
    get trailLength_() {
        return this.trailLength;
    }

    start() {
        if (this.lock.request()) {
            return;
        }
        if (!this.continueLooping) {
            this.continueLooping = true;
            const demoContext = this;
            requestAnimationFrame(() => demoContext.updateDisplay());
        }
    }

    stop() {
        this.continueLooping = false;
    }

    restart() {
        this.stop();
        this.initialCoords = this.getInitialCoords();
        this.initialCoordsCart = convertToCoordinates(
            this.initialCoords,
            this.constants
        );
        this.currentCoords = this.initialCoords.clone();
        this.lastCoords = this.currentCoords.clone();
        this.currentCartCoords = this.initialCoordsCart.slice();
        this.trailCounter = 0;
        this.currentStep = 0;

        for (let i = 0; i < this.pendulumNumber; i++) {
            this.trailPaths[i] =
                "M " +
                (this.initialCoordsCart[i][2] * this.windowSize).toPrecision(
                    5
                ) +
                " " +
                (this.initialCoordsCart[i][3] * this.windowSize).toPrecision(
                    5
                ) +
                " ";
        }

        this.svg.selectAll("*").remove();
        this.init();
        setTimeout(() => {
            this.start();
        }, 100);
    }

    getInitialCoords() {
        return initPendulums(
            this.phi1Init + (Math.random() - 0.5) * this.randomness,
            this.phi2Init + (Math.random() - 0.5) * this.randomness,
            this.deviation,
            this.pendulumNumber
        );
    }

    init() {
        for (let i = 0; i < this.pendulumNumber; i++) {
            this.trailPaths[i] =
                "M " +
                (this.initialCoordsCart[i][2] * this.windowSize).toPrecision(
                    5
                ) +
                " " +
                (this.initialCoordsCart[i][3] * this.windowSize).toPrecision(
                    5
                ) +
                " ";
        }
        this.origin = this.svg
            .append("g")
            .attr("transform", "translate(" + 50 + "," + 50 + ")")
            .attr("class", "origin");

        this.trails = this.origin
            .selectAll(".trails")
            .data(this.initialCoordsCart)
            .enter()
            .append("path")
            .attr("fill", "transparent")
            .attr("class", "trails")
            .attr("stroke-width", this.lineResizer)
            .attr("d", (d) => {
                return (
                    "M " +
                    (d[2] * this.windowSize).toPrecision(5) +
                    " " +
                    (d[3] * this.windowSize).toPrecision(5) +
                    " "
                );
            })
            .attr("stroke", this.colorScaleFunc.bind(this));

        let pendulums = this.origin
            .selectAll(".pendulums")
            .data(this.initialCoordsCart)
            .enter()
            .append("g")
            .attr("class", "pendulums");

        this.lines1 = pendulums
            .append("line")
            .attr("class", "pendulumLine1")
            .attr("x1", 0)
            .attr("y1", 0)
            .attr("stroke-width", 2 * this.lineResizer)
            .attr("x2", (d) => {
                return d[0] * this.windowSize;
            })
            .attr("y2", (d) => {
                return d[1] * this.windowSize;
            })
            .attr("stroke", this.colorScaleFunc.bind(this));

        this.lines2 = pendulums
            .append("line")
            .attr("class", "pendulumLine2")
            .attr("stroke-width", 2 * this.lineResizer)
            .attr("x1", (d) => {
                return d[0] * this.windowSize;
            })
            .attr("y1", (d) => {
                return d[1] * this.windowSize;
            })
            .attr("x2", (d) => {
                return d[2] * this.windowSize;
            })
            .attr("y2", (d) => {
                return d[3] * this.windowSize;
            })
            .attr("stroke", this.colorScaleFunc.bind(this));

        this.dots1 = pendulums
            .append("circle")
            .attr("class", "dots1")
            .attr("fill", this.colorScaleFunc.bind(this))
            .attr("cx", (d) => {
                return d[0] * this.windowSize;
            })
            .attr("cy", (d) => {
                return d[1] * this.windowSize;
            })
            .attr("r", this.constants[1] * this.dotResizer * this.windowSize);

        this.dots2 = pendulums
            .append("circle")
            .attr("class", "dots2")
            .attr("fill", this.colorScaleFunc.bind(this))
            .attr("cx", (d) => {
                return d[2] * this.windowSize;
            })
            .attr("cy", (d) => {
                return d[3] * this.windowSize;
            })
            .attr("r", this.constants[3] * this.dotResizer * this.windowSize);

        this.origin
            .append("circle")
            .attr("class", "origin-mark")
            .attr(
                "r",
                Math.max(this.constants[2], this.constants[1]) *
                    1.5 *
                    this.dotResizer *
                    this.windowSize
            )
            .style(
                "fill",
                this.colorScaleFunc.bind(this)(
                    null,
                    (this.pendulumNumber - 1) / (this.pendulumNumber + 5)
                )
            );

        this.currentCoords = this.initialCoords.clone();
    }

    colorScaleFunc(d, i) {
        if (this.pendulumNumber == 1) {
            if (d != null) return this.colorScale(0.95);
            return d3.rgb(this.colorScale(0.95)).hex();
        }
        if (d == null) return d3.rgb(this.colorScale(0.95)).hex();
        return this.colorScale(
            i / (this.pendulumNumber + 5) + 2 / this.pendulumNumber
        );
    }

    updateTrailDataWith(newCoords) {
        this.trailCounter++;
        if (this.trailLength == 0) return;
        if (this.trailCounter > this.trailLength) {
            for (let i = 0; i < this.pendulumNumber; i++) {
                this.trailPaths[i] =
                    "M" +
                    this.trailPaths[i].slice(
                        this.trailPaths[i].indexOf("L") + 1
                    ) +
                    "L " +
                    (newCoords[i][2] * this.windowSize).toPrecision(5) +
                    " " +
                    (newCoords[i][3] * this.windowSize).toPrecision(5) +
                    " ";
            }
        } else {
            for (let i = 0; i < this.pendulumNumber; i++) {
                this.trailPaths[i] +=
                    "L " +
                    (newCoords[i][2] * this.windowSize).toPrecision(5) +
                    " " +
                    (newCoords[i][3] * this.windowSize).toPrecision(5) +
                    " ";
            }
        }
        this.lastCartCoords = this.newCoords;
    }

    updateDisplay() {
        this.lastCoords = this.currentCoords.clone();
        for (let i = 0; i < this.repeats; i++) {
            this.currentCoords = RK4LA(
                derivativeLA,
                this.stepSize,
                0,
                this.currentCoords,
                this.constants
            );
        }
        this.currentCartCoords = convertToCoordinates(
            this.currentCoords,
            this.constants
        );

        this.dots1
            .data(this.currentCartCoords)
            .attr("cx", (d) => {
                return d[0] * this.windowSize;
            })
            .attr("cy", (d) => {
                return d[1] * this.windowSize;
            });
        this.dots2
            .data(this.currentCartCoords)
            .attr("cx", (d) => {
                return d[2] * this.windowSize;
            })
            .attr("cy", (d) => {
                return d[3] * this.windowSize;
            });

        this.lines1
            .data(this.currentCartCoords)
            .attr("x2", (d) => {
                return d[0] * this.windowSize;
            })
            .attr("y2", (d) => {
                return d[1] * this.windowSize;
            });

        this.lines2
            .data(this.currentCartCoords)
            .attr("x1", (d) => {
                return d[0] * this.windowSize;
            })
            .attr("y1", (d) => {
                return d[1] * this.windowSize;
            })
            .attr("x2", (d) => {
                return d[2] * this.windowSize;
            })
            .attr("y2", (d) => {
                return d[3] * this.windowSize;
            });

        if (this.useTrails && !(this.currentStep % this.trailUpdateInterval)) {
            this.lastTrailUpdateCoords = this.currentCartCoords.slice(2);
            this.updateTrailDataWith(this.currentCartCoords);
            this.trails.data(this.trailPaths).attr("d", (d) => {
                return d;
            });
        }
        this.currentStep += 1;
        if (this.continueLooping) {
            requestAnimationFrame(() => this.updateDisplay());
        } else {
            this.lock.release();
        }
    }
}
const g = 9.81;

function concat(a, b, c, d) {
    let destination = new Float64Array(
        a.length + b.length + c.length + d.length
    );
    destination.set(a);
    destination.set(b, a.length);
    destination.set(c, a.length + b.length);
    destination.set(d, a.length + b.length + c.length);
    return destination;
}

function linspace(start, stop, number) {
    let arr = new Float64Array(number);
    let step;
    if (number > 1) step = (stop - start) / (number - 1);
    else step = 0;
    for (let i = 0; i < number; i++) {
        arr[i] = start + step * i;
    }
    return arr;
}

function initPendulums(phi1, phi2, deviation, number) {
    // Phi1 Array contains all the values of phi1 (no deviation)
    // Phi2 Array contains all the values of phi2 but deviated such that the
    //  	average value is phi2, and the difference between any 2 phi2's is
    //  	deviation
    const phi1Array = linspace(phi1, phi1, number);
    let phi2Array;
    if (number > 1) {
        phi2Array = linspace(
            phi2 - (deviation / 2) * (number - 1),
            phi2 + (deviation / 2) * (number - 1),
            number
        );
    } else {
        phi2Array = linspace(
            phi2 - deviation / 2,
            phi2 + deviation / 2,
            number
        );
    }
    const p1Array = linspace(0, 0, number);
    const p2Array = p1Array.clone();
    const output = concat(phi1Array, p1Array, phi2Array, p2Array);
    return output;
}

function RK4LA(f, h, t, p, constants) {
    const k1 = f(t, p.clone(), constants).scalarMul(h);
    const k2 = f(
        t + h / 2,
        p.clone().add(k1.clone().scalarMul(0.5)),
        constants
    ).scalarMul(h);
    const k3 = f(
        t + h / 2,
        p.clone().add(k2.clone().scalarMul(0.5)),
        constants
    ).scalarMul(h);
    const k4 = f(t + h, p.clone().add(k3), constants).scalarMul(h);
    return p.clone().add(
        k1
            .clone()
            .add(k2)
            .add(k3)
            .add(k4)
            .scalarMul(1 / 6)
    );
}

function derivativeLA(t, p, constants) {
    // p: phi1, p1, phi2, p2
    // constants: l1, m1, l2, m2
    const l1 = constants[0],
        m1 = constants[1],
        l2 = constants[2],
        m2 = constants[3];
    const vectorLength = p.length / 4;
    const phi1 = p.slice(0, vectorLength),
        p1 = p.slice(vectorLength, vectorLength * 2),
        phi2 = p.slice(vectorLength * 2, vectorLength * 3),
        p2 = p.slice(vectorLength * 3, vectorLength * 4);

    const cosdif = phi1.clone().sub(phi2).cos();
    const sindif = phi1.clone().sub(phi2).sin();
    const divisor = sindif.clone().square().scalarMul(m2).scalarAdd(m1);

    const h1 = p1
        .clone()
        .mul(p2)
        .mul(sindif)
        .div(divisor.clone().scalarMul(l1 * l2));
    const h2 = p1
        .clone()
        .square()
        .scalarMul(m2 * l2 * l2)
        .add(
            p2
                .clone()
                .square()
                .scalarMul(l1 * l1 * (m1 + m2))
        )
        .sub(
            cosdif
                .clone()
                .mul(p1)
                .mul(p2)
                .scalarMul(2 * m2 * l2 * l2)
        )
        .div(
            divisor
                .clone()
                .square()
                .scalarMul(2 * l1 * l1 * l2 * l2)
        );

    const dphi1 = p1
        .clone()
        .scalarMul(l2)
        .sub(p2.clone().scalarMul(m1).mul(cosdif))
        .div(divisor.clone().scalarMul(l1 * l1 * l2));
    const dphi2 = p2
        .clone()
        .scalarMul(l1 * (m1 + m2))
        .sub(
            p1
                .clone()
                .mul(cosdif)
                .scalarMul(m2 * l2)
        )
        .div(divisor.clone().scalarMul(m2 * l1 * l2 * l2));

    const dp1 = h2
        .clone()
        .mul(sindif)
        .mul(cosdif)
        .scalarMul(2)
        .sub(h1)
        .sub(
            phi1
                .clone()
                .sin()
                .scalarMul(g * l1 * (m1 + m2))
        );
    const dp2 = h1
        .clone()
        .sub(h2.clone().mul(sindif).mul(cosdif).scalarMul(2))
        .sub(
            phi2
                .clone()
                .sin()
                .scalarMul(g * l2 * m2)
        );

    return concat(dphi1, dp1, dphi2, dp2);
}

function convertToCoordinates(p, constants) {
    const l1 = constants[0],
        m1 = constants[1],
        l2 = constants[2],
        m2 = constants[3];
    const vectorLength = p.length / 4;
    const phi1 = p.slice(0, vectorLength),
        p1 = p.slice(vectorLength, vectorLength * 2),
        phi2 = p.slice(vectorLength * 2, vectorLength * 3),
        p2 = p.slice(vectorLength * 3, vectorLength * 4);

    const x1 = phi1.clone().sin().scalarMul(l1),
        y1 = phi1.clone().cos().scalarMul(l1);

    const x2 = x1.clone().add(phi2.clone().sin().scalarMul(l2)),
        y2 = y1.clone().add(phi2.clone().cos().scalarMul(l2));
    return [x1, y1, x2, y2].transpose();
}

Float64Array.prototype.clone = function () {
    let destination = new Float64Array(this.length);
    destination.set(this);
    return destination;
};

Array.prototype.transpose = function () {
    let newArray = new Array(this[0].length);
    for (var i = 0; i < this[0].length; i++) {
        let rowArray = new Float64Array(this.length);
        for (var j = 0; j < this.length; j++) {
            rowArray[j] = this[j][i];
        }
        newArray[i] = rowArray;
    }
    return newArray;
};

Float64Array.prototype.add = function (b) {
    let destination = new Float64Array(this.length);
    destination.set(this);
    for (let i = 0; i < this.length; i++) {
        destination[i] += b[i];
    }
    return destination;
};

Float64Array.prototype.mul = function (b) {
    let destination = new Float64Array(this.length);
    destination.set(this);
    for (let i = 0; i < this.length; i++) {
        destination[i] *= b[i];
    }
    return destination;
};

Float64Array.prototype.div = function (b) {
    let destination = new Float64Array(this.length);
    destination.set(this);
    for (let i = 0; i < this.length; i++) {
        destination[i] /= b[i];
    }
    return destination;
};

Float64Array.prototype.sub = function (b) {
    let destination = new Float64Array(this.length);
    destination.set(this);
    for (let i = 0; i < this.length; i++) {
        destination[i] -= b[i];
    }
    return destination;
};

Float64Array.prototype.scalarAdd = function (b) {
    let destination = new Float64Array(this.length);
    destination.set(this);
    for (let i = 0; i < this.length; i++) {
        destination[i] += b;
    }
    return destination;
};

Float64Array.prototype.scalarMul = function (b) {
    let destination = new Float64Array(this.length);
    destination.set(this);
    for (let i = 0; i < this.length; i++) {
        destination[i] *= b;
    }
    return destination;
};

Float64Array.prototype.scalarDiv = function (b) {
    let destination = new Float64Array(this.length);
    destination.set(this);
    for (let i = 0; i < this.length; i++) {
        destination[i] /= b;
    }
    return destination;
};

Float64Array.prototype.scalarSub = function (b) {
    let destination = new Float64Array(this.length);
    destination.set(this);
    for (let i = 0; i < this.length; i++) {
        destination[i] -= b;
    }
    return destination;
};

Float64Array.prototype.square = function () {
    let destination = new Float64Array(this.length);
    destination.set(this);
    for (let i = 0; i < this.length; i++) {
        destination[i] = destination[i] * destination[i];
    }
    return destination;
};

Float64Array.prototype.cos = function () {
    let destination = new Float64Array(this.length);
    destination.set(this);
    for (let i = 0; i < this.length; i++) {
        destination[i] = Math.cos(destination[i]);
    }
    return destination;
};

Float64Array.prototype.sin = function () {
    let destination = new Float64Array(this.length);
    destination.set(this);
    for (let i = 0; i < this.length; i++) {
        destination[i] = Math.sin(destination[i]);
    }
    return destination;
};

let lock = new AnimationLock();

export function DoublePendulumDemo(constantOverrides) {
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

export function DoublePendulumSliderDemo(constantOverrides) {
    let [sliderOverrides, setSliderOverrides] = useState({
        ...baseConstants,
        ...constantOverrides,
    });

    const slidersConstants = [
        ["Pendulum Number", "pendulumNumber", 1, 200, true],
        ["Trail Length", "trailLength", 0, 200, true],
        ["Rod A Length", "l1", 3, 10, false],
        ["Rod B Length", "l2", 3, 10, false],
        ["Mass A", "m1", 1, 10, false],
        ["Mass B", "m2", 1, 10, false],
        ["Angle A Initial", "phi1Init", 0, 2 * Math.PI, false],
        ["Angle B Initial", "phi2Init", 0, 2 * Math.PI, false],
    ];

    return (
        <>
            <DoublePendulumDemo {...sliderOverrides} />
            <div className={styles.sliderWrapper}>
                {slidersConstants.map((item, i) => (
                    <Slider
                        key={i}
                        id={item[1]}
                        name={item[0]}
                        startValue={item[2]}
                        stopValue={item[3]}
                        isInteger={item[4]}
                        value={
                            sliderOverrides[item[1]] ?? (item[2] + item[3]) / 2
                        }
                        onChange={(name, value) => {
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

const Slider = ({
    name,
    id,
    startValue,
    stopValue,
    isInteger,
    value,
    onChange,
}) => {
    const handleInputChange = (event) => {
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
