import clsx from "clsx";
import Link from "@docusaurus/Link";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import Layout from "@theme/Layout";
import Heading from "@theme/Heading";

import styles from "./index.module.css";
import { Timeline, TimelineItem } from "../components/Timeline/Timeline";

function HomepageHeader() {
    return (
        <header
            className={clsx(
                "hero hero--primary shadow--lw margin--lg",
                styles.heroBanner
            )}
        >
            <div className="container">
                <p className="hero__subtitle">Hi I am</p>
                <Heading as="h1" className="hero__title">
                    Scott Driggers
                </Heading>
                <p className="hero__subtitle">A software engineer</p>
            </div>
        </header>
    );
}

export default function Home(): JSX.Element {
    return (
        <Layout
            title={`Hello from Scott Driggers`}
            description="Personal webpage for Scott Driggers"
        >
            <div>
                <HomepageHeader />
            </div>
            <main className={styles.main}>
                <Heading as="h2" className="text--left">
                    About Me
                </Heading>
                <div className={styles.cardWrapper}>
                    <div className={clsx("card", styles.card, "shadow--md")}>
                        <div className="card__header">
                            <h3>Home</h3>
                        </div>
                        <div className="card__body">
                            <p>
                                Living in Columbia SC with my wife and two cats
                            </p>
                        </div>
                    </div>
                    <div className={clsx("card", styles.card, "shadow--md")}>
                        <div className="card__header">
                            <h3>Hobbies</h3>
                        </div>
                        <div className="card__body">
                            <p>
                                I enjoy ultimate frisbee, hiking, and anything
                                outdoors.
                            </p>
                        </div>
                    </div>
                    <div className={clsx("card", styles.card, "shadow--md")}>
                        <div className="card__header">
                            <h3>Interests</h3>
                        </div>
                        <div className="card__body">
                            <p>
                                Most recently I have been working on projects in
                                web development, data science, networking and
                                mobile apps
                            </p>
                        </div>
                    </div>
                </div>
                <section>
                    <h2 className="text--left">Experience</h2>
                    <Timeline>
                        <TimelineItem date="2022-Present">
                            <h2>Systems Architect</h2>
                            <h3 className={styles.cardHeader}>Poltys Inc.</h3>
                            <p>
                                Lead engineer on Location Based Services
                                project.
                            </p>
                            <p>
                                Team lead on mobile healthcare application and
                                primary backend engineer on the project
                            </p>
                        </TimelineItem>
                        <TimelineItem date="2020-2022">
                            <h1>Data Scientist · Software Engineer</h1>
                            <h3 className={styles.cardHeader}>Poltys Inc.</h3>
                            <p>
                                Developed machine learning models for fall risk.
                                Developed algorithms for indoor location
                                tracking.
                            </p>
                        </TimelineItem>

                        <TimelineItem date="Summer 2020">
                            <h1>Research Intern</h1>
                            <h3 className={styles.cardHeader}>
                                Oak Ridge National Lab
                            </h3>
                            <p>
                                Applied machine learning models to improve the
                                performance of physics simulations.
                            </p>
                        </TimelineItem>

                        <TimelineItem date="Summer 2019">
                            <h1>Research Intern</h1>
                            <h3 className={styles.cardHeader}>
                                Clemson University - SIN Group
                            </h3>
                            <p>
                                Worked on a project to deflect an ion beam in a
                                strong vacuum using a 3D printed deflector.
                            </p>
                            <p>
                                Developed control software to the temperature
                                control system for the vacuum chamber, and wrote
                                visualization software for the ion scattering
                                simulation software.
                            </p>
                        </TimelineItem>

                        <TimelineItem date="2018-2021">
                            <h1>B.S. Physics and B.S. Mathematics</h1>
                            <h3 className={styles.cardHeader}>
                                Clemson University
                            </h3>
                            <p>
                                Focused on computational and theoretical physics
                                as well as not-very-applied mathematics.
                            </p>
                        </TimelineItem>
                    </Timeline>
                </section>
            </main>
        </Layout>
    );
}
