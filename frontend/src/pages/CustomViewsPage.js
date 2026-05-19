import React from 'react';
import RevenueExpenseTrendChart from '../components/RevenueExpenseTrendChart';
import ExpenseCategoryHeatmap from '../components/ExpenseCategoryHeatmap';
import QuarterlyAnnualReportPdf from '../components/QuarterlyAnnualReportPdf';
import ReportTemplateEditor from '../components/ReportTemplateEditor';

export default function CustomViewsPage() {
  return (
    <div data-testid="custom-views-page" style={{ padding: 20 }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: 0, color: '#1a3a5c' }}>Reports Views</h2>
        <p style={{ color: '#666', marginTop: 4 }}>
          Custom analytics views and reusable report tooling for financial reporting.
        </p>
      </div>
      <RevenueExpenseTrendChart />
      <ExpenseCategoryHeatmap />
      <QuarterlyAnnualReportPdf />
      <ReportTemplateEditor />
    </div>
  );
}
