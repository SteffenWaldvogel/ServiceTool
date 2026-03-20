import React from 'react';
import UnmatchedEmailsPanel from '../components/UnmatchedEmailsPanel';

export default function PosteingangPage() {
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Posteingang</div>
          <div className="page-subtitle">Nicht zugeordnete Emails prüfen und Tickets zuweisen</div>
        </div>
      </div>
      <UnmatchedEmailsPanel />
    </div>
  );
}
