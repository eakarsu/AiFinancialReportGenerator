import React from 'react';

function SkeletonPulse({ width, height, borderRadius = '8px', style = {} }) {
  return (
    <div style={{
      width, height, borderRadius, background: 'linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%)',
      backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite',
      ...style,
    }} />
  );
}

export function TableSkeleton({ rows = 8, columns = 5 }) {
  return (
    <div style={{ padding: '0' }}>
      <div style={{ display: 'flex', gap: '16px', padding: '16px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
        {Array(columns).fill(0).map((_, i) => (
          <SkeletonPulse key={i} width={`${100 / columns}%`} height="16px" />
        ))}
      </div>
      {Array(rows).fill(0).map((_, r) => (
        <div key={r} style={{ display: 'flex', gap: '16px', padding: '16px', borderBottom: '1px solid #f3f4f6' }}>
          {Array(columns).fill(0).map((_, c) => (
            <SkeletonPulse key={c} width={`${100 / columns}%`} height="14px" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton({ count = 4 }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
      {Array(count).fill(0).map((_, i) => (
        <div key={i} style={{ background: 'white', borderRadius: '12px', padding: '24px', border: '1px solid #e5e7eb' }}>
          <SkeletonPulse width="48px" height="48px" borderRadius="12px" style={{ marginBottom: '16px' }} />
          <SkeletonPulse width="60%" height="18px" style={{ marginBottom: '8px' }} />
          <SkeletonPulse width="80px" height="32px" style={{ marginBottom: '8px' }} />
          <SkeletonPulse width="90%" height="14px" />
        </div>
      ))}
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px' }}>
      {Array(6).fill(0).map((_, i) => (
        <div key={i} style={{ padding: '16px', background: '#f9fafb', borderRadius: '8px' }}>
          <SkeletonPulse width="80px" height="12px" style={{ marginBottom: '8px' }} />
          <SkeletonPulse width="120px" height="20px" />
        </div>
      ))}
    </div>
  );
}

export default function LoadingSkeleton({ type = 'table', ...props }) {
  switch (type) {
    case 'table': return <TableSkeleton {...props} />;
    case 'cards': return <CardSkeleton {...props} />;
    case 'detail': return <DetailSkeleton {...props} />;
    default: return <TableSkeleton {...props} />;
  }
}
