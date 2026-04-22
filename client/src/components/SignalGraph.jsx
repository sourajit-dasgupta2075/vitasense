import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { EmptyState } from "./common";

function formatSignalTime(value) {
  return `${Number(value).toFixed(1)}s`;
}

export default function SignalGraph({ data }) {
  if (!data.length) {
    return <EmptyState title="Signal buffer warming up" description="Hold still, keep your forehead in frame, and the waveform will begin drawing here." compact />;
  }

  return (
    <div className="h-[220px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="cameraSignalFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10bfe7" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#10bfe7" stopOpacity={0.04} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#e1ebf5" strokeDasharray="3 3" />
          <XAxis dataKey="time" tickFormatter={formatSignalTime} stroke="#8ca0c4" minTickGap={30} />
          <YAxis stroke="#8ca0c4" tickFormatter={(value) => value.toFixed(2)} width={52} />
          <Tooltip
            contentStyle={{ background: "#fff", border: "1px solid #dbe6f2", borderRadius: 18 }}
            labelFormatter={(value) => `Window ${formatSignalTime(value)}`}
          />
          <Area type="monotone" dataKey="value" stroke="#10bfe7" fill="url(#cameraSignalFill)" strokeWidth={2.5} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
