import { useState, useRef, useEffect } from "react";
import { X, Upload, AlertCircle, CheckCircle, Loader, FileText, ChevronRight, ChevronLeft, Users, UserCog } from "lucide-react";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";
import { bulkUploadReservists, bulkUploadReservistInfo, getArcens, getGroupsList, getSquadrons } from "@/services/api";

const UPLOAD_TYPES = {
  POSITION: 'position',
  RESERVIST_INFO: 'reservist_info',
};

const RESERVIST_INFO_COLUMNS = [
  'Fullname', 'Rank', 'AFPSN (Serial Number)', 'Date of Birth', 'Place of Birth',
  'Age', 'Sex', 'Civil Status', 'Citizenship', 'Height', 'Weight', 'Blood Type',
  'Home Address', 'Contact Number', 'Email Address', 'Branch of Service',
  'Reserve Center', 'Group Command', 'Squadron', 'Category (1st / 2nd / 3rd Category)',
  'Source of Commission/Enlistment (ROTC/ BCMT/ MOTC/ Direct Commission)',
  'Date Enlisted', 'Rank Date of Appointment', 'Specialization/MOS',
  'Status (Ready Reserve/ Standby Reserve/ Retired)', 'Highest Educational Attainment',
  'Course/Degree', 'School', 'Year Graduated', 'Occupation', 'Employer/Company',
  'Office Address', 'Basic Training Completed (BCMT/ROTC)', 'Date Completed',
  'Other Military Courses/Training', 'AWARDS AND DECORATIONS',
  'Emergency contact name', 'Relationship', 'Contact Number', 'Address',
];

export default function BulkUploadModal({ isOpen, onClose, onSuccess }) {
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [stage, setStage] = useState("upload");
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [previewData, setPreviewData] = useState(null);
  const [sheetNames, setSheetNames] = useState([]);
  const [parseError, setParseError] = useState(null);
  const [arsens, setArsens] = useState([]);
  const [selectedArsen, setSelectedArsen] = useState(null);
  const [loadingArsens, setLoadingArsens] = useState(false);
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [squadrons, setSquadrons] = useState([]);
  const [selectedSquadron, setSelectedSquadron] = useState(null);
  const [loadingSquadrons, setLoadingSquadrons] = useState(false);
  const [uploadType, setUploadType] = useState(UPLOAD_TYPES.POSITION);

  useEffect(() => {
    loadArsensAndGroups();
  }, []);

  const loadArsensAndGroups = async () => {
    try {
      setLoadingArsens(true);
      setLoadingGroups(true);
      const [arsenRes, groupRes] = await Promise.all([
        getArcens({ is_active: true }),
        getGroupsList({ is_active: true })
      ]);
      if (arsenRes.data.status === 'success') {
        const arsenList = arsenRes.data.data || [];
        setArsens(arsenList);
      }
      if (groupRes.data.status === 'success') {
        setGroups(groupRes.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load ARCENs or Groups:', err);
    } finally {
      setLoadingArsens(false);
      setLoadingGroups(false);
    }
  };

  const loadSquadrons = async (groupId) => {
    if (!groupId) {
      setSquadrons([]);
      setSelectedSquadron(null);
      return;
    }
    try {
      setLoadingSquadrons(true);
      const squadronRes = await getSquadrons({ group_id: groupId, is_active: true });
      if (squadronRes.data.status === 'success') {
        setSquadrons(squadronRes.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load Squadrons:', err);
      setSquadrons([]);
    } finally {
      setLoadingSquadrons(false);
    }
  };

  const filteredGroups = groups.filter(g => {
    if (!selectedArsen) return false;
    const arsenId = g.arsen_id != null ? parseInt(g.arsen_id, 10) : null;
    return arsenId === selectedArsen;
  });

  const filteredSquadrons = squadrons;

  const parsePositionExcel = (excelFile) => {
    try {
      setParseError(null);
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: "array" });
          const sheets = workbook.SheetNames;
          setSheetNames(sheets);

          const firstSheet = sheets[0];
          const worksheet = workbook.Sheets[firstSheet];

          const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

          let headerRowIndex = 0;
          for (let i = 0; i < rawData.length; i++) {
            const row = rawData[i];
            if (row && row.some(cell =>
              cell && typeof cell === 'string' &&
              (cell === 'DESCRIPTION/POSITION' || cell === 'GRADE' || cell === 'AFSC' ||
               cell === 'REQUIRED' || cell === 'NAME' || cell === 'Position' || cell === 'Name')
            )) {
              headerRowIndex = i;
              break;
            }
          }

          const headers = rawData[headerRowIndex] || [];
          const dataRows = rawData.slice(headerRowIndex + 1);
          const jsonData = dataRows.map(row => {
            const obj = {};
            headers.forEach((key, idx) => {
              if (key != null) obj[key] = row[idx];
            });
            return obj;
          });

          const filteredData = jsonData.filter(row => {
            const position = (row["DESCRIPTION/POSITION"] || row["Position"] || "").trim();
            const name = (row["NAME"] || row["Name"] || "").trim();
            if (!name || name.length < 3) return false;
            const nameUpper = name.toUpperCase();
            if (nameUpper === 'VACANT' || nameUpper.includes('VACANT')) return false;
            const posUpper = position.toUpperCase();
            if (posUpper.includes("TOTAL") || posUpper === "SAFETY" || posUpper.includes("BRANCH")) return false;
            return true;
          });

          const preview = filteredData.slice(0, 3).map((row, idx) => {
            const name = row["NAME"] || row["Name"] || "";
            const parsed = parseFullname(name);
            return ({
              sheetName: firstSheet,
              sheetIndex: 0,
              rowIndex: idx + 1,
              data: {
                position: row["DESCRIPTION/POSITION"] || row["Position"] || "",
                grade: row["GRADE"] || "",
                afsc: row["AFSC"] || "",
                required: row["REQUIRED"] || row["Required"] || "",
                name: name,
                parsedRank: parsed.rank,
                parsedServiceNumber: parsed.serviceNumber,
              },
            });
          });

          setPreviewData(preview);
          setStage("preview");
          setPreviewing(false);
        } catch (err) {
          setParseError(`Error parsing Excel file: ${err.message}`);
          setPreviewing(false);
        }
      };

      reader.onerror = () => {
        setParseError("Error reading file");
        setPreviewing(false);
      };

      reader.readAsArrayBuffer(excelFile);
    } catch (err) {
      setParseError(`Error processing file: ${err.message}`);
      setPreviewing(false);
    }
  };

  const parseFullname = (fullname) => {
  if (!fullname || typeof fullname !== 'string') {
    return { rank: '', firstName: '', lastName: '', serviceNumber: '' };
  }

  let cleanName = fullname.trim();

  // Extract service number (pattern: MN-XXXXX or O-XXXXX, with possible hyphens in number)
  const serviceNumberMatch = cleanName.match(/(MN-[\w-]+|O-[\w-]+)/i);
  const result = {
    serviceNumber: serviceNumberMatch ? serviceNumberMatch[1].toUpperCase() : '',
    rank: '',
    firstName: '',
    lastName: ''
  };

  // Remove service number and PAF(RES) suffix from name
  cleanName = cleanName
    .replace(/\s*(MN-[\w-]+|O-[\w-]+)\s*/i, ' ')
    .replace(/\s*PAF\s*\(.*?\)[\s.]*$/i, '') // Handle PAF(Res), PAF(RES), PAF(RES).
    .trim();

  // Extract rank - first word if it matches known rank patterns
  const rankPattern = /^(LTC|LTCOL|COL|CAPT|CPT|1LT|2LT|MSGT|MSG|SSGT|SG|TSGT|TSG|SGT|Sgt|CPL|Cpl|PVT|PV2|Spc|SPC)$/i;
  const rankMatch = cleanName.match(rankPattern);
  result.rank = rankMatch ? rankMatch[1].toUpperCase() : '';

  // Remove rank from name
  const remainingName = cleanName.replace(rankPattern, '').trim();

  // Split remaining into first and last name
  const nameParts = remainingName.trim().split(/\s+/);
  if (nameParts.length >= 2) {
    result.firstName = nameParts[0];
    result.lastName = nameParts.slice(1).join(' ');
  } else if (nameParts.length === 1) {
    result.firstName = nameParts[0];
    result.lastName = '';
  }

  return result;
};

const parseReservistInfoExcel = (excelFile) => {
    try {
      setParseError(null);
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: "array" });
          const sheets = workbook.SheetNames;
          setSheetNames(sheets);

          const firstSheet = sheets[0];
          const worksheet = workbook.Sheets[firstSheet];

          const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

          let headerRowIndex = 0;
          for (let i = 0; i < rawData.length; i++) {
            const row = rawData[i];
            if (row && row.some(cell =>
              cell && typeof cell === 'string' &&
              (cell.trim() === 'Fullname' || cell.trim() === 'Rank' || cell.trim() === 'AFPSN (Serial Number)' ||
               cell.trim() === 'Email Address' || cell.trim() === 'Contact Number')
            )) {
              headerRowIndex = i;
              break;
            }
          }

          const headers = (rawData[headerRowIndex] || []).map(h => h != null ? String(h).trim() : h);
          const dataRows = rawData.slice(headerRowIndex + 1);

          const headerLookup = {};
          headers.forEach((h, idx) => {
            if (h != null) {
              headerLookup[h] = idx;
              headerLookup[h.toLowerCase()] = idx;
              headerLookup[h.replace(/[\s/()]+/g, '').toLowerCase()] = idx;
            }
          });

          const getVal = (rowArr, ...possibleNames) => {
            for (const name of possibleNames) {
              if (headerLookup[name] != null) return rowArr[headerLookup[name]] || "";
              const lower = name.toLowerCase();
              if (headerLookup[lower] != null) return rowArr[headerLookup[lower]] || "";
              const stripped = name.replace(/[\s/()]+/g, '').toLowerCase();
              if (headerLookup[stripped] != null) return rowArr[headerLookup[stripped]] || "";
            }
            return "";
          };
          const jsonData = dataRows.map(row => {
            const obj = {};
            headers.forEach((key, idx) => {
              if (key != null) obj[key] = row[idx];
            });
            obj.__raw = row;
            const headerIndexMap = {};
            headers.forEach((h, idx) => {
              if (h != null) {
                if (!headerIndexMap[h]) headerIndexMap[h] = [];
                headerIndexMap[h].push(idx);
              }
            });
            obj.__headerIndexMap = headerIndexMap;
            return obj;
          });

          const filteredData = jsonData.filter(row => {
            const fullname = (row["Fullname"] || "").trim();
            return fullname && fullname.length >= 2;
          });

const preview = filteredData.slice(0, 3).map((row, idx) => {
            const raw = row.__raw || [];
            const parsed = parseFullname(getVal(raw, 'Fullname') || "");
            return ({
              sheetName: firstSheet,
              sheetIndex: 0,
              rowIndex: idx + 1,
              data: {
                fullname: getVal(raw, 'Fullname'),
                rank: getVal(raw, 'Rank') || parsed.rank,
                afpsn: getVal(raw, 'AFPSN (Serial Number)', 'AFPSN', 'Serial Number') || parsed.serviceNumber,
                dateOfBirth: getVal(raw, 'Date of Birth', 'DOB', 'Birth Date'),
                placeOfBirth: getVal(raw, 'Place of Birth', 'Birth Place'),
                age: getVal(raw, 'Age'),
                sex: getVal(raw, 'Sex', 'Gender'),
                civilStatus: getVal(raw, 'Civil Status', 'Marital Status'),
                citizenship: getVal(raw, 'Citizenship', 'Nationality'),
                height: getVal(raw, 'Height'),
                weight: getVal(raw, 'Weight'),
                bloodType: getVal(raw, 'Blood Type', 'BloodType'),
                homeAddress: getVal(raw, 'Home Address', 'Address'),
                contactNumber: getVal(raw, 'Contact Number', 'Contact', 'Phone'),
                email: getVal(raw, 'Email Address', 'Email'),
                branchOfService: getVal(raw, 'Branch of Service', 'Branch'),
                reserveCenter: getVal(raw, 'Reserve Center', 'ARCEN'),
                groupCommand: getVal(raw, 'Group Command', 'Group'),
                squadron: getVal(raw, 'Squadron'),
                category: getVal(raw, 'Category (1st / 2nd / 3rd Category)', 'Category'),
                sourceOfCommission: getVal(raw, 'Source of Commission/Enlistment (ROTC/ BCMT/ MOTC/ Direct Commission)', 'Source of Commission', 'Source of Enlistment'),
                dateEnlisted: getVal(raw, 'Date Enlisted', 'Enlisted Date', 'Date of Enlistment'),
                rankDateOfAppointment: getVal(raw, 'Rank Date of Appointment', 'Rank Date', 'Date of Appointment'),
                specialization: getVal(raw, 'Specialization/MOS', 'Specialization', 'MOS'),
                status: getVal(raw, 'Status (Ready Reserve/ Standby Reserve/ Retired)', 'Status', 'Reserve Status'),
                highestEducation: getVal(raw, 'Highest Educational Attainment', 'Highest Education', 'Education'),
                courseDegree: getVal(raw, 'Course/Degree', 'Course', 'Degree'),
                school: getVal(raw, 'School'),
                yearGraduated: getVal(raw, 'Year Graduated', 'Graduation Year'),
                occupation: getVal(raw, 'Occupation', 'Job', 'Profession'),
                employer: getVal(raw, 'Employer/Company', 'Employer', 'Company'),
                officeAddress: getVal(raw, 'Office Address'),
                basicTraining: getVal(raw, 'Basic Training Completed (BCMT/ROTC)', 'Basic Training Completed', 'Basic Training', 'BCMT'),
                dateCompleted: getVal(raw, 'Date Completed', 'Completed Date'),
                otherTraining: getVal(raw, 'Other Military Courses/Training', 'Other Training'),
                awards: getVal(raw, 'AWARDS AND DECORATIONS', 'Awards', 'Awards and Decorations'),
                emergencyContactName: getVal(raw, 'Emergency contact name', 'Emergency Contact Name', 'Emergency Contact'),
                emergencyRelationship: getVal(raw, 'Relationship', 'Relation'),
                emergencyContactNumber: getVal(raw, 'Contact Number', 'EC Contact', 'Emergency Phone'),
                emergencyAddress: getVal(raw, 'Address', 'EC Address', 'Emergency Address'),
              },
            });
          });

          setPreviewData(preview);
          setStage("preview");
          setPreviewing(false);
        } catch (err) {
          setParseError(`Error parsing Excel file: ${err.message}`);
          setPreviewing(false);
        }
      };

      reader.onerror = () => {
        setParseError("Error reading file");
        setPreviewing(false);
      };

      reader.readAsArrayBuffer(excelFile);
    } catch (err) {
      setParseError(`Error processing file: ${err.message}`);
      setPreviewing(false);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (
      !selectedFile.name.endsWith(".xlsx") &&
      !selectedFile.name.endsWith(".xls") &&
      !selectedFile.name.endsWith(".csv")
    ) {
      setError("Please select a valid Excel file (.xlsx, .xls, or .csv)");
      return;
    }

    setFile(selectedFile);
    setError(null);
    setPreviewing(true);

    if (uploadType === UPLOAD_TYPES.RESERVIST_INFO) {
      parseReservistInfoExcel(selectedFile);
    } else {
      parsePositionExcel(selectedFile);
    }
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

const handleUpload = async () => {
     if (!file) {
       setError("Please select a file first");
       return;
     }

     if (uploadType === UPLOAD_TYPES.POSITION && !selectedArsen) {
       setError("Please select an ARCEN first");
       return;
     }

     if (uploadType === UPLOAD_TYPES.RESERVIST_INFO) {
       if (!selectedArsen || !selectedGroup || !selectedSquadron) {
         setError("Please select an ARSEN, Group, and Squadron");
         return;
       }
     }

     setLoading(true);
     setError(null);
     setStage("uploading");

     try {
       const formData = new FormData();
       formData.append("file", file);
       formData.append("arsen_id", selectedArsen);
       formData.append("group_id", selectedGroup);
       formData.append("squadron_id", selectedSquadron);

      const uploadFn = uploadType === UPLOAD_TYPES.RESERVIST_INFO
        ? bulkUploadReservistInfo
        : bulkUploadReservists;

      const response = await uploadFn(formData);

      if (response.data.status === "success") {
        setSuccessMessage(
          `Successfully uploaded ${response.data.data.successful} record(s). ${
            response.data.data.failed > 0 ? `${response.data.data.failed} failed.` : ""
          }`
        );
        setStage("success");
        setUploadProgress(100);

        setTimeout(() => {
          handleClose();
          onSuccess?.();
        }, 3000);
      } else {
        setError(response.data.message || "Upload failed");
        setStage("preview");
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Upload failed. Please try again.");
      setStage("preview");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setStage("upload");
    setError(null);
    setSuccessMessage("");
    setPreviewData(null);
    setSheetNames([]);
    setParseError(null);
    setUploadProgress(0);
    setSelectedArsen(null);
    setSelectedGroup(null);
    setSelectedSquadron(null);
    setUploadType(UPLOAD_TYPES.POSITION);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onClose();
  };

  const handleUploadTypeChange = (e) => {
    setUploadType(e.target.value);
    setFile(null);
    setPreviewData(null);
    setSheetNames([]);
    setParseError(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      <div className={cn(
        "relative z-10 w-full rounded-2xl shadow-2xl max-w-2xl",
        "bg-white dark:bg-neutral-900",
        "border border-neutral-200 dark:border-neutral-800",
        "animate-in fade-in zoom-in-95 duration-150"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 px-6 py-4">
          <div>
            <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-50 tracking-tight">
              Bulk Upload Reservists
            </h2>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
              {uploadType === UPLOAD_TYPES.POSITION
                ? "Upload Excel file with position data for multiple reservists"
                : "Upload Excel file with detailed reservist information"}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            aria-label="Close modal"
          >
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
          {stage === "upload" && (
            <>
              {/* Upload Type Selection */}
              <div className="space-y-2">
                <label className="block text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">
                  Upload Type <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setUploadType(UPLOAD_TYPES.POSITION)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-all duration-150",
                      uploadType === UPLOAD_TYPES.POSITION
                        ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10"
                        : "border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600"
                    )}
                  >
                    <div className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-lg",
                      uploadType === UPLOAD_TYPES.POSITION
                        ? "bg-indigo-500 text-white"
                        : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500"
                    )}>
                      <Users size={20} />
                    </div>
                    <div>
                      <p className={cn(
                        "text-sm font-semibold",
                        uploadType === UPLOAD_TYPES.POSITION
                          ? "text-indigo-700 dark:text-indigo-300"
                          : "text-neutral-700 dark:text-neutral-300"
                      )}>
                        Position Upload
                      </p>
                      <p className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                        Unit manning document with positions
                      </p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setUploadType(UPLOAD_TYPES.RESERVIST_INFO)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-all duration-150",
                      uploadType === UPLOAD_TYPES.RESERVIST_INFO
                        ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10"
                        : "border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600"
                    )}
                  >
                    <div className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-lg",
                      uploadType === UPLOAD_TYPES.RESERVIST_INFO
                        ? "bg-indigo-500 text-white"
                        : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500"
                    )}>
                      <UserCog size={20} />
                    </div>
                    <div>
                      <p className={cn(
                        "text-sm font-semibold",
                        uploadType === UPLOAD_TYPES.RESERVIST_INFO
                          ? "text-indigo-700 dark:text-indigo-300"
                          : "text-neutral-700 dark:text-neutral-300"
                      )}>
                        Reservist Info
                      </p>
                      <p className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                        Detailed personal & military information
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Instructions */}
              <div className="rounded-lg bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 p-4">
                <h3 className="text-[11px] font-semibold text-neutral-900 dark:text-neutral-300 mb-2 uppercase tracking-wide">
                  {uploadType === UPLOAD_TYPES.POSITION ? 'Position Upload Format' : 'Reservist Info Format'}
                </h3>
                {uploadType === UPLOAD_TYPES.POSITION ? (
                  <ul className="text-[11px] text-neutral-600 dark:text-neutral-400 space-y-1 ml-4 list-disc">
                    <li><strong>Single sheet</strong> for position upload</li>
                    <li><strong>Required columns:</strong> NAME, DESCRIPTION/POSITION</li>
                    <li><strong>Name format:</strong> "LTC JENNY LYN T NALUPA O-160092 PAF(RES)" will be auto-parsed</li>
                    <li><strong>Other columns (GRADE, AFSC, REQUIRED) will be ignored</strong></li>
                  </ul>
                ) : (
                  <ul className="text-[11px] text-neutral-600 dark:text-neutral-400 space-y-1 ml-4 list-disc">
                    <li><strong>Single sheet</strong> with all reservist details</li>
                    <li><strong>Required columns:</strong> Fullname, Rank, AFPSN (Serial Number)</li>
                    <li><strong>Name format:</strong> "LTC JENNY LYN T NALUPA O-160092 PAF(RES)" will be auto-parsed</li>
                    <li><strong>Optional columns:</strong> Date of Birth, Place of Birth, Age, Sex, Civil Status, Citizenship, Height, Weight, Blood Type, Home Address, Contact Number, Email Address, Branch of Service, Reserve Center, Group Command, Squadron, Category, Source of Commission/Enlistment, Date Enlisted, Rank Date of Appointment, Specialization/MOS, Status, Highest Educational Attainment, Course/Degree, School, Year Graduated, Occupation, Employer/Company, Office Address, Basic Training Completed, Date Completed, Other Military Courses/Training, AWARDS AND DECORATIONS, Emergency contact name, Relationship, Contact Number, Address</li>
                  </ul>
                )}
              </div>

              {/* ARSEN / Group / Squadron Selection */}
              <div className="space-y-2">
                <label className="block text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">
                  Select ARCEN (Air Reserve Squadron Center) <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedArsen || ""}
                  onChange={(e) => {
                    const newArsen = e.target.value ? parseInt(e.target.value) : null;
                    setSelectedArsen(newArsen);
                    setSelectedGroup(null);
                    setSelectedSquadron(null);
                    setSquadrons([]);
                  }}
                  disabled={loadingArsens}
                  className={cn(
                    "w-full rounded-lg border px-2.5 py-1.5 text-sm",
                    "border-neutral-200 dark:border-neutral-700",
                    "bg-white dark:bg-neutral-800",
                    "text-neutral-800 dark:text-neutral-200",
                    "outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400",
                    "transition-all duration-150 cursor-pointer",
                    loadingArsens && "cursor-not-allowed opacity-60"
                  )}
                >
                  <option value="">
                    {loadingArsens ? "Loading ARCENs..." : "Select an ARCEN..."}
                  </option>
                  {arsens.map((arsen) => (
                    <option key={arsen.id} value={arsen.id}>
                      {arsen.name} {arsen.code ? `(${arsen.code})` : ""}
                    </option>
                  ))}
                </select>
                {arsens.length === 0 && !loadingArsens && (
                  <p className="text-[11px] text-red-600">
                    ⚠️ No active ARSENs available. Please create one first.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">
                  Select Group <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedGroup || ""}
                  onChange={(e) => {
                    const newGroup = e.target.value ? parseInt(e.target.value) : null;
                    setSelectedGroup(newGroup);
                    setSelectedSquadron(null);
                    loadSquadrons(newGroup);
                  }}
                  disabled={!selectedArsen || loadingGroups}
                  className={cn(
                    "w-full rounded-lg border px-2.5 py-1.5 text-sm",
                    "border-neutral-200 dark:border-neutral-700",
                    "bg-white dark:bg-neutral-800",
                    "text-neutral-800 dark:text-neutral-200",
                    "outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400",
                    "transition-all duration-150 cursor-pointer",
                    (!selectedArsen || loadingGroups) && "cursor-not-allowed opacity-60"
                  )}
                >
                  <option value="">
                    {!selectedArsen ? "Select an ARCEN first..." : loadingGroups ? "Loading groups..." : "Select a Group..."}
                  </option>
                  {filteredGroups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
                {selectedArsen && filteredGroups.length === 0 && !loadingGroups && (
                  <p className="text-[11px] text-amber-600">
                    No active groups available for this ARSEN.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">
                  Select Squadron <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedSquadron || ""}
                  onChange={(e) => setSelectedSquadron(e.target.value ? parseInt(e.target.value) : null)}
                  disabled={!selectedGroup || loadingSquadrons}
                  className={cn(
                    "w-full rounded-lg border px-2.5 py-1.5 text-sm",
                    "border-neutral-200 dark:border-neutral-700",
                    "bg-white dark:bg-neutral-800",
                    "text-neutral-800 dark:text-neutral-200",
                    "outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400",
                    "transition-all duration-150 cursor-pointer",
                    (!selectedGroup || loadingSquadrons) && "cursor-not-allowed opacity-60"
                  )}
                >
                  <option value="">
                    {!selectedGroup ? "Select a Group first..." : loadingSquadrons ? "Loading squadrons..." : "Select a Squadron..."}
                  </option>
                  {filteredSquadrons.map((squadron) => (
                    <option key={squadron.id} value={squadron.id}>
                      {squadron.name}
                    </option>
                  ))}
                </select>
                {selectedGroup && filteredSquadrons.length === 0 && !loadingSquadrons && (
                  <p className="text-[11px] text-amber-600">
                    No active squadrons available for this group.
                  </p>
                )}
              </div>

              {/* Upload Area */}
              <div
                onClick={handleFileClick}
                className={cn(
                  "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer",
                  "border-neutral-300 dark:border-neutral-700",
                  "hover:border-indigo-400 hover:bg-indigo-50/30 dark:hover:bg-indigo-500/5",
                  "transition-all duration-200"
                )}
              >
                <div className="flex flex-col items-center">
                  <div className={cn(
                    "flex h-14 w-14 items-center justify-center rounded-xl mb-3",
                    "bg-indigo-50 dark:bg-indigo-500/10",
                    "border border-indigo-200 dark:border-indigo-500/20"
                  )}>
                    <Upload className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <p className="text-sm font-medium text-neutral-900 dark:text-neutral-200">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                    Excel files (.xlsx, .xls, .csv) up to 10MB
                  </p>
                  {file && (
                    <div className="mt-3 flex items-center gap-2 text-[11px]">
                      <FileText className="w-3.5 h-3.5 text-green-600" />
                      <span className="font-medium text-green-700 dark:text-green-400">
                        {file.name}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="hidden"
              />

              {error && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
                  <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] text-red-700 dark:text-red-300">{error}</p>
                </div>
              )}
            </>
          )}

          {stage === "preview" && previewData && (
            <>
              {/* Selection Summary */}
              {uploadType === UPLOAD_TYPES.POSITION ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 p-3">
                    <p className="text-[10px] font-semibold text-emerald-800 dark:text-emerald-300 uppercase tracking-wide mb-1">
                      Selected ARSEN
                    </p>
                    <p className="text-[12px] font-medium text-emerald-900 dark:text-emerald-200">
                      {arsens.find(a => a.id === selectedArsen)?.name || "Unknown"}
                      {arsens.find(a => a.id === selectedArsen)?.code && (
                        <span className="text-neutral-600 dark:text-neutral-400"> ({arsens.find(a => a.id === selectedArsen)?.code})</span>
                      )}
                    </p>
                  </div>
                  <div className="rounded-lg bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20 p-3">
                    <p className="text-[10px] font-semibold text-violet-800 dark:text-violet-300 uppercase tracking-wide mb-1">
                      Selected Group
                    </p>
                    <p className="text-[12px] font-medium text-violet-900 dark:text-violet-200">
                      {selectedGroup
                        ? groups.find(g => g.id === selectedGroup)?.name || "Unknown"
                        : "None (will use ARSEN default)"}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 p-3">
                    <p className="text-[10px] font-semibold text-emerald-800 dark:text-emerald-300 uppercase tracking-wide mb-1">
                      Selected ARSEN
                    </p>
                    <p className="text-[12px] font-medium text-emerald-900 dark:text-emerald-200">
                      {selectedArsen
                        ? arsens.find(a => a.id === selectedArsen)?.name || "Unknown"
                        : "None"}
                    </p>
                  </div>
                  <div className="rounded-lg bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20 p-3">
                    <p className="text-[10px] font-semibold text-violet-800 dark:text-violet-300 uppercase tracking-wide mb-1">
                      Selected Group
                    </p>
                    <p className="text-[12px] font-medium text-violet-900 dark:text-violet-200">
                      {selectedGroup
                        ? groups.find(g => g.id === selectedGroup)?.name || "Unknown"
                        : "None"}
                    </p>
                  </div>
                  <div className="rounded-lg bg-sky-50 dark:bg-sky-500/10 border border-sky-200 dark:border-sky-500/20 p-3">
                    <p className="text-[10px] font-semibold text-sky-800 dark:text-sky-300 uppercase tracking-wide mb-1">
                      Selected Squadron
                    </p>
                    <p className="text-[12px] font-medium text-sky-900 dark:text-sky-200">
                      {selectedSquadron
                        ? squadrons.find(s => s.id === selectedSquadron)?.name || "Unknown"
                        : "None"}
                    </p>
                  </div>
                </div>
              )}

              {/* Sheet Names */}
              {sheetNames.length > 0 && (
                <div className="rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 p-3">
                  <p className="text-[10px] font-semibold text-blue-800 dark:text-blue-300 uppercase tracking-wide mb-2">
                    {uploadType === UPLOAD_TYPES.POSITION
                      ? `Sheets/Squadrons Found (${sheetNames.length})`
                      : `Sheet Found (${sheetNames.length})`}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {sheetNames.map((name, idx) => (
                      <span
                        key={idx}
                        className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-medium",
                          idx === 0
                            ? "bg-blue-500 text-white"
                            : "bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-300"
                        )}
                      >
                        {uploadType === UPLOAD_TYPES.POSITION
                          ? (idx === 0 ? "🏢 " : "🛩️ ")
                          : "📋 "}
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Preview Data Table */}
              <div>
                <h3 className="text-[10px] font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wide mb-2">
                  Preview (First 3 Records from First Sheet)
                </h3>
                <div className="border border-neutral-200 dark:border-neutral-700 rounded-lg overflow-x-auto">
                  {uploadType === UPLOAD_TYPES.POSITION ? (
                    <table className="w-full text-[11px]">
                      <thead className="bg-neutral-50 dark:bg-neutral-800">
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold text-neutral-600 dark:text-neutral-400">Position</th>
                          <th className="px-3 py-2 text-left font-semibold text-neutral-600 dark:text-neutral-400">Name</th>
                          <th className="px-3 py-2 text-left font-semibold text-neutral-600 dark:text-neutral-400">Parsed Rank</th>
                          <th className="px-3 py-2 text-left font-semibold text-neutral-600 dark:text-neutral-400">Service #</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                        {previewData.map((item, idx) => (
                          <tr key={idx} className="bg-white dark:bg-neutral-900">
                            <td className="px-3 py-2 text-neutral-800 dark:text-neutral-200">{item.data.position}</td>
                            <td className="px-3 py-2 text-neutral-800 dark:text-neutral-200">{item.data.name}</td>
                            <td className="px-3 py-2 text-neutral-800 dark:text-neutral-200">{item.data.parsedRank}</td>
                            <td className="px-3 py-2 text-neutral-800 dark:text-neutral-200">{item.data.parsedServiceNumber}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <table className="w-full text-[11px]">
                      <thead className="bg-neutral-50 dark:bg-neutral-800">
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold text-neutral-600 dark:text-neutral-400">Fullname</th>
                          <th className="px-3 py-2 text-left font-semibold text-neutral-600 dark:text-neutral-400">Rank</th>
                          <th className="px-3 py-2 text-left font-semibold text-neutral-600 dark:text-neutral-400">AFPSN</th>
                          <th className="px-3 py-2 text-left font-semibold text-neutral-600 dark:text-neutral-400">Date of Birth</th>
                          <th className="px-3 py-2 text-left font-semibold text-neutral-600 dark:text-neutral-400">Date Enlisted</th>
                          <th className="px-3 py-2 text-left font-semibold text-neutral-600 dark:text-neutral-400">Source of Commission</th>
                          <th className="px-3 py-2 text-left font-semibold text-neutral-600 dark:text-neutral-400">Highest Education</th>
                          <th className="px-3 py-2 text-left font-semibold text-neutral-600 dark:text-neutral-400">Basic Training</th>
                          <th className="px-3 py-2 text-left font-semibold text-neutral-600 dark:text-neutral-400">Occupation</th>
                          <th className="px-3 py-2 text-left font-semibold text-neutral-600 dark:text-neutral-400">Sex</th>
                          <th className="px-3 py-2 text-left font-semibold text-neutral-600 dark:text-neutral-400">Contact</th>
                          <th className="px-3 py-2 text-left font-semibold text-neutral-600 dark:text-neutral-400">Email</th>
                          <th className="px-3 py-2 text-left font-semibold text-neutral-600 dark:text-neutral-400">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                        {previewData.map((item, idx) => (
                          <tr key={idx} className="bg-white dark:bg-neutral-900">
                            <td className="px-3 py-2 text-neutral-800 dark:text-neutral-200 whitespace-nowrap">{item.data.fullname}</td>
                            <td className="px-3 py-2 text-neutral-800 dark:text-neutral-200 whitespace-nowrap">{item.data.rank}</td>
                            <td className="px-3 py-2 text-neutral-800 dark:text-neutral-200 whitespace-nowrap">{item.data.afpsn}</td>
                            <td className="px-3 py-2 text-neutral-800 dark:text-neutral-200 whitespace-nowrap">{item.data.dateOfBirth}</td>
                            <td className="px-3 py-2 text-neutral-800 dark:text-neutral-200 whitespace-nowrap">{item.data.dateEnlisted}</td>
                            <td className="px-3 py-2 text-neutral-800 dark:text-neutral-200 whitespace-nowrap">{item.data.sourceOfCommission}</td>
                            <td className="px-3 py-2 text-neutral-800 dark:text-neutral-200 whitespace-nowrap">{item.data.highestEducation}</td>
                            <td className="px-3 py-2 text-neutral-800 dark:text-neutral-200 whitespace-nowrap">{item.data.basicTraining}</td>
                            <td className="px-3 py-2 text-neutral-800 dark:text-neutral-200 whitespace-nowrap">{item.data.occupation}</td>
                            <td className="px-3 py-2 text-neutral-800 dark:text-neutral-200 whitespace-nowrap">{item.data.sex}</td>
                            <td className="px-3 py-2 text-neutral-800 dark:text-neutral-200 whitespace-nowrap">{item.data.contactNumber}</td>
                            <td className="px-3 py-2 text-neutral-800 dark:text-neutral-200 whitespace-nowrap">{item.data.email}</td>
                            <td className="px-3 py-2 text-neutral-800 dark:text-neutral-200 whitespace-nowrap">{item.data.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              {parseError && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
                  <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] text-amber-700 dark:text-amber-300">{parseError}</p>
                </div>
              )}

              {error && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
                  <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] text-red-700 dark:text-red-300">{error}</p>
                </div>
              )}
            </>
          )}

          {stage === "uploading" && (
            <div className="text-center py-8">
              <div className="flex items-center justify-center mb-4">
                <Loader className="w-8 h-8 text-indigo-600 dark:text-indigo-400 animate-spin" />
              </div>
              <p className="text-sm text-neutral-700 dark:text-neutral-300 mb-3">
                Uploading and processing your Excel file...
              </p>
              <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2 max-w-xs mx-auto">
                <div
                  className="bg-indigo-600 dark:bg-indigo-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {stage === "success" && (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400 mx-auto mb-3" />
              <p className="text-sm text-neutral-700 dark:text-neutral-300">{successMessage}</p>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">
                The modal will close automatically...
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        {(stage === "upload" || stage === "preview") && (
          <div className="flex items-center justify-between gap-2 border-t border-neutral-100 dark:border-neutral-800 px-6 py-4">
            <div className="flex gap-2">
              {stage === "preview" && (
                <button
                  onClick={() => setStage("upload")}
                  disabled={loading}
                  className={cn(
                    "flex items-center gap-1 rounded-lg border px-3 py-1.5 text-[11px] font-medium",
                    "border-neutral-200 dark:border-neutral-700",
                    "text-neutral-600 dark:text-neutral-400",
                    "hover:bg-neutral-50 dark:hover:bg-neutral-800",
                    "transition-colors duration-150",
                    loading && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <ChevronLeft className="w-3 h-3" />
                  Back
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleClose}
                disabled={loading}
                className={cn(
                  "rounded-lg border px-4 py-1.5 text-[11px] font-medium",
                  "border-neutral-200 dark:border-neutral-700",
                  "bg-white dark:bg-neutral-900",
                  "text-neutral-600 dark:text-neutral-400",
                  "hover:bg-neutral-50 dark:hover:bg-neutral-800",
                  "transition-colors duration-150",
                  loading && "opacity-50 cursor-not-allowed"
                )}
              >
                Cancel
              </button>
              {stage === "upload" && (
                <button
                  onClick={() => file && setStage("preview")}
                  disabled={!file || loading || (uploadType === UPLOAD_TYPES.POSITION && !selectedArsen) || (uploadType === UPLOAD_TYPES.RESERVIST_INFO && (!selectedArsen || !selectedGroup || !selectedSquadron))}
                  className={cn(
                    "flex items-center gap-1 rounded-lg px-4 py-1.5 text-[11px] font-semibold",
                    "bg-indigo-600 text-white",
                    "hover:bg-indigo-700 active:bg-indigo-800",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    "transition-all duration-150"
                  )}
                >
                  Next
                  <ChevronRight className="w-3 h-3" />
                </button>
              )}
              {stage === "preview" && (
                <button
                  onClick={handleUpload}
                  disabled={loading}
                  className={cn(
                    "flex items-center gap-1 rounded-lg px-4 py-1.5 text-[11px] font-semibold",
                    "bg-indigo-600 text-white",
                    "hover:bg-indigo-700 active:bg-indigo-800",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    "transition-all duration-150"
                  )}
                >
                  {loading ? (
                    <>
                      <Loader className="w-3 h-3 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    "Upload"
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
