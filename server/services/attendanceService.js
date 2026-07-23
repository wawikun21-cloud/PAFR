const attendanceModel = require('../models/attendanceModel');
const trainingModel = require('../models/trainingModel');
const externalTrainingModel = require('../models/externalTrainingModel');

const VALID_SCAN_METHODS = ['qr_scanner', 'camera', 'manual'];
const VALID_STATUSES = ['present', 'absent', 'late', 'excused', 'pending'];
const ACTIVE_INTERNAL_STATUSES = ['published', 'ongoing'];
const ACTIVE_EXTERNAL_STATUSES = ['open', 'closed', 'completed'];

function createError(message, statusCode) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

async function scanQRCodeInternal(trainingId, qrCode, scanMethod, facilitatorId, deviceInfo) {
  const training = await trainingModel.findInternalById(trainingId);
  if (!training) {
    await attendanceModel.logScanAudit({
      trainingId, eventType: 'internal', qrCodeScanned: qrCode,
      scanResult: 'event_inactive', scanMethod, deviceInfo, facilitatorId,
      errorMessage: 'Training not found'
    });
    throw createError('Training not found', 404);
  }

  if (!ACTIVE_INTERNAL_STATUSES.includes(training.status)) {
    await attendanceModel.logScanAudit({
      trainingId, eventType: 'internal', qrCodeScanned: qrCode,
      scanResult: 'event_inactive', scanMethod, deviceInfo, facilitatorId,
      errorMessage: `Training status is '${training.status}', scanning not allowed`
    });
    throw createError(`Cannot scan: training status is '${training.status}'`, 400);
  }

  const reservist = await attendanceModel.findReservistByQRCode(qrCode);
  if (!reservist) {
    await attendanceModel.logScanAudit({
      trainingId, eventType: 'internal', qrCodeScanned: qrCode,
      scanResult: 'invalid_qr_code', scanMethod, deviceInfo, facilitatorId,
      errorMessage: 'No reservist found with this QR code'
    });
    throw createError('No reservist found with this QR code', 404);
  }

  const isParticipant = await attendanceModel.isParticipantInInternalTraining(trainingId, reservist.id);
  if (!isParticipant) {
    await attendanceModel.logScanAudit({
      trainingId, eventType: 'internal', qrCodeScanned: qrCode, reservistId: reservist.id,
      scanResult: 'not_registered', scanMethod, deviceInfo, facilitatorId,
      errorMessage: `${reservist.rank} ${reservist.first_name} ${reservist.last_name} is not a participant in this training`
    });
    throw createError(
      `${reservist.rank} ${reservist.first_name} ${reservist.last_name} is not registered as a participant for this training`,
      403
    );
  }

  const result = await attendanceModel.upsertInternalAttendance(
    trainingId, reservist.id, 'present', scanMethod, facilitatorId
  );

  await attendanceModel.logScanAudit({
    trainingId, eventType: 'internal', qrCodeScanned: qrCode, reservistId: reservist.id,
    scanResult: 'success', scanMethod, deviceInfo, facilitatorId
  });

  return {
    success: true,
    message: `${reservist.rank} ${reservist.first_name} ${reservist.last_name} marked as PRESENT`,
    data: {
      reservist: {
        id: reservist.id,
        name: `${reservist.rank} ${reservist.first_name} ${reservist.last_name}`,
        service_number: reservist.service_number,
        qr_code: reservist.qr_code
      },
      attendance: result,
      scan_method: scanMethod
    }
  };
}

async function scanQRCodeExternal(externalTrainingId, qrCode, scanMethod, facilitatorId, deviceInfo) {
  const training = await externalTrainingModel.findExternalById(externalTrainingId);
  if (!training) {
    await attendanceModel.logScanAudit({
      externalTrainingId, eventType: 'external', qrCodeScanned: qrCode,
      scanResult: 'event_inactive', scanMethod, deviceInfo, facilitatorId,
      errorMessage: 'External training not found'
    });
    throw createError('External training not found', 404);
  }

  if (!ACTIVE_EXTERNAL_STATUSES.includes(training.status)) {
    await attendanceModel.logScanAudit({
      externalTrainingId, eventType: 'external', qrCodeScanned: qrCode,
      scanResult: 'event_inactive', scanMethod, deviceInfo, facilitatorId,
      errorMessage: `Training status is '${training.status}', scanning not allowed`
    });
    throw createError(`Cannot scan: training status is '${training.status}'`, 400);
  }

  const reservist = await attendanceModel.findReservistByQRCode(qrCode);
  if (!reservist) {
    await attendanceModel.logScanAudit({
      externalTrainingId, eventType: 'external', qrCodeScanned: qrCode,
      scanResult: 'invalid_qr_code', scanMethod, deviceInfo, facilitatorId,
      errorMessage: 'No reservist found with this QR code'
    });
    throw createError('No reservist found with this QR code', 404);
  }

  const registration = await attendanceModel.isRegisteredForExternalTraining(externalTrainingId, reservist.id);
  if (!registration) {
    await attendanceModel.logScanAudit({
      externalTrainingId, eventType: 'external', qrCodeScanned: qrCode, reservistId: reservist.id,
      scanResult: 'not_registered', scanMethod, deviceInfo, facilitatorId,
      errorMessage: `${reservist.rank} ${reservist.first_name} ${reservist.last_name} is not registered for this external training`
    });
    throw createError(
      `${reservist.rank} ${reservist.first_name} ${reservist.last_name} is not registered for this external training`,
      403
    );
  }

  const result = await attendanceModel.upsertExternalAttendance(
    externalTrainingId, registration.id, reservist.id, null, 'present', scanMethod, facilitatorId
  );

  await attendanceModel.logScanAudit({
    externalTrainingId, eventType: 'external', qrCodeScanned: qrCode, reservistId: reservist.id,
    scanResult: 'success', scanMethod, deviceInfo, facilitatorId
  });

  return {
    success: true,
    message: `${reservist.rank} ${reservist.first_name} ${reservist.last_name} marked as PRESENT`,
    data: {
      reservist: {
        id: reservist.id,
        name: `${reservist.rank} ${reservist.first_name} ${reservist.last_name}`,
        service_number: reservist.service_number,
        qr_code: reservist.qr_code
      },
      attendance: result,
      scan_method: scanMethod
    }
  };
}

async function manualCheckInInternal(trainingId, reservistId, status, facilitatorId) {
  const training = await trainingModel.findInternalById(trainingId);
  if (!training) throw createError('Training not found', 404);

  const isParticipant = await attendanceModel.isParticipantInInternalTraining(trainingId, reservistId);
  if (!isParticipant) throw createError('Reservist is not a participant in this training', 403);

  const result = await attendanceModel.upsertInternalAttendance(
    trainingId, reservistId, status, 'manual', facilitatorId
  );

  return {
    success: true,
    message: 'Attendance updated',
    data: { attendance: result }
  };
}

async function manualCheckInExternal(externalTrainingId, id, status, facilitatorId) {
  const training = await externalTrainingModel.findExternalById(externalTrainingId);
  if (!training) throw createError('External training not found', 404);

  // id can be either reservist_id or registration_id
  let registration = null;

  // First try to find registration by the provided ID (could be reservist_id)
  if (id) {
    registration = await attendanceModel.isRegisteredForExternalTraining(externalTrainingId, id);
  }

  // If not found, try looking up by registration ID directly
  if (!registration && id) {
    const reg = await attendanceModel.getRegistrationById(id);
    if (reg && reg.training_id == externalTrainingId) {
      registration = reg;
    }
  }

  if (!registration) throw createError('Reservist is not registered for this external training', 403);

  const result = await attendanceModel.upsertExternalAttendance(
    externalTrainingId, registration.id, registration.reservist_id, null, status, 'manual', facilitatorId
  );

  return {
    success: true,
    message: 'Attendance updated',
    data: { attendance: result }
  };
}

async function getInternalAttendanceList(trainingId) {
  const training = await trainingModel.findInternalById(trainingId);
  if (!training) throw createError('Training not found', 404);

  const [participants, attendanceRecords, stats] = await Promise.all([
    attendanceModel.getInternalTrainingParticipantIds(trainingId),
    attendanceModel.getAttendanceByInternalTraining(trainingId),
    attendanceModel.getInternalTrainingStats(trainingId)
  ]);

  const attendanceMap = new Map();
  for (const rec of attendanceRecords) {
    attendanceMap.set(rec.reservist_id, rec);
  }

  const merged = participants.map(p => {
    const att = attendanceMap.get(p.reservist_id);
    return {
      reservist_id: p.reservist_id,
      first_name: p.first_name,
      last_name: p.last_name,
      rank: p.rank,
      service_number: p.service_number,
      qr_code: p.qr_code,
      squadron_name: p.squadron_name,
      squadron_id: p.squadron_id,
      status: att?.status || 'pending',
      check_in_time: att?.check_in_time || null,
      scan_method: att?.scan_method || null,
      scan_timestamp: att?.scan_timestamp || null,
      attendance_id: att?.id || null
    };
  });

  return {
    training: {
      id: training.id,
      title: training.title,
      status: training.status,
      start_datetime: training.start_datetime,
      end_datetime: training.end_datetime,
      venue: training.venue
    },
    participants: merged,
    stats
  };
}

async function getExternalAttendanceList(externalTrainingId) {
  const training = await externalTrainingModel.findExternalById(externalTrainingId);
  if (!training) throw createError('External training not found', 404);

  // Fetch both registrations and existing attendance records
  const [registrations, attendanceRecords, stats] = await Promise.all([
    attendanceModel.getExternalTrainingRegistrations(externalTrainingId),
    attendanceModel.getAttendanceByExternalTraining(externalTrainingId),
    attendanceModel.getExternalTrainingStats(externalTrainingId)
  ]);

  // Build attendance map keyed by registration_id first, then reservist_id
  const attendanceMap = new Map();
  for (const rec of attendanceRecords) {
    if (rec.registration_id) {
      attendanceMap.set(`reg_${rec.registration_id}`, rec);
    }
    if (rec.reservist_id) {
      attendanceMap.set(`res_${rec.reservist_id}`, rec);
    }
  }

  // Merge registrations with attendance data
  const merged = registrations.map(r => {
    const att = attendanceMap.get(`reg_${r.registration_id}`) || attendanceMap.get(`res_${r.reservist_id}`);
    return {
      registration_id: r.registration_id,
      reservist_id: r.reservist_id || null,
      first_name: r.first_name || r.participant_data?.first_name,
      last_name: r.last_name || r.participant_data?.last_name,
      rank: r.rank || r.participant_data?.rank,
      service_number: r.service_number || r.participant_data?.service_number,
      qr_code: r.qr_code || r.participant_data?.qr_code,
      status: att?.status || 'pending',
      check_in_time: att?.check_in_time || null,
      scan_method: att?.scan_method || null,
      attendance_id: att?.id || null
    };
  });

  return {
    training: {
      id: training.id,
      title: training.title,
      status: training.status,
      start_date: training.start_date,
      venue: training.venue,
      capacity: training.capacity
    },
    participants: merged,  // Use 'participants' for consistency with internal
    stats
  };
}

async function updateAttendanceStatus(id, eventType, status, facilitatorId) {
  if (!VALID_STATUSES.includes(status)) {
    throw createError(`Invalid status: ${status}`, 400);
  }

  const affected = await attendanceModel.updateAttendanceStatus(id, eventType, status, facilitatorId);
  if (!affected) throw createError('Attendance record not found', 404);

  return { success: true, message: `Status updated to '${status}'` };
}

async function getScanHistory(trainingId, externalTrainingId, limit) {
  return attendanceModel.getScanAuditLog(trainingId, externalTrainingId, limit);
}

async function assignFacilitator(trainingId, externalTrainingId, userId, assignedBy) {
  await attendanceModel.addFacilitator(trainingId, externalTrainingId, userId, assignedBy);
  return { success: true, message: 'Facilitator assigned' };
}

async function getFacilitators(trainingId, externalTrainingId) {
  return attendanceModel.getFacilitators(trainingId, externalTrainingId);
}

async function removeFacilitator(trainingId, externalTrainingId, userId) {
  const affected = await attendanceModel.removeFacilitator(trainingId, externalTrainingId, userId);
  if (!affected) throw createError('Facilitator assignment not found', 404);
  return { success: true, message: 'Facilitator removed' };
}

async function getExternalRegistrationCount(externalTrainingId) {
  return attendanceModel.getExternalRegistrationCount(externalTrainingId);
}

async function getMyEvents(userId, role) {
  return attendanceModel.getMyEvents(userId, role);
}

async function getEventStatus(eventType, id) {
  const result = await attendanceModel.getEventStatus(eventType, id);
  if (!result) {
    throw createError(eventType === 'internal' ? 'Training not found' : 'External training not found', 404);
  }
  return result;
}

module.exports = {
  scanQRCodeInternal,
  scanQRCodeExternal,
  manualCheckInInternal,
  manualCheckInExternal,
  getInternalAttendanceList,
  getExternalAttendanceList,
  updateAttendanceStatus,
  getScanHistory,
  assignFacilitator,
  getFacilitators,
  removeFacilitator,
  getExternalRegistrationCount,
  getMyEvents,
  getEventStatus,
  VALID_SCAN_METHODS,
  VALID_STATUSES
};