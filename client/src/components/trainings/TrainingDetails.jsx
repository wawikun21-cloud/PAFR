import React from 'react';
import ActivityCards from './ActivityCards';
import AttendanceTable from './AttendanceTable';

const TrainingDetails = ({ training, onClose }) => {
  if (!training) return null;

  return (
    <div className="training-details-modal">
      <div className="training-details-content" onClick={e => e.stopPropagation()}>
        <div className="details-header">
          <h2>{training.title}</h2>
          <button className="btn-close" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        
        <div className="details-tabs">
          <button className="tab-active">Overview</button>
          <button className="tab-inactive">Timeline</button>
          <button className="tab-inactive">Activities</button>
          <button className="tab-inactive">Attendance</button>
        </div>
        
        <div className="details-body">
          {/* Overview Tab Content */}
          <div className="tab-content active">
            <div className="overview-section">
              <div className="overview-grid">
                <div className="overview-item">
                  <h3>Type</h3>
                  <p>{training.type.charAt(0).toUpperCase() + training.type.slice(1)}</p>
                </div>
                <div className="overview-item">
                  <h3>Status</h3>
                  <p>{training.status.charAt(0).toUpperCase() + training.status.slice(1)}</p>
                </div>
                <div className="overview-item">
                  <h3>Location</h3>
                  <p>{training.location || 'Not specified'}</p>
                </div>
                <div className="overview-item">
                  <h3>Facilitator</h3>
                  <p>{training.instructor || 'Not assigned'}</p>
                </div>
                <div className="overview-item">
                  <h3>Start Date</h3>
                  <p>{new Date(training.startDate).toLocaleDateString()}</p>
                </div>
                <div className="overview-item">
                  <h3>End Date</h3>
                  <p>{new Date(training.endDate).toLocaleDateString()}</p>
                </div>
                <div className="overview-item">
                  <h3>Max Participants</h3>
                  <p>{training.maxParticipants || 'Unlimited'}</p>
                </div>
                <div className="overview-item">
                  <h3>Current Participants</h3>
                  <p>{training.participants?.length || 0}</p>
                </div>
              </div>
            </div>
            
            <div className="description-section">
              <h3>Description</h3>
              <p>{training.description || 'No description provided'}</p>
            </div>
            
            <div className="requirements-section">
              <h3>Requirements</h3>
              <p>{training.requirements || 'No requirements specified'}</p>
            </div>
          </div>
          
          {/* Timeline Tab Content */}
          <div className="tab-content">
            {/* Timeline implementation would go here */}
            <p>Timeline view placeholder</p>
          </div>
          
{/* Activities Tab Content */}
           <div className="tab-content">
             <ActivityCards activities={training.activities || []} />
           </div>
          
          {/* Attendance Tab Content */}
          <div className="tab-content">
            <AttendanceTable 
              trainingId={training.id} 
              participants={training.participants || []} 
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrainingDetails;