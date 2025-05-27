import { useBaseUrlUtils } from "@docusaurus/useBaseUrl";
import { useEffect, useId } from "react";
import * as d3 from "d3";
import styles from "./styles.module.css";
import * as topojson from "topojson-client";

type DataType = { key: string; value: [number, number] };

export default function LightSpeed() {
    let { withBaseUrl } = useBaseUrlUtils();
    let id = useId();

    useEffect(() => {
        const width = 420,
            height = 360,
            maxRadius = 28;

        let maxData = 100;

        let wrapper = document.getElementById(id);

        let svg = d3
            .select(wrapper)
            .append("svg")
            .attr("width", width)
            .attr("id", "SVGMain")
            .attr("height", height);

        let sc_projection = d3
            .geoAlbers()
            .parallels([32 + 30 / 60, 34 + 50 / 60])
            .rotate([81, 0])
            .scale(6000)
            .translate([155, -340]);

        let path = d3.geoPath().projection(sc_projection);

        let tooltip = d3
            .select(wrapper)
            .append("div")
            .attr("class", styles.tooltip)
            .style("opacity", 0);

        let radius;

        let playButton;
        let stopButton;

        let sizeLegend;
        let colorLegend;
        let timeLegend;

        let virusData;
        let deathData;
        let centroids = {};
        let totalData = {};

        let dateOptions = {
            month: "long",
            day: "numeric",
        } satisfies Intl.DateTimeFormatOptions;
        let dataLoaded = false;
        let currentDay = 0;
        let timerID: NodeJS.Timeout | null = null;
        let isPlaying = false;

        function getDate(day) {
            return new Date(2020, 2, 6 + day);
        }

        function drawButtons() {
            let buttonGroup = svg
                .append("g")
                .attr(
                    "transform",
                    "translate(" +
                        (width - 50) +
                        "," +
                        (height - 20 - (2 * maxRadius + 10)) +
                        ")"
                )
                .attr("class", styles.button);

            playButton = buttonGroup
                .append("g")
                .attr("class", styles.button)
                .attr("transform", "translate(0," + (maxRadius - 20) + ")")
                .on("click", playAnimation);
            playButton
                .append("rect")
                .attr("rx", 10)
                .attr("ry", 10)
                .attr("width", maxRadius * 2)
                .attr("height", maxRadius)
                .attr("x", -maxRadius);

            playButton
                .append("text")
                .attr("x", -maxRadius / 2)
                .attr("dy", "1.2em")
                .text("Play");

            stopButton = buttonGroup
                .append("g")
                .attr("class", styles.button)
                .attr("transform", "translate(0," + (maxRadius * 2 - 10) + ")")
                .on("click", stopAnimation);

            stopButton
                .append("rect")
                .attr("rx", 10)
                .attr("ry", 10)
                .attr("width", maxRadius * 2)
                .attr("height", maxRadius)
                .attr("x", -maxRadius);

            stopButton
                .append("text")
                .attr("x", -maxRadius / 2 - 2)
                .attr("dy", "1.2em")
                .text("Stop");
        }

        function drawLegend() {
            let d1 = maxData / 2;
            let d2 = maxData / 4;
            sizeLegend = svg
                .append("g")
                .attr("class", styles.sizeLegend)
                .attr(
                    "transform",
                    "translate(" + 60 + "," + (height - 20) + ")"
                )
                .selectAll("g")
                .data([
                    Math.floor(d1 / 10) * 10,
                    Math.floor(d2 / 10) * 10,
                    Math.floor(maxData / 10) * 10,
                ])
                .enter()
                .append("g");

            sizeLegend
                .append("circle")
                .attr("cy", function (d) {
                    return -radius(d);
                })
                .attr("r", radius);

            sizeLegend
                .append("text")
                .attr("y", function (d) {
                    return -2 * radius(d);
                })
                .attr("x", function (d) {
                    return -radius(d) / 100;
                })
                .attr("dy", "1.2em")
                .text(d3.format(".1s"));

            colorLegend = svg
                .append("g")
                .attr("class", styles.colorLegend)
                .attr(
                    "transform",
                    "translate(" +
                        60 +
                        "," +
                        (height - (20 + 2 * maxRadius)) +
                        ")"
                )
                .selectAll("g")
                .data([
                    [0, "Cases", "#aa1111"],
                    [1, "Deaths", "#000"],
                ])
                .enter()
                .append("g");

            colorLegend
                .append("circle")
                .attr("cx", function (d) {
                    return d[0] * 60 - 30;
                })
                .attr("cy", -maxRadius)
                .attr("r", maxRadius)
                .style("fill", function (d) {
                    return d[2];
                });

            colorLegend
                .append("text")
                .attr("x", function (d) {
                    return d[0] * 60 - 30;
                })
                .attr("y", -maxRadius - 10)
                .attr("dy", "1.2em")
                .text(function (d) {
                    return d[1];
                });
            timeLegend = svg
                .append("g")
                .attr("class", styles.timeLegend)
                .attr(
                    "transform",
                    "translate(" +
                        60 +
                        "," +
                        (height - (20 + 32 + 4 * maxRadius)) +
                        ")"
                )
                .data([0]);

            timeLegend
                .append("rect")
                .attr("width", maxRadius * 2 + 4)
                .attr("rx", 10)
                .attr("ry", 10)
                .attr("height", maxRadius)
                .attr("x", -maxRadius - 2);
            timeLegend
                .append("text")
                .attr("y", maxRadius / 2 + 3)
                .text(function (d) {
                    return getDate(d).toLocaleDateString("en-US", dateOptions);
                });
        }

        function load_initial_data() {
            maxData = 0;
            for (let day in virusData.columns) {
                let dayData = {};
                for (let county in virusData[day]) {
                    dayData[county] = [
                        virusData[day][county],
                        deathData[day][county],
                    ];
                    maxData = Math.max(maxData, virusData[day][county]);
                }
                totalData[day] = dayData;
            }
            radius = d3.scaleSqrt().domain([0, maxData]).range([0, maxRadius]);
            drawLegend();
            drawButtons();
            fill_initial_data();
        }

        function inputInitialData() {
            d3.csv(
                withBaseUrl("covid-spread-sc/SC_VIRUS_TOTAL_CUMULATIVE.csv")
            ).then(function (total_data) {
                virusData = total_data;
                if (dataLoaded) {
                    load_initial_data();
                } else {
                    dataLoaded = true;
                }
            });
            d3.csv(
                withBaseUrl("covid-spread-sc/SC_VIRUS_DEATH_CUMULATIVE.csv")
            ).then(function (total_data) {
                deathData = total_data;
                if (dataLoaded) {
                    load_initial_data();
                } else {
                    dataLoaded = true;
                }
            });
        }

        function fill_initial_data() {
            let dVList = Object.entries(totalData[0]).map(([key, value]) => {
                return { key, value };
            });
            svg.selectAll(`path.${styles.countyFill}`)
                .data(dVList)
                .style("fill-opacity", function (d: DataType) {
                    if (+d.value[0] > 0) return 0;
                    return 1;
                })
                .on("mouseover", function (evt: MouseEvent, d: DataType) {
                    if (+d.value[0] >= 1) return;
                    let firstS = "";
                    let secondS = "";
                    if (d.value[0] != 1) firstS = "s";
                    if (d.value[1] != 1) secondS = "s";
                    let tooltipText =
                        "<bold>" +
                        d.key +
                        "</bold>" +
                        "<br/>" +
                        +d.value[0] +
                        " case" +
                        firstS +
                        "<br/>" +
                        +d.value[1] +
                        " death" +
                        secondS;
                    tooltip.transition().duration(200).style("opacity", 0.9);
                    tooltip
                        .html(tooltipText)
                        .style("left", evt.pageX + "px")
                        .style("top", evt.pageY - 28 + "px");
                })
                .on("mouseout", function () {
                    tooltip.transition().duration(500).style("opacity", 0);
                });
            let countyLocations = svg
                .append("g")
                .attr("class", styles.bubbleContainer)
                .selectAll(".county-centroid")
                .data(dVList)
                .enter()
                .append("g")
                .attr("class", "county-centroid")
                .attr(
                    "transform",
                    function (d: { key: string; value: [number, number] }) {
                        return "translate(" + centroids[d.key] + ")";
                    }
                );

            countyLocations
                .append("circle")
                .attr("class", styles.case)
                .attr(
                    "r",
                    function (d: { key: string; value: [number, number] }) {
                        return radius(+d.value[0]);
                    }
                );

            countyLocations
                .append("circle")
                .attr("class", styles.death)
                .attr("r", function (d: DataType) {
                    return radius(+d.value[1]);
                });

            countyLocations
                .append("circle")
                .attr("class", styles.caseBoundary)
                .attr("r", function (d: DataType) {
                    return radius(+d.value[0]);
                })
                .on("mouseover", function (evt: MouseEvent, d: DataType) {
                    let firstS = "";
                    let secondS = "";
                    if (d.value[0] != 1) firstS = "s";
                    if (d.value[1] != 1) secondS = "s";
                    let tooltipText =
                        "<bold>" +
                        d.key +
                        "</bold>" +
                        "<br/>" +
                        +d.value[0] +
                        " case" +
                        firstS +
                        "<br/>" +
                        +d.value[1] +
                        " death" +
                        secondS;
                    tooltip.transition().duration(200).style("opacity", 0.9);
                    tooltip
                        .html(tooltipText)
                        .style("left", evt.pageX + "px")
                        .style("top", evt.pageY - 28 + "px");
                })
                .on("mouseout", function () {
                    tooltip.transition().duration(500).style("opacity", 0);
                });
        }

        function playAnimation() {
            if (isPlaying) return;
            isPlaying = true;
            if (currentDay >= Object.keys(virusData).length - 2) {
                currentDay = 0;
                transitionToDay(currentDay);
            }
            timerID = setInterval(() => updateForNextDay(), 605);
        }

        function stopAnimation() {
            if (!isPlaying) return;
            if (timerID != null) {
                clearInterval(timerID);
            }
            isPlaying = false;
        }

        function updateForNextDay() {
            currentDay = (currentDay + 1) % (Object.keys(totalData).length - 2);
            transitionToDay(currentDay);
        }

        function transitionToDay(day) {
            if (day >= Object.keys(virusData).length - 2) {
                stopAnimation();
            }

            let dVList = Object.entries(totalData[day]).map(([key, value]) => {
                return { key, value };
            });

            let countyLocations = svg
                .selectAll(".county-centroid")
                .data(dVList);
            let cases = countyLocations.select(`circle.${styles.case}`);
            let deaths = countyLocations.select(`circle.${styles.death}`);
            let boundaries = countyLocations.select(
                `circle.${styles.caseBoundary}`
            );

            svg.select(`.${styles.timeLegend}`)
                .data([day])
                .select("text")
                .text(function (d) {
                    return getDate(d).toLocaleDateString("en-US", dateOptions);
                });

            if (day == 0) {
                cases.attr("r", function (d: DataType) {
                    return radius(+d.value[0]);
                });

                deaths.attr("r", function (d: DataType) {
                    return radius(+d.value[1]);
                });

                boundaries.attr("r", function (d: DataType) {
                    return radius(+d.value[0]);
                });

                svg.selectAll(`path.${styles.countyFill}`)
                    .data(dVList)
                    .style("fill-opacity", function (d: DataType) {
                        if (+d.value[0] >= 1) return 0;
                        return 1;
                    });
            } else {
                let transitionEase = d3.easeLinear;
                let duration = 600;
                cases
                    .transition()
                    .duration(duration)
                    .ease(transitionEase)
                    .attr("r", function (d: DataType) {
                        return radius(+d.value[0]);
                    });

                deaths
                    .transition()
                    .duration(duration)
                    .ease(transitionEase)
                    .attr("r", function (d: DataType) {
                        return radius(+d.value[1]);
                    });

                boundaries
                    .transition()
                    .duration(duration)
                    .ease(transitionEase)
                    .attr("r", function (d: DataType) {
                        return radius(+d.value[0]);
                    });

                svg.selectAll(`path.${styles.countyFill}`)
                    .data(dVList)
                    .transition()
                    .ease(transitionEase)
                    .duration(duration)
                    .style("fill-opacity", function (d: DataType) {
                        if (+d.value[0] >= 1) return 0;
                        return 1;
                    });
            }
        }

        d3.json(withBaseUrl("covid-spread-sc/states.json")).then(function (sc: {
            type: string;
            objects: { places: object };
        }) {
            let state = topojson.feature(sc, sc.objects.places);

            svg.append("path")
                .datum(state)
                .attr("d", path)
                .attr("class", styles.state);
        });

        d3.json(withBaseUrl("covid-spread-sc/counties.json")).then(
            function (counties: { objects: { places: object } }) {
                let features = topojson.feature(
                    counties,
                    counties.objects.places
                ).features;
                svg.append("g")
                    .selectAll(`path.${styles.countyFill}`)
                    .data(
                        features.sort(function (a, b) {
                            if (b.properties.NAME > a.properties.NAME)
                                return -1;
                            if (b.properties.NAME < a.properties.NAME) return 1;
                            return 0;
                        })
                    )
                    .enter()
                    .append("path")
                    .attr("d", path)
                    .attr("class", styles.countyFill);

                svg.append("path")
                    .datum(
                        topojson.mesh(
                            counties,
                            counties.objects.places,
                            function (a, b) {
                                return a !== b;
                            }
                        )
                    )
                    .attr("d", path)
                    .attr("class", styles.countyBoundary);

                svg.append("path")
                    .datum(
                        topojson.mesh(
                            counties,
                            counties.objects.places,
                            function (a, b) {
                                return a === b;
                            }
                        )
                    )
                    .attr("d", path)
                    .attr("class", styles.countyBoundary);
                for (let i = 0; i < features.length; i++) {
                    let centroid = path.centroid(features[i]);
                    if (features[i].properties.NAME == "Charleston") {
                        centroid = [centroid[0] - 15, centroid[1] + 12];
                    }
                    centroids[features[i].properties.NAME] = centroid;
                }
                inputInitialData();
            }
        );
    }, [id]);

    return <div className={styles.wrapper} id={id} />;
}
