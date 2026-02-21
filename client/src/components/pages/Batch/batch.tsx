import React from "react";
import ViewBatches from "../../ui/batch/ViewBatches";


const BatchPage: React.FC = () => {
  return (
    <div style={{ background: 'var(--background)', color: 'var(--foreground)' }} className="min-h-screen p-6">
      <ViewBatches />
    </div>
  );
};

export default BatchPage;