import clsx from "clsx";
import Layout from "@theme/Layout";
import Heading from "@theme/Heading";

import styles from "./index.module.css";
import { Timeline, TimelineItem } from "../components/Timeline/Timeline";

function HomepageHeader() {
    return (
        <header className={clsx("text--center")}>
            <div className="container">
                <div className="avatar  avatar--vertical">
                    <img
                        className="avatar__photo avatar__photo--xxl margin--md"
                        src="https://gravatar.com/avatar/c7abdf73e309877ecf09e03f27d44a4530dbb98035e47bd86b001a396d095a9b?size=2048"
                        alt="Scott Driggers"
                    />
                </div>
                <Heading as="h2" className="hero__title">
                    Scott Driggers
                </Heading>
                <p className="hero__subtitle">Software tinkerer</p>
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
                    Fun facts
                </Heading>
                <div className={styles.cardWrapper}>
                    <div className={clsx("card", styles.card, "shadow--md")}>
                        <div className="card__header">
                            <h3>Interests</h3>
                        </div>
                        <div className="card__body">
                            <p>
                                I enjoy working on projects in web development
                                (mostly backend), data science, networking and
                                mobile apps
                            </p>
                        </div>
                    </div>
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
                </div>
            </main>
        </Layout>
    );
}
