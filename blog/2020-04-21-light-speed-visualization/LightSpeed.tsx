import { useEffect } from "react";
import * as d3 from "d3";
import { useBaseUrlUtils } from "@docusaurus/useBaseUrl";

import styles from "./styles.module.css";

export default function LightSpeed() {
    let { withBaseUrl } = useBaseUrlUtils();

    useEffect(() => {
        const c = 299792458;
        const width = 500;
        const height = 350;
        const mpsToMph = 2.23694;
        const margin = { top: 10, bottom: 30, left: 10, right: 10 };

        let dataContainer: string | any[];
        let canvas: d3.Selection<SVGGElement, unknown, HTMLElement, any>,
            objects: d3.Selection<SVGGElement, unknown, SVGGElement, unknown>,
            gX: d3.Selection<SVGGElement, unknown, HTMLElement, any>;

        let x = d3.scaleLog().domain([6e1, c]).range([0, width]);
        let xAxis = d3.axisBottom(x);

        let currentScale = 10;
        let currentTranslateX = 0;
        let imageRatios;
        let hsize = 80;
        let scaleFactor = 12;
        let objectNumber;
        let alreadyLoaded = false;
        let wrapper = d3.select(`.${styles.wrapper}`);

        let svg = wrapper
            .append("svg")
            .attr(
                "viewBox",
                "0 0 " +
                    (width + margin.left + margin.right) +
                    " " +
                    (height + margin.top + margin.bottom)
            )
            .attr("width", "100%");
        canvas = svg
            .append("g")
            .attr("id", "canvas")
            .attr("width", width)
            .attr("height", height)
            .attr(
                "transform",
                "translate(" + margin.left + "," + margin.top + ")"
            );
        let tooltip = wrapper
            .append("div")
            .attr("class", styles.tooltip)
            .style("opacity", 0);

        function updateGraph() {
            let newTransform = d3.zoomIdentity
                .translate(currentTranslateX, height / 2)
                .scale(currentScale);
            let new_x = newTransform.rescaleX(x);
            gX.call(xAxis.scale(new_x));
            objects.data(dataContainer).attr("transform", (d) => {
                return "translate(" + new_x(d.speed) + "," + height / 2 + ")";
            });
        }

        function motion(event: WheelEvent) {
            let dx = event.deltaX;
            let dy = event.deltaY;
            let amount: number;
            if (Math.abs(dx) > Math.abs(dy)) {
                amount = -dx;
            } else {
                amount = -dy;
            }
            currentTranslateX += amount;
            currentTranslateX = Math.max(
                -490 * currentScale,
                currentTranslateX
            );
            currentTranslateX = Math.min(40, currentTranslateX);
            event.preventDefault();
            event.stopPropagation();
            updateGraph();
        }

        function updateRectanglesIfComplete() {
            let proceed = true;
            for (let i = 0; i < dataContainer.length; i++) {
                proceed = proceed && imageRatios[dataContainer[i].name] != null;
            }
            if (proceed) {
                if (alreadyLoaded) return;
                alreadyLoaded = true;

                objects
                    .append("rect")
                    .attr("height", hsize)
                    .attr("width", function (d: any) {
                        return imageRatios[d.name] * hsize;
                    })
                    .attr("stroke", "white")
                    .style("stroke-width", 2)
                    .attr("y", function (d, i) {
                        return (
                            -hsize / 2 +
                            scaleFactor * i -
                            (scaleFactor * objectNumber) / 2
                        );
                    });

                objects
                    .append("image")
                    .attr("height", hsize)
                    .attr("width", function (d: any) {
                        return imageRatios[d.name] * hsize;
                    })
                    .attr("y", function (d, i) {
                        return (
                            -hsize / 2 +
                            scaleFactor * i -
                            (scaleFactor * objectNumber) / 2
                        );
                    })
                    .attr("href", (d: any) => {
                        return withBaseUrl(`light-speed/${d.image}`);
                    });
            } else {
                setTimeout(updateRectanglesIfComplete, 1000);
            }
        }

        d3.json(withBaseUrl("light-speed/FastThings.json")).then(
            (data: any[]) => {
                dataContainer = JSON.parse(JSON.stringify(data));
                for (let i = 0; i < dataContainer.length; i++) {
                    dataContainer[i].speed =
                        Math.round(dataContainer[i].speed * mpsToMph * 100) /
                        100.0;
                }
                imageRatios = {};
                for (let i = 0; i < dataContainer.length; i++) {
                    let img = new Image();
                    img.onload = function (this: HTMLImageElement, ev: Event) {
                        imageRatios[dataContainer[i].name] =
                            this.width / this.height;
                        updateRectanglesIfComplete();
                    };
                    img.src = withBaseUrl(
                        "light-speed/" + dataContainer[i].image
                    );
                }

                objects = canvas
                    .selectAll(".objects")
                    .data(data, function (d: any) {
                        return d.name;
                    })
                    .enter()
                    .append("g")
                    .attr("class", "objects")
                    .attr("transform", (d) => {
                        return (
                            "translate(" + x(d.speed) + "," + height / 2 + ")"
                        );
                    })
                    .on("mouseover", function (evt: MouseEvent, d) {
                        let tooltipText =
                            '<span style="font-weight: bold; font-size: 12px">' +
                            d.name +
                            "</span><br/>" +
                            '<span style="font-style: italic">' +
                            d.speed +
                            "</span>" +
                            " mph" +
                            "</br>" +
                            "</br>" +
                            d.description;
                        tooltip
                            .transition()
                            .duration(200)
                            .style("opacity", 0.9);
                        tooltip
                            .html(tooltipText)
                            .style("left", evt.offsetX + "px")
                            .style("top", evt.offsetY - 28 + "px");
                    })
                    .on("mouseout", function (d) {
                        tooltip.transition().duration(500).style("opacity", 0);
                    });

                objectNumber = data.length;

                gX = canvas
                    .append("g")
                    .attr("class", "axis axis-x")
                    .attr("transform", "translate(" + 0 + "," + height + ")")
                    .call(xAxis);
                updateGraph();
                svg.on("wheel.zoom", motion);
            }
        );
    }, []);

    return <div className={styles.wrapper} />;
}
