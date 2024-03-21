import clsx from "clsx";
import Layout from "@theme/Layout";
import Heading from "@theme/Heading";

import styles from "./index.module.css";
import { Timeline, TimelineItem } from "../components/Timeline/Timeline";

export default function Home(): JSX.Element {
    return (
        <Layout
            title={`Hello from Scott Driggers`}
            description="Personal webpage for Scott Driggers"
        >
            <div>
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
            </div>
            <main className={styles.main}>
                <section>
                    <h2 className="text--left">Background</h2>
                    <div className="card">
                        <p>
                            Background in physics + math, done some work in full
                            stack development for saas systems in healthcare,
                            enjoy writing in Rust when I can, built a few mobile
                            apps with bluetooth features, experience in
                            bluetooth development, experience in data science +
                            visualization, experience in standard ml
                        </p>
                        <p>
                            Love learning and what's next for me is learning to
                            manage people, direct a project to completion and
                            work more about the business side of things.
                        </p>
                        <p>
                            Additionally I am hoping to get the chance to learn
                            more on the hardware side (embedded systems, chip
                            design, etc.)
                        </p>
                    </div>
                </section>
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
