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
                    Hi, I'm Scott Driggers
                </header>
            </div>
            <main className="px-8 py-4 space-y-8">
                <section>
                    <h2 className="text--left">Background</h2>
                    <p>
                        I graduated from Clemson University with degrees in
                        physics and mathematics. In college I focused on the
                        theoretical side of these fields and studied subjects
                        that ranged from quantum mechanics to abstract algebra.
                    </p>
                    <p>
                        On top of these projects, I done some work in full stack
                        development for saas systems in healthcare, enjoy
                        writing in Rust when I can, built a few mobile apps with
                        bluetooth features, experience in bluetooth development,
                        experience in data science + visualization, experience
                        in standard ml
                    </p>
                    <p>
                        Love learning and what's next for me is learning to
                        manage people, direct a project to completion and work
                        more about the business side of things.
                    </p>
                    <p>
                        Additionally I am hoping to get the chance to learn more
                        on the hardware side (embedded systems, chip design,
                        etc.)
                    </p>
                </section>

                <section>
                    <h2 className="text-left">Experience</h2>
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
                <section>
                    <Heading as="h2" className="text--left">
                        Fun facts
                    </Heading>
                    <div className="flex-grow text-center grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                        <div
                            className={clsx("card", styles.card, "shadow--md")}
                        >
                            <div className="card__header">
                                <h3>Home</h3>
                            </div>
                            <div className="card__body">
                                <p>
                                    I'm currently living in Columbia SC with my
                                    wife and two cats
                                </p>
                            </div>
                        </div>
                        <div
                            className={clsx("card", styles.card, "shadow--md")}
                        >
                            <div className="card__header">
                                <h3>Hobbies</h3>
                            </div>
                            <div className="card__body">
                                <p>
                                    I enjoy ultimate frisbee, hiking, and
                                    anything outdoors. I'm thinking about
                                    starting Jiu Jitsu
                                </p>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
        </Layout>
    );
}
