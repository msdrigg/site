import { PropsWithChildren, ReactNode } from "react";
import styles from "./timeline.module.css";

export function Timeline(props: PropsWithChildren): ReactNode {
    return (
        <div className={styles.timelineSection}>
            <div className={styles.timelineItems}>{props.children}</div>
        </div>
    );
}

export function TimelineItem(
    props: PropsWithChildren<{ date: string }>
): ReactNode {
    return (
        <div className={styles.timelineItem}>
            <div className={styles.timelineDot}></div>
            <div className={styles.timelineDate}>{props.date}</div>
            <div className={styles.timelineContent}>{props.children}</div>
        </div>
    );
}
