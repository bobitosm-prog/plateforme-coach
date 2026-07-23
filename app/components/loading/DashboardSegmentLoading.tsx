type DashboardSegmentLoadingProps = {
  label: string
  segment: 'coach' | 'client-detail'
}

export default function DashboardSegmentLoading({
  label,
  segment,
}: DashboardSegmentLoadingProps) {
  return (
    <main
      aria-busy="true"
      aria-label={label}
      data-dashboard-segment-loading={segment}
      role="status"
    >
      <style>{`
        [data-dashboard-segment-loading] {
          min-height: 100dvh;
          background: #0d0b08;
          color: #f4ead7;
          display: grid;
          grid-template-columns: minmax(0, 1fr);
        }
        [data-segment-loading-sidebar] {
          display: none;
          border-right: 1px solid #2b261f;
          padding: 28px 24px;
        }
        [data-segment-loading-content] {
          width: 100%;
          max-width: 1180px;
          margin: 0 auto;
          padding: 24px 16px 40px;
          box-sizing: border-box;
        }
        [data-segment-loading-header] {
          min-height: 72px;
          display: flex;
          align-items: center;
          gap: 16px;
          border-bottom: 1px solid #2b261f;
          margin-bottom: 24px;
        }
        [data-segment-loading-mark],
        [data-segment-loading-line],
        [data-segment-loading-panel] {
          background: #1c1915;
          border: 1px solid #2b261f;
        }
        [data-segment-loading-mark] {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          flex: 0 0 auto;
        }
        [data-segment-loading-copy] {
          display: grid;
          gap: 8px;
          width: min(320px, 70%);
        }
        [data-segment-loading-line] {
          height: 12px;
          width: 100%;
        }
        [data-segment-loading-line="short"] {
          width: 58%;
        }
        [data-segment-loading-grid] {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }
        [data-segment-loading-panel] {
          min-height: 112px;
        }
        [data-segment-loading-panel="wide"] {
          min-height: 240px;
          grid-column: 1 / -1;
        }
        [data-segment-loading-label] {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }
        @media (min-width: 1024px) {
          [data-dashboard-segment-loading] {
            grid-template-columns: 240px minmax(0, 1fr);
          }
          [data-segment-loading-sidebar] {
            display: grid;
            align-content: start;
            gap: 16px;
          }
          [data-segment-loading-content] {
            padding: 32px 40px 56px;
          }
          [data-segment-loading-grid] {
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 16px;
          }
        }
      `}</style>

      <aside aria-hidden="true" data-segment-loading-sidebar>
        <div data-segment-loading-line />
        <div data-segment-loading-line="short" />
        <div data-segment-loading-line />
      </aside>

      <section data-segment-loading-content>
        <span data-segment-loading-label>{label}</span>
        <header aria-hidden="true" data-segment-loading-header>
          <div data-segment-loading-mark />
          <div data-segment-loading-copy>
            <div data-segment-loading-line />
            <div data-segment-loading-line="short" />
          </div>
        </header>
        <div aria-hidden="true" data-segment-loading-grid>
          <div data-segment-loading-panel />
          <div data-segment-loading-panel />
          <div data-segment-loading-panel />
          <div data-segment-loading-panel />
          <div data-segment-loading-panel="wide" />
        </div>
      </section>
    </main>
  )
}
