const trainingModel = require('../models/trainingModel');
const activityModel = require('../models/activityModel');
const externalModel = require('../models/externalTrainingModel');
const trainingAttachmentService = require('./trainingAttachmentService');
const externalTrainingAttachmentService = require('./externalTrainingAttachmentService');
const internalParticipantModel = require('../models/internalTrainingParticipantModel');
const db = require('../config/database');
const pool = db; // alias for direct queries in alert fallback
const { buildActivityDescription, parseActivityMeta } = require('../utils/activityMeta');
const { sendTrainingAlertSafe } = require('./Alertservice');

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

function clampPagination(page, limit) {
  const p = Math.max(1, parseInt(page, 10) || DEFAULT_PAGE);
  const l = Math.min(MAX_LIMIT, Math.max(1, parseInt(limit, 10) || DEFAULT_LIMIT));
  return { page: p, limit: l };
}

function normalizeParticipantBlocks(input) {
  if (!Array.isArray(input)) {
    const err = new Error('participants must be an array');
    err.statusCode = 400;
    throw err;
  }
  const out = [];
  for (const p of input) {
    const sid = Number(p?.squadron_id);
    if (!sid) continue;
    const ids = Array.isArray(p?.reservist_ids)
      ? p.reservist_ids.map((x) => Number(x)).filter((n) => Number.isInteger(n) && n > 0)
      : [];
    if (!ids.length) continue;
    out.push({ squadron_id: sid, reservist_ids: ids });
  }
  return out;
}

async function replaceInternalParticipants(conn, trainingId, participantsInput, trainingTitle) {
  if (participantsInput === undefined) return;
  try {
    await internalParticipantModel.deleteByTrainingId(conn, trainingId);
  } catch (e) {
    if (e.code === 'ER_NO_SUCH_TABLE' || e.errno === 1146) return;
    throw e;
  }
  const blocks = normalizeParticipantBlocks(participantsInput);
  if (!blocks || !blocks.length) return;

  const rowTuples = [];
  const seenReservist = new Set();

  for (const b of blocks) {
    const { squadron_id: sid, reservist_ids: ids } = b;
    for (const rid of ids) {
      if (seenReservist.has(rid)) continue;
      const ok = await internalParticipantModel.hasAssignment(conn, rid, sid);
      if (!ok) {
        const err = new Error('One or more reservists are not assigned to the selected squadron');
        err.statusCode = 400;
        throw err;
      }
      seenReservist.add(rid);
      rowTuples.push({ reservist_id: rid, squadron_id: sid });
    }
  }

  await internalParticipantModel.insertMany(conn, trainingId, rowTuples);

  // Send assignment alert to each newly assigned reservist (non-fatal if it fails)
  if (trainingTitle) {
    for (const row of rowTuples) {
      await sendTrainingAlertSafe(conn, {
        alertType: 'training_assigned_internal',
        reservistId: row.reservist_id,
        trainingId,
        trainingType: 'internal',
        trainingTitle,
      });
    }
  }
}

async function loadParticipantGroups(trainingId) {
  try {
    const flat = await internalParticipantModel.listFlatWithLabels(trainingId);
    return internalParticipantModel.groupBySquadron(flat);
  } catch (e) {
    if (e.code === 'ER_NO_SUCH_TABLE' || e.errno === 1146) return [];
    throw e;
  }
}

function resolveInternalRange(body, existing) {
  let start = existing.start_datetime;
  let end = existing.end_datetime;

  const rawStart = body.start_datetime ?? body.start_date;
  if (rawStart != null && String(rawStart).trim() !== '') {
    start = trainingModel.toDatetime(rawStart, false);
  }

  const rawEnd = body.end_datetime ?? body.end_date;
  if (rawEnd != null && String(rawEnd).trim() !== '') {
    end = trainingModel.toDatetime(rawEnd, true);
  } else if (rawStart != null && String(rawStart).trim() !== '') {
    end = start;
  }

  return { start, end };
}

function normalizeVenue(venue) {
  const v = venue != null && String(venue).trim() !== '' ? String(venue).trim() : 'TBD';
  return v.slice(0, 500);
}

async function listInternalTrainings(query) {
  const { page, limit } = clampPagination(query.page, query.limit);
  const search = query.search ? String(query.search).trim() : '';
  const status = query.status && query.status !== 'all' && trainingModel.isValidInternalStatus(query.status)
    ? query.status
    : null;
  const type = query.type && query.type !== 'all' ? query.type : null;
  const squadronId = query.squadronId ? Number(query.squadronId) : null;

  const [total, rows] = await Promise.all([
    trainingModel.countInternal({ search: search || null, status, type, squadronId }),
    trainingModel.findInternalMany({ page, limit, search: search || null, status, type, squadronId }),
  ]);

  return {
    trainings: rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 0,
    },
  };
}

async function getInternalTrainingById(id) {
  const training = await trainingModel.findInternalById(id);
  if (!training) return null;
  const [activities, attachments, participant_groups] = await Promise.all([
    activityModel.listByTrainingId(id, training.status),
    trainingAttachmentService.listPublicForTraining(id),
    loadParticipantGroups(id),
  ]);
  const participants = [];
  for (const group of participant_groups) {
    for (const r of group.reservists) {
      participants.push({
        id: r.id,
        name: `${r.first_name || ''} ${r.last_name || ''}`.trim(),
        first_name: r.first_name,
        last_name: r.last_name,
        rank: r.rank,
        service_number: r.service_number,
        squadron_id: group.squadron_id,
        squadron_name: group.squadron_name,
      });
    }
  }
  return { ...training, activities, attachments, participant_groups, participants };
}

async function createInternalTraining(body, createdByUserId) {
  const start = trainingModel.toDatetime(body.start_datetime || body.start_date, false);
  if (!start) {
    const err = new Error('start_datetime is required');
    err.statusCode = 400;
    throw err;
  }

  const tempExisting = { start_datetime: start, end_datetime: start };
  const { start: startF, end: endF } = resolveInternalRange(body, tempExisting);

  const status = body.status && trainingModel.isValidInternalStatus(body.status) ? body.status : 'draft';
  const venue = normalizeVenue(body.venue ?? body.location);
  const title = String(body.title || '').trim();
  if (!title) {
    const err = new Error('Title is required');
    err.statusCode = 400;
    throw err;
  }

  const conn = await trainingModel.getConnection();
  try {
    await conn.beginTransaction();
    const trainingId = await trainingModel.insertInternal(conn, {
      title,
      description: body.description ?? null,
      start_datetime: startF,
      end_datetime: endF,
      venue,
      area_id: body.area_id ?? null,
      status,
      capacity: null,
      created_by: createdByUserId,
    });

    const metaDesc = buildActivityDescription({
      activityType: body.activity_type || null,
      requirements: body.requirements || null,
    });

    await activityModel.insertActivity(conn, {
      training_id: trainingId,
      title: title.slice(0, 500),
      description: metaDesc,
      start_time: startF,
      end_time: endF,
      location: venue.slice(0, 500),
      instructor: body.instructor ? String(body.instructor).slice(0, 200) : null,
    });

    if (body.participants !== undefined) {
      await replaceInternalParticipants(conn, trainingId, body.participants, title);
    }

    await conn.commit();
    return getInternalTrainingById(trainingId);
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

async function updateInternalTraining(id, body) {
  const existing = await trainingModel.findInternalById(id);
  if (!existing) {
    const err = new Error('Training not found');
    err.statusCode = 404;
    throw err;
  }

  const { start, end } = resolveInternalRange(body, existing);

  const trainingPatch = {};
  if (body.title != null) trainingPatch.title = String(body.title).trim();
  if (body.description !== undefined) trainingPatch.description = body.description;
  if (body.area_id !== undefined) trainingPatch.area_id = body.area_id;
  if (body.status != null) {
    if (!trainingModel.isValidInternalStatus(body.status)) {
      const err = new Error('Invalid status');
      err.statusCode = 400;
      throw err;
    }
    trainingPatch.status = body.status;
  }
  if (
    body.start_datetime != null ||
    body.start_date != null ||
    body.end_datetime != null ||
    body.end_date != null
  ) {
    if (start != null) trainingPatch.start_datetime = start;
    if (end != null) trainingPatch.end_datetime = end;
  }
  if (body.venue !== undefined || body.location !== undefined) {
    trainingPatch.venue = normalizeVenue(body.venue ?? body.location ?? existing.venue);
  }

  const conn = await trainingModel.getConnection();
  try {
    await conn.beginTransaction();

    if (Object.keys(trainingPatch).length) {
      await trainingModel.updateInternal(id, trainingPatch, conn);
    }

    const primaryId = await activityModel.getPrimaryActivityId(id);
    const venue = trainingPatch.venue ?? existing.venue ?? existing.location;
    const prevMeta = await loadPrimaryMeta(id);

    const metaDesc = buildActivityDescription({
      activityType: body.activity_type !== undefined ? body.activity_type : prevMeta.activityType,
      requirements: body.requirements !== undefined ? body.requirements : prevMeta.requirements,
    });

    if (primaryId) {
      const actPatch = {
        start_time: start,
        end_time: end,
        location: venue ? String(venue).slice(0, 500) : null,
      };
      if (body.instructor !== undefined) {
        actPatch.instructor = body.instructor ? String(body.instructor).slice(0, 200) : null;
      }
      if (body.title != null) actPatch.title = String(body.title).trim().slice(0, 500);
      if (
        body.activity_type !== undefined ||
        body.requirements !== undefined ||
        body.start_datetime != null ||
        body.start_date != null ||
        body.end_datetime != null ||
        body.end_date != null ||
        body.venue !== undefined ||
        body.location !== undefined
      ) {
        actPatch.description = metaDesc;
      }
      await activityModel.updateActivity(primaryId, id, actPatch, conn);
    } else {
      await activityModel.insertActivity(conn, {
        training_id: id,
        title: (trainingPatch.title || existing.title).toString().slice(0, 500),
        description: metaDesc,
        start_time: start,
        end_time: end,
        location: venue ? String(venue).slice(0, 500) : null,
        instructor: body.instructor != null ? String(body.instructor).slice(0, 200) : null,
      });
    }

    if (body.participants !== undefined) {
      const titleForAlert = trainingPatch.title ?? existing.title ?? '';
      await replaceInternalParticipants(conn, id, body.participants, titleForAlert);
    }

    await conn.commit();
    return getInternalTrainingById(id);
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

async function loadPrimaryMeta(trainingId) {
  const pid = await activityModel.getPrimaryActivityId(trainingId);
  if (!pid) return { activityType: null, requirements: null };
  const row = await activityModel.findById(pid, trainingId);
  if (!row) return { activityType: null, requirements: null };
  const meta = parseActivityMeta(row.description);
  return { activityType: meta.activityType || null, requirements: meta.requirements || null };
}

async function deleteInternalTraining(trainingId) {
  await trainingAttachmentService.removeAllFilesForTraining(trainingId);
  try {
    await internalParticipantModel.deleteByTrainingId(null, trainingId);
  } catch (e) {
    if (e.code === 'ER_NO_SUCH_TABLE' || e.errno === 1146) { /* ignore */ }
    else throw e;
  }
  const n = await trainingModel.deleteInternal(trainingId);
  return n > 0;
}

async function listActivities(trainingId) {
  const training = await trainingModel.findInternalById(trainingId);
  if (!training) {
    const err = new Error('Training not found');
    err.statusCode = 404;
    throw err;
  }
  return activityModel.listByTrainingId(trainingId, training.status);
}

async function createActivity(trainingId, body) {
  const training = await trainingModel.findInternalById(trainingId);
  if (!training) {
    const err = new Error('Training not found');
    err.statusCode = 404;
    throw err;
  }
  const title = String(body.title || '').trim();
  if (!title) {
    const err = new Error('Activity title is required');
    err.statusCode = 400;
    throw err;
  }
  const start = trainingModel.toDatetime(body.start_time || body.start_datetime, false);
  const end = trainingModel.toDatetime(body.end_time || body.end_datetime, true);
  if (!start || !end) {
    const err = new Error('start_time and end_time are required');
    err.statusCode = 400;
    throw err;
  }
  const metaDesc = buildActivityDescription({
    activityType: body.activity_type || body.type || null,
    requirements: body.requirements || null,
  });
  await activityModel.insertActivity(null, {
    training_id: trainingId,
    title: title.slice(0, 500),
    description: metaDesc,
    start_time: start,
    end_time: end,
    location: body.location ? String(body.location).slice(0, 500) : null,
    instructor: body.instructor ? String(body.instructor).slice(0, 200) : null,
  });
  return listActivities(trainingId);
}

async function updateActivity(trainingId, activityId, body) {
  const row = await activityModel.findById(activityId, trainingId);
  if (!row) {
    const err = new Error('Activity not found');
    err.statusCode = 404;
    throw err;
  }
  const patch = {};
  if (body.title != null) patch.title = String(body.title).trim().slice(0, 500);
  if (body.start_time != null || body.start_datetime != null) {
    patch.start_time = trainingModel.toDatetime(body.start_time || body.start_datetime, false);
  }
  if (body.end_time != null || body.end_datetime != null) {
    patch.end_time = trainingModel.toDatetime(body.end_time || body.end_datetime, true);
  }
  if (body.location !== undefined) patch.location = body.location ? String(body.location).slice(0, 500) : null;
  if (body.instructor !== undefined) patch.instructor = body.instructor ? String(body.instructor).slice(0, 200) : null;

  if (body.activity_type !== undefined || body.type !== undefined || body.requirements !== undefined) {
    const meta = parseActivityMeta(row.description);
    if (body.activity_type !== undefined || body.type !== undefined) {
      meta.activityType = body.activity_type ?? body.type ?? meta.activityType;
    }
    if (body.requirements !== undefined) meta.requirements = body.requirements;
    patch.description = buildActivityDescription({
      activityType: meta.activityType,
      requirements: meta.requirements,
    });
  }

  const n = await activityModel.updateActivity(activityId, trainingId, patch);
  if (!n) {
    const err = new Error('Nothing to update');
    err.statusCode = 400;
    throw err;
  }
  const training = await trainingModel.findInternalById(trainingId);
  return activityModel.mapActivityRow(await activityModel.findById(activityId, trainingId), training?.status);
}

async function deleteActivity(trainingId, activityId) {
  const n = await activityModel.deleteActivity(activityId, trainingId);
  if (!n) {
    const err = new Error('Activity not found');
    err.statusCode = 404;
    throw err;
  }
  return true;
}

async function listExternalTrainings(query) {
  const { page, limit } = clampPagination(query.page, query.limit);
  const search = query.search ? String(query.search).trim() : '';
  const status = query.status && query.status !== 'all' && externalModel.isValidExternalStatus(query.status)
    ? query.status
    : null;
  const squadronId = query.squadronId ? Number(query.squadronId) : null;

  const [total, rows] = await Promise.all([
    externalModel.countExternal({ search: search || null, status, squadronId }),
    externalModel.findExternalMany({ page, limit, search: search || null, status, squadronId }),
  ]);

  return {
    trainings: rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 0,
    },
  };
}

async function getExternalTrainingById(id) {
  const training = await externalModel.findExternalById(id);
  if (!training) return null;
  const attachments = await externalTrainingAttachmentService.listPublicForExternalTraining(id);
  return { ...training, attachments };
}

async function createExternalTraining(body) {
  const title = String(body.title || '').trim();
  if (!title) {
    const err = new Error('Title is required');
    err.statusCode = 400;
    throw err;
  }
  if (!body.start_date) {
    const err = new Error('start_date is required');
    err.statusCode = 400;
    throw err;
  }
  const status = body.status && externalModel.isValidExternalStatus(body.status) ? body.status : 'draft';
  const newId = await externalModel.insertExternal({
    title,
    description: body.description ?? null,
    start_date: body.start_date,
    start_time: body.start_time ?? null,
    venue: body.venue ?? null,
    status,
    capacity: body.capacity != null ? Number(body.capacity) : null,
    instructor: body.instructor ? String(body.instructor).slice(0, 200) : null,
    squadron_limits: body.squadron_limits ?? null,
    registration_fields: body.registration_fields ?? null,
  });
  return getExternalTrainingById(newId);
}

async function updateExternalTraining(id, body) {
  const existing = await externalModel.findExternalById(id);
  if (!existing) {
    const err = new Error('External training not found');
    err.statusCode = 404;
    throw err;
  }
  const patch = {};
  if (body.title !== undefined) patch.title = String(body.title).trim();
  if (body.description !== undefined) patch.description = body.description;
  if (body.start_date !== undefined) patch.start_date = body.start_date;
  if (body.start_time !== undefined) patch.start_time = body.start_time;
  if (body.venue !== undefined) patch.venue = body.venue;
  if (body.capacity !== undefined) patch.capacity = body.capacity != null ? Number(body.capacity) : null;
  if (body.instructor !== undefined) patch.instructor = body.instructor ? String(body.instructor).slice(0, 200) : null;
  if (body.squadron_limits !== undefined) patch.squadron_limits = body.squadron_limits;
  if (body.registration_fields !== undefined) patch.registration_fields = body.registration_fields;
  if (body.status !== undefined) {
    if (!externalModel.isValidExternalStatus(body.status)) {
      const err = new Error('Invalid status');
      err.statusCode = 400;
      throw err;
    }
    patch.status = body.status;
  }
  await externalModel.updateExternal(id, patch);
  return getExternalTrainingById(id);
}

async function deleteExternalTraining(id) {
  await externalTrainingAttachmentService.removeAllFilesForExternalTraining(id);
  const n = await externalModel.deleteExternal(id);
  return n > 0;
}

async function registerExternalParticipant(trainingId, participantData, registrantUserId = null) {
  const conn = await trainingModel.getConnection();
  try {
    await conn.beginTransaction();

    const [trows] = await conn.query(
      'SELECT id, title, status, capacity, squadron_limits FROM external_trainings WHERE id = ? FOR UPDATE',
      [trainingId]
    );
    const trow = trows && trows[0];
    if (!trow) {
      const err = new Error('Training not found');
      err.statusCode = 404;
      throw err;
    }
    if (trow.status !== 'open') {
      const err = new Error('Registration is not open for this training');
      err.statusCode = 400;
      throw err;
    }

    let sqLimits = null;
    if (trow.squadron_limits != null) {
      try {
        sqLimits = typeof trow.squadron_limits === 'string' ? JSON.parse(trow.squadron_limits) : trow.squadron_limits;
      } catch (_) {
        sqLimits = trow.squadron_limits;
      }
    }

    async function countRegistrationsConn(trainingId, squadronId = null) {
      if (squadronId == null) {
        const [rows] = await conn.query('SELECT COUNT(*) AS c FROM training_registrations WHERE training_id = ?', [trainingId]);
        return rows[0]?.c ?? 0;
      }
      const [rows] = await conn.query(
        'SELECT COUNT(*) AS c FROM training_registrations WHERE training_id = ? AND JSON_UNQUOTE(JSON_EXTRACT(participant_data, "$.squadron_id")) = ?',
        [trainingId, String(squadronId)]
      );
      return rows[0]?.c ?? 0;
    }

    let pdObj = null;
    if (participantData != null && typeof participantData !== 'string') pdObj = participantData;
    else if (participantData != null && typeof participantData === 'string') {
      try { pdObj = JSON.parse(participantData); } catch (_) { pdObj = null; }
    }

    let alertReservistId = null;

    if (pdObj && pdObj.service_number) {
      const [rRows] = await conn.query(
        `SELECT r.id as reservist_id, r.user_id, ra.squadron_id, r.first_name, r.last_name, r.rank
         FROM reservists r
         LEFT JOIN reservist_assignments ra ON ra.reservist_id = r.id AND ra.is_primary = 1
         WHERE r.service_number = ? LIMIT 1`,
        [pdObj.service_number]
      );
      if (!rRows || rRows.length === 0) {
        const err = new Error('Reservist not found with this service number');
        err.statusCode = 404;
        throw err;
      }
      const r = rRows[0];

      // A reservist may only self-register using their OWN service number —
      // never someone else's, even if they happen to know it.
      if (registrantUserId == null || Number(r.user_id) !== Number(registrantUserId)) {
        const err = new Error('This service number does not belong to your account.');
        err.statusCode = 403;
        throw err;
      }

      alertReservistId = r.reservist_id;

      // The reservist may choose to register under a squadron other than
      // their own assigned one (e.g. attending on behalf of / alongside
      // another unit). The client is responsible for confirming this with
      // the user (override dialog) before sending chosen_squadron_id.
      // Falls back to their home squadron if none was sent, preserving the
      // previous behavior for any older clients.
      const chosenSquadronId = pdObj.chosen_squadron_id != null
        ? Number(pdObj.chosen_squadron_id)
        : r.squadron_id;

      pdObj = {
        ...pdObj,
        reservist_id: r.reservist_id,
        squadron_id: chosenSquadronId,
        home_squadron_id: r.squadron_id,
        is_squadron_override: chosenSquadronId !== r.squadron_id,
        first_name: r.first_name,
        last_name: r.last_name,
        rank: r.rank,
      };
    }

    if (Array.isArray(sqLimits) && sqLimits.length > 0) {
      const hasUnlimitedSquadron = sqLimits.some((s) => s && (s.slot_limit == null || s.slotLimit == null));
      const totalLimitedSlots = sqLimits.reduce((sum, s) => {
        const v = s && (s.slot_limit ?? s.slotLimit ?? null);
        return sum + (v == null ? 0 : Number(v));
      }, 0);

      if (pdObj && pdObj.squadron_id != null) {
        const sid = pdObj.squadron_id;
        if (pdObj.reservist_id != null) {
          const [existing] = await conn.query(
            'SELECT id FROM training_registrations WHERE training_id = ? AND JSON_UNQUOTE(JSON_EXTRACT(participant_data, "$.reservist_id")) = ?',
            [trainingId, String(pdObj.reservist_id)]
          );
          if (existing.length > 0) {
            const err = new Error('You are already registered for this training');
            err.statusCode = 400;
            throw err;
          }
        }
        const current = await countRegistrationsConn(trainingId, sid);
        const limitEntry = sqLimits.find((s) => Number(s.squadron_id ?? s.squadronId) === Number(sid));
        const limit = limitEntry ? (limitEntry.slot_limit ?? limitEntry.slotLimit ?? null) : null;
        if (limit != null && current >= Number(limit)) {
          const err = new Error('Selected squadron is full');
          err.statusCode = 400;
          throw err;
        }
        if (limit == null && !hasUnlimitedSquadron && totalLimitedSlots > 0) {
          const totalCurrent = await countRegistrationsConn(trainingId, null);
          if (totalCurrent >= totalLimitedSlots) {
            const err = new Error('No slots available');
            err.statusCode = 400;
            throw err;
          }
        }
      } else {
        if (pdObj && pdObj.reservist_id != null) {
          const [existing] = await conn.query(
            'SELECT id FROM training_registrations WHERE training_id = ? AND JSON_UNQUOTE(JSON_EXTRACT(participant_data, "$.reservist_id")) = ?',
            [trainingId, String(pdObj.reservist_id)]
          );
          if (existing.length > 0) {
            const err = new Error('You are already registered for this training');
            err.statusCode = 400;
            throw err;
          }
        }
        if (!hasUnlimitedSquadron && totalLimitedSlots > 0) {
          const totalCurrent = await countRegistrationsConn(trainingId, null);
          if (totalCurrent >= totalLimitedSlots) {
            const err = new Error('No slots available');
            err.statusCode = 400;
            throw err;
          }
        }
      }
    } else if (trow.capacity != null) {
      if (pdObj && pdObj.reservist_id != null) {
        const [existing] = await conn.query(
          'SELECT id FROM training_registrations WHERE training_id = ? AND JSON_UNQUOTE(JSON_EXTRACT(participant_data, "$.reservist_id")) = ?',
          [trainingId, String(pdObj.reservist_id)]
        );
        if (existing.length > 0) {
          const err = new Error('You are already registered for this training');
          err.statusCode = 400;
          throw err;
        }
      }
      const totalCurrent = await countRegistrationsConn(trainingId, null);
      if (totalCurrent >= Number(trow.capacity)) {
        const err = new Error('Training is full');
        err.statusCode = 400;
        throw err;
      }
    }

    const pd =
      participantData == null
        ? null
        : typeof participantData === 'string'
          ? participantData
          : JSON.stringify(pdObj);
    const [result] = await conn.query(
      'INSERT INTO training_registrations (training_id, participant_data) VALUES (?, ?)',
      [trainingId, pd]
    );
    await conn.commit();

    if (alertReservistId) {
      await sendTrainingAlertSafe(null, {
        alertType: 'training_registered_external',
        reservistId: alertReservistId,
        trainingId,
        trainingType: 'external',
        trainingTitle: trow.title || 'External Training',
      });
    }

    return { id: result.insertId };
  } catch (err) {
    try { await conn.rollback(); } catch (_) {}
    throw err;
  } finally {
    try { conn.release(); } catch (_) {}
  }
}

async function verifyReservistByServiceNumber(trainingId, serviceNumber, requestingUserId) {
  const serviceNo = String(serviceNumber || '').trim();
  if (!serviceNo) {
    const err = new Error('Service number is required');
    err.statusCode = 400;
    throw err;
  }

  const [rows] = await trainingModel.db.query(
    `SELECT r.id AS reservist_id, r.user_id, r.first_name, r.last_name, r.rank, r.service_number,
            ra.squadron_id, s.name AS squadron_name
     FROM reservists r
     LEFT JOIN reservist_assignments ra ON ra.reservist_id = r.id AND ra.is_primary = 1
     LEFT JOIN squadron s ON s.id = ra.squadron_id
     WHERE r.service_number = ? LIMIT 1`,
    [serviceNo]
  );
  const r = rows && rows[0];
  if (!r) {
    const err = new Error('Incorrect service number');
    err.statusCode = 404;
    throw err;
  }

  // A reservist may only self-register using their OWN service number —
  // never someone else's, even if they happen to know it.
  if (requestingUserId == null || Number(r.user_id) !== Number(requestingUserId)) {
    const err = new Error('This service number does not belong to your account.');
    err.statusCode = 403;
    throw err;
  }

  // Let the frontend warn the user up front if they're already registered,
  // before they even pick a squadron / hit submit.
  const [existing] = await trainingModel.db.query(
    'SELECT id FROM training_registrations WHERE training_id = ? AND JSON_UNQUOTE(JSON_EXTRACT(participant_data, "$.reservist_id")) = ?',
    [trainingId, String(r.reservist_id)]
  );

  return {
    reservist_id: r.reservist_id,
    first_name: r.first_name,
    last_name: r.last_name,
    rank: r.rank,
    service_number: r.service_number,
    squadron_id: r.squadron_id,
    squadron_name: r.squadron_name,
    already_registered: existing.length > 0,
  };
}

async function getTrainingSlotAvailability(trainingId) {
  const [trows] = await trainingModel.db.query(
    'SELECT * FROM external_trainings WHERE id = ?',
    [trainingId]
  );
  const trow = trows && trows[0];
  if (!trow) {
    const err = new Error('Training not found');
    err.statusCode = 404;
    throw err;
  }

  let sqLimits = null;
  if (trow.squadron_limits != null) {
    try {
      sqLimits = typeof trow.squadron_limits === 'string' ? JSON.parse(trow.squadron_limits) : trow.squadron_limits;
    } catch (_) {
      sqLimits = trow.squadron_limits;
    }
  }

  if (Array.isArray(sqLimits) && sqLimits.length > 0) {
    const squads = [];
    
    for (const limit of sqLimits) {
      const squadronId = limit.squadron_id ?? limit.squadronId;
      if (squadronId == null) continue;
      
      const [rows] = await trainingModel.db.query(
        'SELECT COUNT(*) AS c FROM training_registrations WHERE training_id = ? AND JSON_UNQUOTE(JSON_EXTRACT(participant_data, "$.squadron_id")) = ?',
        [trainingId, String(squadronId)]
      );
      const registered = rows[0]?.c ?? 0;
      
      const slotLimit = limit.slot_limit ?? limit.slotLimit ?? null;
      
      let remaining = null;
      if (slotLimit !== null) {
        remaining = slotLimit - registered;
        if (remaining < 0) remaining = 0;
      }
      squads.push({
        squadron_id: squadronId,
        name: limit.squadron_name ?? limit.name ?? null,
        slot_limit: slotLimit,
        registered,
        remaining: remaining,
        isUnlimited: slotLimit === null || slotLimit === 0,
        isFull: remaining !== null && remaining <= 0,
      });
    }
    
    return {
      hasSquadronLimits: true, squads,
    };
  } else {
    const totalSlots = trow.capacity != null ? Number(trow.capacity) : null;
    
    const [rows] = await trainingModel.db.query(
      'SELECT COUNT(*) AS c FROM training_registrations WHERE training_id = ?',
      [trainingId]
    );
    const totalRegistered = rows[0]?.c ?? 0;

    let remaining = null;
    if (totalSlots !== null) {
      remaining = totalSlots - totalRegistered;
      if (remaining < 0) remaining = 0;
    }
    
return {
      hasSquadronLimits: false,
      totalSlots,
      totalRegistered,
      remaining
    };
  }
}

async function getInternalTrainingParticipants(trainingId) {
  const participants = await internalParticipantModel.getParticipantsForTraining(trainingId);
  return participants;
}

async function getExternalTrainingParticipants(trainingId) {
  const registrations = await externalModel.getParticipantsForTraining(trainingId);
  const participants = [];
  for (const reg of registrations) {
    const pd = reg.participant_data || {};
    participants.push({
      reservist_id: pd.reservist_id,
      first_name: pd.first_name || '',
      last_name: pd.last_name || '',
      rank: pd.rank || '',
      service_number: pd.service_number || '',
      squadron_id: pd.squadron_id || null,
      squadron_name: pd.squadron_name || '',
    });
  }
  return participants;
}

async function listExternalRegistrations(trainingId) {
  const t = await externalModel.findExternalById(trainingId);
  if (!t) {
    const err = new Error('Training not found');
    err.statusCode = 404;
    throw err;
  }
  const [rows] = await trainingModel.db.query(
    'SELECT id, training_id, participant_data, registered_at FROM training_registrations WHERE training_id = ? ORDER BY registered_at DESC',
    [trainingId]
  );
  return rows.map((r) => ({
    ...r,
    participant_data:
      typeof r.participant_data === 'string' ? safeJson(r.participant_data) : r.participant_data,
  }));
}

function safeJson(s) {
  try {
    return JSON.parse(s);
  } catch {
    return s;
  }
}

module.exports = {
  listInternalTrainings,
  getInternalTrainingById,
  createInternalTraining,
  updateInternalTraining,
  deleteInternalTraining,
  listActivities,
  createActivity,
  updateActivity,
  deleteActivity,
  listExternalTrainings,
  getExternalTrainingById,
  createExternalTraining,
  updateExternalTraining,
  deleteExternalTraining,
  registerExternalParticipant,
  verifyReservistByServiceNumber,
  listExternalRegistrations,
  getTrainingSlotAvailability,
  getInternalTrainingParticipants,
  getExternalTrainingParticipants,

  // Real training statistics for dashboard (used by TrainingActivityChart)
  async getTrainingStats(filters = {}) {
    const year = filters.year ? parseInt(filters.year, 10) : new Date().getFullYear();

    const sql = `
      SELECT 
        a.id AS arsen_id,
        a.name AS arsen_name,
        g.id AS group_id,
        g.name AS group_name,
        s.id AS squadron_id,
        s.name AS squadron_name,
        COUNT(DISTINCT t.id) AS trainings
      FROM trainings t
      JOIN internal_training_participants itp ON itp.training_id = t.id
      JOIN squadron s ON itp.squadron_id = s.id
      JOIN \`groups\` g ON s.group_id = g.id
      JOIN arsens a ON g.arsen_id = a.id
      WHERE YEAR(t.start_datetime) = ?
        AND t.status IN ('completed', 'ongoing', 'published')
      GROUP BY a.id, g.id, s.id
      ORDER BY trainings DESC
    `;

    const [rows] = await db.query(sql, [year]);
    return rows;
  },
};