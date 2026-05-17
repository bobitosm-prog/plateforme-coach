'use client';

import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { useConsent } from './CookieConsent';

export default function AnalyticsGate() {
  const consent = useConsent();
  if (!consent?.analytics) return null;
  return (
    <>
      <Analytics />
      <SpeedInsights />
    </>
  );
}
