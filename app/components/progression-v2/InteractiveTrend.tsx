"use client";
import { useId, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { SizedContainer, useHasSize } from "../ui/SizedChart";
import styles from "./AnalyticsCompact.module.css";

export interface TrendPoint {
  date: string;
  value: number;
}
export default function InteractiveTrend({
  points,
  unit,
  title,
}: {
  points: TrendPoint[];
  unit: string;
  title: string;
}) {
  const t = useTranslations("analyticsCompact"),
    locale = useLocale(),
    id = useId();
  const { rootRef, hasSize } = useHasSize();
  const [selection, setSelection] = useState<{
    key: string;
    index: number;
  } | null>(null);
  const data = points
    .filter(
      (p) => Number.isFinite(p.value) && Number.isFinite(Date.parse(p.date)),
    )
    .map((p) => ({ ...p, time: Date.parse(p.date + "T12:00:00Z") }));
  const key = `${title}:${unit}:${data.map((p) => `${p.date}:${p.value}`).join(",")}`;
  const index =
    selection?.key === key
      ? Math.min(selection.index, data.length - 1)
      : data.length - 1;
  const point = data[index];
  const date = (value: number) =>
    new Intl.DateTimeFormat(locale, {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    }).format(new Date(value));
  const number = (value: number) =>
    value.toLocaleString(locale, { maximumFractionDigits: 1 });
  return (
    <div className={styles.trend} ref={rootRef} data-no-tab-swipe="true">
      <h3>{title}</h3>
      {!data.length ? (
        <p className={styles.notice}>{t("noPoints")}</p>
      ) : (
        <>
          <div role="img" aria-label={`${title} · ${unit}`}>
            <SizedContainer hasSize={hasSize} height={170}>
              <LineChart
                data={data}
                margin={{ top: 12, right: 12, bottom: 0, left: 0 }}
              >
                <CartesianGrid vertical={false} stroke="#3a352a" />
                <XAxis
                  type="number"
                  dataKey="time"
                  domain={["dataMin", "dataMax"]}
                  tickFormatter={date}
                  minTickGap={55}
                  tick={{ fill: "#aaa69b", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={["auto", "auto"]}
                  width={48}
                  tickFormatter={number}
                  tick={{ fill: "#aaa69b", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  labelFormatter={(value) => date(Number(value))}
                  formatter={(value) => [
                    `${number(Number(value))} ${unit}`,
                    title,
                  ]}
                  contentStyle={{
                    background: "#211f18",
                    border: "1px solid #544a33",
                    borderRadius: 10,
                    color: "#f5f2ea",
                  }}
                />
                <Line
                  type="linear"
                  dataKey="value"
                  stroke="#dfbf70"
                  strokeWidth={2}
                  dot={data.length < 40}
                  isAnimationActive={false}
                />
                {point && (
                  <ReferenceDot
                    x={point.time}
                    y={point.value}
                    r={5}
                    fill="#dfbf70"
                    stroke="#211f18"
                  />
                )}
              </LineChart>
            </SizedContainer>
          </div>
          <label className={styles.small} htmlFor={id}>
            {t("explorePoints")}
          </label>
          <input
            id={id}
            type="range"
            min={0}
            max={Math.max(0, data.length - 1)}
            value={index}
            disabled={data.length < 2}
            onChange={(event) =>
              setSelection({ key, index: Number(event.target.value) })
            }
          />
          <p className={styles.pointValue} aria-live="polite">
            {date(point.time)} · {number(point.value)} {unit}
          </p>
        </>
      )}
    </div>
  );
}
