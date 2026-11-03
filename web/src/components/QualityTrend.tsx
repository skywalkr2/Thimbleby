// A small trend line for one measure, drawn as a picture with a text alternative that says the numbers (no chart library). It
// shows the measure week by week, oldest first, with the latest point marked; with fewer than two weeks there is nothing to draw.
import { useId } from "react";
import styles from "./QualityTrend.module.css";

const W = 120;
const H = 28;
const PAD = 3;

export function QualityTrend(props: { values: number[]; /** What the picture says in words, with the numbers. */ label: string }) {
  const id = useId();
  const { values } = props;
  if (values.length < 2) return null;
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = hi - lo;
  const x = (i: number) => PAD + (i * (W - 2 * PAD)) / (values.length - 1);
  // A flat series sits in the middle of the picture.
  const y = (v: number) => (span === 0 ? H / 2 : H - PAD - ((v - lo) * (H - 2 * PAD)) / span);
  const points = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const last = values.length - 1;
  return (
    <svg className={styles.trend} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-labelledby={id} data-trend="">
      <title id={id}>{props.label}</title>
      <polyline className={styles.line} points={points} fill="none" vectorEffect="non-scaling-stroke" />
      <circle className={styles.dot} cx={x(last)} cy={y(values[last])} r={2.5} />
    </svg>
  );
}
