import mongoose from 'mongoose';
import Student from '../Models/StudentModel.js';
import Application from '../Models/ApplicationModel.js';
import Enrollment from '../Models/Enrollment.js';
import Batch from '../Models/Batch.js';
import AcademicNumberAudit from '../Models/AcademicNumberAudit.js';
import { generateRegistrationNumbers, generateRollNumbers } from '../utils/sequentialNumber.js';

const toPlain = (doc) => (doc ? (doc.toObject ? doc.toObject() : { ...doc }) : {});

const getStudentDisplayName = (student = {}) => {
  const firstName = student.personalInfo?.firstName || '';
  const lastName = student.personalInfo?.lastName || '';
  const name = `${firstName} ${lastName}`.trim();
  return name || student.email || 'Unknown Student';
};

const getStudentAcademicInfo = (student = {}, application = {}) => {
  const academic = toPlain(student.academicInfo || {});
  const existingRegistration = academic.registrationNumber || application.registrationNo || null;
  const existingRoll = academic.rollNumber || application.rollNo || null;

  return {
    registrationNumber: existingRegistration,
    rollNumber: existingRoll,
    registrationAssignedAt: academic.registrationAssignedAt || null,
    rollNumberAssignedAt: academic.rollNumberAssignedAt || null,
    registrationAssignedBy: academic.registrationAssignedBy || null,
    rollNumberAssignedBy: academic.rollNumberAssignedBy || null,
  };
};

const buildAcademicStudentRow = (application) => {
  const student = toPlain(application.student || {});
  const academic = getStudentAcademicInfo(student, application);
  const batch = toPlain(application.batchId || {});
  const sessionName = batch?.startSessionId?.year
    ? `${batch.startSessionId.term || ''} ${batch.startSessionId.year || ''}`.trim()
    : '';

  return {
    _id: student._id || application.student?._id || null,
    studentId: student._id || application.student?._id || null,
    name: getStudentDisplayName(student),
    email: student.email || '',
    cnic: student.personalInfo?.cnic || '',
    fatherName: student.personalInfo?.fatherName || student.familyInfo?.fatherName || '',
    departmentId: application.departmentId?._id ? String(application.departmentId._id) : (application.departmentId ? String(application.departmentId) : ''),
    department: application.departmentId?.name || '',
    degreeClassId: application.degreeClassId?._id ? String(application.degreeClassId._id) : (application.degreeClassId ? String(application.degreeClassId) : ''),
    degreeClass: application.degreeClassId?.name || '',
    sessionId: batch?.startSessionId?._id ? String(batch.startSessionId._id) : '',
    session: sessionName || '',
    batchId: batch?._id ? String(batch._id) : (application.batchId ? String(application.batchId) : ''),
    batch: batch.name || '',
    semester: batch.currentSemester || '',
    approvalStatus: application.status || 'pending',
    registrationNumber: academic.registrationNumber || '',
    rollNumber: academic.rollNumber || '',
    registrationAssigned: Boolean(academic.registrationNumber),
    rollAssigned: Boolean(academic.rollNumber),
    studentCount: application.studentCount || 0,
  };
};

const matchesAcademicFilters = (row, filters) => {
  const department = String(filters.department || '').trim();
  const degreeClass = String(filters.degreeClass || '').trim();
  const session = String(filters.session || '').trim();
  const batch = String(filters.batch || '').trim();
  const semester = String(filters.semester || '').trim();
  const approvalStatus = String(filters.approvalStatus || '').trim();
  const registrationStatus = String(filters.registrationStatus || '').trim();
  const rollStatus = String(filters.rollStatus || '').trim();

  if (department && row.departmentId !== String(department)) return false;
  if (degreeClass && row.degreeClassId !== String(degreeClass)) return false;
  if (session && row.sessionId !== String(session)) return false;
  if (batch && row.batchId !== String(batch)) return false;
  if (semester && String(row.semester) !== String(semester)) return false;
  if (approvalStatus && approvalStatus !== 'all' && row.approvalStatus !== approvalStatus) return false;
  if (registrationStatus && registrationStatus !== 'all') {
    if (registrationStatus === 'assigned' && !row.registrationAssigned) return false;
    if (registrationStatus === 'unassigned' && row.registrationAssigned) return false;
  }
  if (rollStatus && rollStatus !== 'all') {
    if (rollStatus === 'assigned' && !row.rollAssigned) return false;
    if (rollStatus === 'unassigned' && row.rollAssigned) return false;
  }

  return true;
};

const escapedCsv = (value) => {
  const safe = value == null ? '' : String(value);
  if (/[",\n]/.test(safe)) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
};

const getScopeFilter = (reqQuery = {}) => {
  const filter = {};
  if (reqQuery.department) filter.departmentId = reqQuery.department;
  if (reqQuery.degreeClass) filter.degreeClassId = reqQuery.degreeClass;
  if (reqQuery.batch) filter.batchId = reqQuery.batch;
  if (reqQuery.semester) filter['batchId.currentSemester'] = reqQuery.semester;
  return filter;
};

const isReplicaSetEnabled = async () => {
  try {
    const status = await mongoose.connection.db.admin().serverStatus();
    return Boolean(status?.replSet?.setName || status?.replSet?.ismaster);
  } catch (error) {
    return false;
  }
};

export const getAcademicNumberStudents = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      department,
      degreeClass,
      session,
      batch,
      semester,
      approvalStatus,
      registrationStatus,
      rollStatus,
      search,
    } = req.query;

    const rows = [];
    const applications = await Application.find({ status: 'approved' })
      .populate({ path: 'student', select: 'email personalInfo familyInfo academicInfo' })
      .populate('departmentId', 'name')
      .populate('degreeClassId', 'name')
      .populate({
        path: 'batchId',
        populate: { path: 'startSessionId', select: 'year term name' },
      })
      .sort({ createdAt: -1 });

    for (const application of applications) {
      const row = buildAcademicStudentRow(application);
      if (!matchesAcademicFilters(row, { department, degreeClass, session, batch, semester, approvalStatus, registrationStatus, rollStatus })) {
        continue;
      }

      if (search) {
        const searchTerm = String(search).toLowerCase().trim();
        const haystack = [
          row.name,
          row.email,
          row.cnic,
          row.registrationNumber,
          row.rollNumber,
          row.department,
          row.degreeClass,
          row.batch,
        ].join(' ').toLowerCase();

        if (!haystack.includes(searchTerm)) {
          continue;
        }
      }

      rows.push(row);
    }

    const pageNumber = Math.max(1, Number(page) || 1);
    const limitNumber = Math.max(1, Number(limit) || 20);
    const startIndex = (pageNumber - 1) * limitNumber;
    const paginated = rows.slice(startIndex, startIndex + limitNumber);

    return res.json({
      success: true,
      count: paginated.length,
      total: rows.length,
      totalPages: Math.ceil(rows.length / limitNumber) || 1,
      page: pageNumber,
      students: paginated,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getAcademicNumberStudentById = async (req, res) => {
  try {
    const studentId = req.params.studentId;
    const student = await Student.findById(studentId).populate('user', 'email roleSlug isActive');
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const application = await Application.findOne({ student: studentId })
      .populate('departmentId', 'name code')
      .populate('degreeClassId', 'name code')
      .populate('batchId', 'name currentSemester startSessionId')
      .populate({ path: 'batchId', populate: { path: 'startSessionId', select: 'year term name' } })
      .populate('reviewedBy', 'email');

    const enrollment = await Enrollment.findOne({ studentId }).populate({
      path: 'batchId',
      populate: { path: 'startSessionId', select: 'year term name' },
    });

    const history = await AcademicNumberAudit.find({ student: studentId })
      .sort({ createdAt: -1 })
      .populate('performedBy', 'email');

    const academicInfo = getStudentAcademicInfo(student, application || {});

    return res.json({
      success: true,
      student: {
        ...student.toObject(),
        academicInfo,
      },
      application,
      enrollment,
      academicInfo,
      classInfo: {
        department: application?.departmentId || null,
        degreeClass: application?.degreeClassId || null,
        batch: application?.batchId || enrollment?.batchId || null,
        session: application?.batchId?.startSessionId || enrollment?.batchId?.startSessionId || null,
      },
      assignmentHistory: history,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getClassStudentCount = async (req, res) => {
  try {
    const { classId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(classId)) {
      return res.status(400).json({ success: false, message: 'Invalid classId' });
    }

    const applications = await Application.find({ degreeClassId: classId }).populate('student', 'academicInfo');
    const total = applications.length;
    const approved = applications.filter((app) => app.status === 'approved').length;

    const registrationAssigned = applications.filter((app) => {
      const value = app.student?.academicInfo?.registrationNumber || app.registrationNo;
      return Boolean(value);
    }).length;

    const rollAssigned = applications.filter((app) => {
      const value = app.student?.academicInfo?.rollNumber || app.rollNo;
      return Boolean(value);
    }).length;

    return res.json({
      success: true,
      data: {
        classId,
        total,
        approved,
        registrationAssigned,
        registrationPending: Math.max(approved - registrationAssigned, 0),
        rollAssigned,
        rollPending: Math.max(approved - rollAssigned, 0),
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getStudentsForAcademicAssignment = async ({ department, degreeClass, session, batch, semester, mode, studentIds = [] }) => {
  const baseFilter = { status: 'approved' };

  if (department) baseFilter.departmentId = department;
  if (degreeClass) baseFilter.degreeClassId = degreeClass;
  if (batch) baseFilter.batchId = batch;
  if (mode === 'SELECTED' && studentIds.length) {
    baseFilter.student = { $in: studentIds.map((id) => new mongoose.Types.ObjectId(id)) };
  }

  const applications = await Application.find(baseFilter)
    .populate({ path: 'student', select: 'email personalInfo familyInfo academicInfo' })
    .populate('departmentId', 'name')
    .populate('degreeClassId', 'name')
    .populate({
      path: 'batchId',
      populate: { path: 'startSessionId', select: 'year term name' },
    })
    .sort({ createdAt: 1 });

  let filtered = applications.filter((application) => {
    const student = application.student;
    if (!student) return false;
    const batchDoc = application.batchId || null;
    const sessionMatch = !session || (batchDoc?.startSessionId?._id && batchDoc.startSessionId._id.toString() === session) || (!batchDoc && !session);
    const semesterMatch = !semester || String(batchDoc?.currentSemester || '') === String(semester);
    return sessionMatch && semesterMatch;
  });

  if (mode === 'SELECTED' && studentIds.length) {
    const selection = new Set(studentIds.map((id) => String(id)));
    filtered = filtered.filter((application) => selection.has(String(application.student?._id || application.student)));
  }

  return filtered;
};

const collectBulkAssignmentStates = async ({ department, degreeClass, session, batch, semester, startRegistrationNumber, startRollNumber, orderBy, mode, studentIds = [] }) => {
  const applications = await getStudentsForAcademicAssignment({ department, degreeClass, session, batch, semester, mode, studentIds });

  if (!applications.length) {
    return { classLabel: '', totalStudents: 0, approvedStudents: 0, alreadyAssigned: 0, studentsToAssign: 0, registrationStart: startRegistrationNumber || '', registrationEnd: startRegistrationNumber || '', rollStart: startRollNumber || '', rollEnd: startRollNumber || '', conflicts: [], rows: [] };
  }

  const rows = applications
    .map((application) => {
      const student = application.student || {};
      const academic = getStudentAcademicInfo(student, application);
      return {
        studentId: student._id,
        name: getStudentDisplayName(student),
        registrationNumber: academic.registrationNumber || '',
        rollNumber: academic.rollNumber || '',
        needsRegistration: !academic.registrationNumber,
        needsRoll: !academic.rollNumber,
      };
    })
    .sort((a, b) => {
      const order = String(orderBy || 'merit');
      if (order === 'name') return a.name.localeCompare(b.name);
      if (order === 'applicationDate') {
        const aDate = applications.find((app) => String(app.student?._id) === String(a.studentId))?.createdAt || new Date(0);
        const bDate = applications.find((app) => String(app.student?._id) === String(b.studentId))?.createdAt || new Date(0);
        return new Date(aDate) - new Date(bDate);
      }
      if (order === 'studentId') return String(a.studentId).localeCompare(String(b.studentId));
      return 0;
    });

  const studentsNeedingRegistration = rows.filter((row) => row.needsRegistration);
  const studentsNeedingRoll = rows.filter((row) => row.needsRoll);
  const registrationValues = studentsNeedingRegistration.length
    ? generateRegistrationNumbers(startRegistrationNumber, studentsNeedingRegistration.length)
    : [];
  const rollValues = studentsNeedingRoll.length
    ? generateRollNumbers(startRollNumber, studentsNeedingRoll.length)
    : [];

  const registrationMap = new Map();
  const rollMap = new Map();

  studentsNeedingRegistration.forEach((row, index) => registrationMap.set(String(row.studentId), registrationValues[index]));
  studentsNeedingRoll.forEach((row, index) => rollMap.set(String(row.studentId), rollValues[index]));

  const rowsWithAssignment = rows.map((row, index) => ({
    sr: index + 1,
    studentId: row.studentId,
    name: row.name,
    registrationNumber: row.registrationNumber || registrationMap.get(String(row.studentId)) || '',
    rollNumber: row.rollNumber || rollMap.get(String(row.studentId)) || '',
  }));

  const globalRegistrationNumbers = await Student.find({ 'academicInfo.registrationNumber': { $ne: null, $ne: '' } }).select('academicInfo.registrationNumber');
  const globalRegistrationSet = new Set(globalRegistrationNumbers.map((item) => String(item.academicInfo?.registrationNumber || '').toUpperCase()));

  const scopeRollNumbers = await Student.find({
    'academicInfo.rollNumber': { $ne: null, $ne: '' },
  }).select('academicInfo.rollNumber');

  const scopeRollSet = new Set(scopeRollNumbers.map((item) => String(item.academicInfo?.rollNumber || '').toUpperCase()));

  const conflicts = [];
  for (const row of rowsWithAssignment) {
    if (row.registrationNumber && globalRegistrationSet.has(String(row.registrationNumber).toUpperCase()) && !rowsWithAssignment.some((candidate) => candidate.studentId.toString() !== row.studentId.toString() && candidate.registrationNumber === row.registrationNumber)) {
      conflicts.push(`Registration Number Conflict: ${row.registrationNumber} already exist.`);
    }
    if (row.rollNumber && scopeRollSet.has(String(row.rollNumber).toUpperCase()) && !rowsWithAssignment.some((candidate) => candidate.studentId.toString() !== row.studentId.toString() && candidate.rollNumber === row.rollNumber)) {
      conflicts.push(`Roll Number Conflict: ${row.rollNumber} already exist.`);
    }
  }

  const registrationStart = registrationValues[0] || startRegistrationNumber || '';
  const registrationEnd = registrationValues[registrationValues.length - 1] || startRegistrationNumber || '';
  const rollStart = rollValues[0] || startRollNumber || '';
  const rollEnd = rollValues[rollValues.length - 1] || startRollNumber || '';

  return {
    classLabel: '',
    totalStudents: rows.length,
    approvedStudents: applications.length,
    alreadyAssigned: rows.filter((row) => row.registrationNumber || row.rollNumber).length,
    studentsToAssign: rows.filter((row) => !row.registrationNumber || !row.rollNumber).length,
    registrationStart,
    registrationEnd,
    rollStart,
    rollEnd,
    conflicts: Array.from(new Set(conflicts)),
    rows: rowsWithAssignment,
  };
};

export const previewBulkAssignment = async (req, res) => {
  try {
    const {
      department,
      degreeClass,
      session,
      batch,
      semester,
      startRegistrationNumber,
      startRollNumber,
      orderBy = 'merit',
      mode = 'CLASS',
      studentIds = [],
    } = req.body || {};

    if (!department || !degreeClass || !session || !batch || !startRegistrationNumber || !startRollNumber) {
      return res.status(400).json({ success: false, message: 'department, degreeClass, session, batch, startRegistrationNumber, and startRollNumber are required.' });
    }

    const preview = await collectBulkAssignmentStates({
      department,
      degreeClass,
      session,
      batch,
      semester,
      startRegistrationNumber,
      startRollNumber,
      orderBy,
      mode,
      studentIds,
    });

    return res.json({ success: true, ...preview });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const enforceNoAcademicConflicts = async ({ rows, department, degreeClass, session, batch }) => {
  const generatedRegistrationNumbers = rows.map((item) => String(item.newRegistrationNumber || item.registrationNumber || '').toUpperCase()).filter(Boolean);
  const generatedRollNumbers = rows.map((item) => String(item.newRollNumber || item.rollNumber || '').toUpperCase()).filter(Boolean);

  const existingRegistrations = await Student.find({
    _id: { $ne: null },
    'academicInfo.registrationNumber': { $in: generatedRegistrationNumbers },
  }).select('academicInfo.registrationNumber');

  const existingRollNumbers = await Student.find({
    'academicInfo.rollNumber': { $in: generatedRollNumbers },
  }).select('academicInfo.rollNumber');

  const regConflictSet = new Set(existingRegistrations.map((entry) => String(entry.academicInfo?.registrationNumber || '').toUpperCase()));
  const rollConflictSet = new Set(existingRollNumbers.map((entry) => String(entry.academicInfo?.rollNumber || '').toUpperCase()));

  const conflicts = [];

  for (const row of rows) {
    if (row.newRegistrationNumber && regConflictSet.has(String(row.newRegistrationNumber).toUpperCase())) {
      conflicts.push(`Registration Number Conflict: ${row.newRegistrationNumber} already exist. Please choose another starting number.`);
    }
    if (row.newRollNumber && rollConflictSet.has(String(row.newRollNumber).toUpperCase())) {
      conflicts.push(`Roll Number Conflict: ${row.newRollNumber} already exist. Please choose another starting number.`);
    }
  }

  if (conflicts.length) {
    throw new Error(conflicts[0]);
  }
};

export const assignBulk = async (req, res) => {
  try {
    const payload = req.body || {};
    const {
      department,
      degreeClass,
      session,
      batch,
      semester,
      startRegistrationNumber,
      startRollNumber,
      orderBy = 'merit',
      mode = 'CLASS',
      studentIds = [],
    } = payload;

    if (!department || !degreeClass || !session || !batch || !startRegistrationNumber || !startRollNumber) {
      return res.status(400).json({ success: false, message: 'department, degreeClass, session, batch, startRegistrationNumber, and startRollNumber are required.' });
    }

    const preview = await collectBulkAssignmentStates({ department, degreeClass, session, batch, semester, startRegistrationNumber, startRollNumber, orderBy, mode, studentIds });
    if (preview.conflicts.length) {
      return res.status(409).json({ success: false, message: preview.conflicts[0] });
    }

    const assignments = [];
    for (const row of preview.rows) {
      const student = await Student.findById(row.studentId).select('academicInfo');
      const oldRegistration = student?.academicInfo?.registrationNumber || null;
      const oldRoll = student?.academicInfo?.rollNumber || null;
      const newRegistration = row.registrationNumber || oldRegistration;
      const newRoll = row.rollNumber || oldRoll;
      if (!newRegistration && !newRoll) continue;
      assignments.push({
        studentId: row.studentId,
        oldRegistration,
        newRegistration,
        oldRoll,
        newRoll,
        scope: {
          departmentId: department || null,
          degreeClassId: degreeClass || null,
          sessionId: session || null,
          batchId: batch || null,
        },
        action: !oldRegistration && !oldRoll ? 'ASSIGN' : 'UPDATE',
      });
    }

    if (!assignments.length) {
      return res.status(200).json({ success: true, message: 'No academic numbers to assign.', assignments: [] });
    }

    const replicaSetEnabled = await isReplicaSetEnabled();

    if (replicaSetEnabled) {
      const mongoSession = await mongoose.startSession();
      try {
        await mongoSession.withTransaction(async () => {
          await enforceNoAcademicConflicts({ rows: assignments, department, degreeClass, session, batch });

          const bulkOps = assignments.map((item) => ({
            updateOne: {
              filter: { _id: item.studentId },
              update: {
                $set: {
                  'academicInfo.registrationNumber': item.newRegistration,
                  'academicInfo.rollNumber': item.newRoll,
                  'academicInfo.scope': item.scope,
                  'academicInfo.registrationAssignedAt': item.newRegistration && !item.oldRegistration ? new Date() : undefined,
                  'academicInfo.rollNumberAssignedAt': item.newRoll && !item.oldRoll ? new Date() : undefined,
                  'academicInfo.registrationAssignedBy': item.newRegistration && !item.oldRegistration ? req.user?.id || null : undefined,
                  'academicInfo.rollNumberAssignedBy': item.newRoll && !item.oldRoll ? req.user?.id || null : undefined,
                },
              },
            },
          }));

          await Student.bulkWrite(bulkOps, { session: mongoSession });

          const auditEntries = assignments.map((item) => ({
            student: item.studentId,
            action: item.action,
            oldRegistrationNumber: item.oldRegistration,
            newRegistrationNumber: item.newRegistration,
            oldRollNumber: item.oldRoll,
            newRollNumber: item.newRoll,
            performedBy: req.user?.id || null,
            createdAt: new Date(),
          }));

          await AcademicNumberAudit.insertMany(auditEntries, { session: mongoSession });
        });
      } finally {
        await mongoSession.endSession();
      }

      return res.json({ success: true, message: 'Bulk academic numbers assigned successfully.', assignedCount: assignments.length });
    }

    const beforeState = await Student.find({ _id: { $in: assignments.map((item) => item.studentId) } }).select('_id academicInfo');
    const beforeMap = new Map(beforeState.map((student) => [String(student._id), student.academicInfo || {}]));

    try {
      await enforceNoAcademicConflicts({ rows: assignments, department, degreeClass, session, batch });

      const bulkOps = assignments.map((item) => ({
        updateOne: {
          filter: { _id: item.studentId },
          update: {
            $set: {
              'academicInfo.registrationNumber': item.newRegistration,
              'academicInfo.rollNumber': item.newRoll,
              'academicInfo.scope': item.scope,
              'academicInfo.registrationAssignedAt': item.newRegistration && !item.oldRegistration ? new Date() : beforeMap.get(String(item.studentId))?.registrationAssignedAt || null,
              'academicInfo.rollNumberAssignedAt': item.newRoll && !item.oldRoll ? new Date() : beforeMap.get(String(item.studentId))?.rollNumberAssignedAt || null,
              'academicInfo.registrationAssignedBy': item.newRegistration && !item.oldRegistration ? req.user?.id || null : beforeMap.get(String(item.studentId))?.registrationAssignedBy || null,
              'academicInfo.rollNumberAssignedBy': item.newRoll && !item.oldRoll ? req.user?.id || null : beforeMap.get(String(item.studentId))?.rollNumberAssignedBy || null,
            },
          },
        },
      }));

      await Student.bulkWrite(bulkOps, { ordered: true });
      await AcademicNumberAudit.insertMany(assignments.map((item) => ({
        student: item.studentId,
        action: item.action,
        oldRegistrationNumber: item.oldRegistration,
        newRegistrationNumber: item.newRegistration,
        oldRollNumber: item.oldRoll,
        newRollNumber: item.newRoll,
        performedBy: req.user?.id || null,
        createdAt: new Date(),
      })));

      return res.json({ success: true, message: 'Bulk academic numbers assigned successfully.', assignedCount: assignments.length });
    } catch (error) {
      const rollbackOps = beforeState.map((student) => ({
        updateOne: {
          filter: { _id: student._id },
          update: { $set: { academicInfo: student.academicInfo || {} } },
        },
      }));
      if (rollbackOps.length) await Student.bulkWrite(rollbackOps, { ordered: true });
      const message = error?.code === 11000 ? 'Duplicate academic number detected. Please choose different numbers.' : error.message || 'Bulk assignment failed.';
      return res.status(error?.code === 11000 ? 409 : 400).json({ success: false, message });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const assignSingle = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { registrationNumber, rollNumber } = req.body || {};

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const application = await Application.findOne({ student: studentId, status: 'approved' });
    if (!application) {
      return res.status(400).json({ success: false, message: 'Only approved students can receive academic numbers.' });
    }

    const existingAcademic = student.academicInfo || {};
    const newRegistration = registrationNumber || existingAcademic.registrationNumber || null;
    const newRoll = rollNumber || existingAcademic.rollNumber || null;
    const applicationBatch = application.batchId ? await Batch.findById(application.batchId).select('startSessionId') : null;
    const assignmentScope = {
      departmentId: application.departmentId || null,
      degreeClassId: application.degreeClassId || null,
      sessionId: applicationBatch?.startSessionId || null,
      batchId: application.batchId || null,
    };

    if (!newRegistration && !newRoll) {
      return res.status(400).json({ success: false, message: 'At least one academic number value is required.' });
    }

    const existingRegistration = await Student.findOne({
      'academicInfo.registrationNumber': String(newRegistration).toUpperCase(),
      _id: { $ne: studentId },
    });

    if (newRegistration && existingRegistration) {
      return res.status(409).json({ success: false, message: `Registration Number Conflict: ${newRegistration} already exist. Please choose another value.` });
    }

    const existingRoll = await Student.findOne({
      'academicInfo.rollNumber': String(newRoll).toUpperCase(),
      _id: { $ne: studentId },
    });

    if (newRoll && existingRoll) {
      return res.status(409).json({ success: false, message: `Roll Number Conflict: ${newRoll} already exist. Please choose another value.` });
    }

    const update = {
      'academicInfo.registrationNumber': newRegistration,
      'academicInfo.rollNumber': newRoll,
      'academicInfo.scope': assignmentScope,
      'academicInfo.registrationAssignedAt': newRegistration && !existingAcademic.registrationNumber ? new Date() : existingAcademic.registrationAssignedAt || null,
      'academicInfo.rollNumberAssignedAt': newRoll && !existingAcademic.rollNumber ? new Date() : existingAcademic.rollNumberAssignedAt || null,
      'academicInfo.registrationAssignedBy': newRegistration && !existingAcademic.registrationNumber ? req.user?.id || null : existingAcademic.registrationAssignedBy || null,
      'academicInfo.rollNumberAssignedBy': newRoll && !existingAcademic.rollNumber ? req.user?.id || null : existingAcademic.rollNumberAssignedBy || null,
    };

    await Student.updateOne({ _id: studentId }, { $set: update });

    await AcademicNumberAudit.create({
      student: studentId,
      action: 'ASSIGN',
      oldRegistrationNumber: existingAcademic.registrationNumber || null,
      newRegistrationNumber: newRegistration,
      oldRollNumber: existingAcademic.rollNumber || null,
      newRollNumber: newRoll,
      performedBy: req.user?.id || null,
      createdAt: new Date(),
    });

    return res.json({ success: true, message: 'Academic number assigned successfully.', data: update });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateAcademicNumbers = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { registrationNumber, rollNumber } = req.body || {};
    const student = await Student.findById(studentId);

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const academic = student.academicInfo || {};
    const nextRegistration = registrationNumber !== undefined ? String(registrationNumber).trim().toUpperCase() || null : academic.registrationNumber || null;
    const nextRoll = rollNumber !== undefined ? String(rollNumber).trim().toUpperCase() || null : academic.rollNumber || null;

    if (nextRegistration) {
      const duplicate = await Student.findOne({
        'academicInfo.registrationNumber': nextRegistration,
        _id: { $ne: studentId },
      });
      if (duplicate) {
        return res.status(409).json({ success: false, message: `Registration Number Conflict: ${nextRegistration} already exist. Please choose another value.` });
      }
    }

    if (nextRoll) {
      const duplicate = await Student.findOne({
        'academicInfo.rollNumber': nextRoll,
        _id: { $ne: studentId },
      });
      if (duplicate) {
        return res.status(409).json({ success: false, message: `Roll Number Conflict: ${nextRoll} already exist. Please choose another value.` });
      }
    }

    const update = {
      'academicInfo.registrationNumber': nextRegistration,
      'academicInfo.rollNumber': nextRoll,
      'academicInfo.scope': {
        departmentId: academic.scope?.departmentId || null,
        degreeClassId: academic.scope?.degreeClassId || null,
        sessionId: academic.scope?.sessionId || null,
        batchId: academic.scope?.batchId || null,
      },
      'academicInfo.registrationAssignedAt': nextRegistration && !academic.registrationNumber ? new Date() : academic.registrationAssignedAt || new Date(),
      'academicInfo.rollNumberAssignedAt': nextRoll && !academic.rollNumber ? new Date() : academic.rollNumberAssignedAt || new Date(),
      'academicInfo.registrationAssignedBy': req.user?.id || academic.registrationAssignedBy || null,
      'academicInfo.rollNumberAssignedBy': req.user?.id || academic.rollNumberAssignedBy || null,
    };

    await Student.updateOne({ _id: studentId }, { $set: update });
    await AcademicNumberAudit.create({
      student: studentId,
      action: 'UPDATE',
      oldRegistrationNumber: academic.registrationNumber || null,
      newRegistrationNumber: nextRegistration,
      oldRollNumber: academic.rollNumber || null,
      newRollNumber: nextRoll,
      performedBy: req.user?.id || null,
      createdAt: new Date(),
    });

    return res.json({ success: true, message: 'Academic numbers updated successfully.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const clearAcademicNumbers = async (req, res) => {
  try {
    const { studentId } = req.params;
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const previous = student.academicInfo || {};
    await Student.updateOne({ _id: studentId }, {
      $set: {
        'academicInfo.registrationNumber': null,
        'academicInfo.rollNumber': null,
        'academicInfo.scope': {
          departmentId: null,
          degreeClassId: null,
          sessionId: null,
          batchId: null,
        },
        'academicInfo.registrationAssignedAt': null,
        'academicInfo.rollNumberAssignedAt': null,
        'academicInfo.registrationAssignedBy': null,
        'academicInfo.rollNumberAssignedBy': null,
      },
    });

    await AcademicNumberAudit.create({
      student: studentId,
      action: 'CLEAR',
      oldRegistrationNumber: previous.registrationNumber || null,
      newRegistrationNumber: null,
      oldRollNumber: previous.rollNumber || null,
      newRollNumber: null,
      performedBy: req.user?.id || null,
      createdAt: new Date(),
    });

    return res.json({ success: true, message: 'Academic numbers cleared successfully.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getAssignmentHistory = async (req, res) => {
  try {
    const { studentId } = req.params;
    const history = await AcademicNumberAudit.find({ student: studentId }).sort({ createdAt: -1 }).populate('performedBy', 'email');
    return res.json({ success: true, total: history.length, history });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const exportAcademicNumbers = async (req, res) => {
  try {
    const rows = await getAcademicNumberStudentsRows();
    const csvHeader = ['Student Name', 'Father Name', 'CNIC', 'Department', 'Degree Class', 'Session', 'Batch', 'Registration Number', 'Roll Number'];
    const csvRows = [csvHeader.map(escapedCsv).join(',')];

    rows.forEach((row) => {
      csvRows.push([
        row.name,
        row.fatherName,
        row.cnic,
        row.department,
        row.degreeClass,
        row.session,
        row.batch,
        row.registrationNumber,
        row.rollNumber,
      ].map(escapedCsv).join(','));
    });

    const csv = csvRows.join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="academic-numbers.csv"');
    return res.send(csv);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getAcademicNumberStudentsRows = async () => {
  const applications = await Application.find({ status: 'approved' })
    .populate({ path: 'student', select: 'email personalInfo familyInfo academicInfo' })
    .populate('departmentId', 'name')
    .populate('degreeClassId', 'name')
    .populate({
      path: 'batchId',
      populate: { path: 'startSessionId', select: 'year term name' },
    })
    .sort({ createdAt: -1 });

  return applications.map((application) => {
    const student = application.student || {};
    const academic = getStudentAcademicInfo(student, application);
    const batch = application.batchId || {};
    const sessionName = batch.startSessionId?.year ? `${batch.startSessionId.term || ''} ${batch.startSessionId.year || ''}`.trim() : '';
    return {
      name: getStudentDisplayName(student),
      fatherName: student.personalInfo?.fatherName || student.familyInfo?.fatherName || '',
      cnic: student.personalInfo?.cnic || '',
      department: application.departmentId?.name || '',
      degreeClass: application.degreeClassId?.name || '',
      session: sessionName,
      batch: batch.name || '',
      registrationNumber: academic.registrationNumber || '',
      rollNumber: academic.rollNumber || '',
    };
  });
};
