import { Analytics } from '@vercel/analytics/react';
import Device from "./components/Device.jsx";

export default function App() {
  return (
    <>
      <div className="stage">
        <Device />
      </div>
      <div className="scanlines" aria-hidden="true" />
      <Analytics />
    </>
  );
}
