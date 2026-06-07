// ── Mock data — replace with real API calls later ─────────────

export const kpiData = [
  {
    id: "total-reservists",
    label: "Total Reservists",
    value: "2,846",
    sub: "100% of Total",
    icon: "Users",
    trend: null,
    color: "blue",
  },
  {
    id: "active-reservists",
    label: "Active Reservists",
    value: "1,732",
    sub: "60.9% of Total",
    icon: "UserCheck",
    trend: null,
    color: "emerald",
  },
  {
    id: "readiness-score",
    label: "Avg Readiness Score",
    value: "78.4%",
    sub: "▲ 6.3% vs last month",
    icon: "ShieldCheck",
    trend: "up",
    color: "indigo",
  },
  {
    id: "trainings",
    label: "Total Trainings Conducted",
    value: "156",
    sub: "▼ 18 vs last month",
    icon: "GraduationCap",
    trend: "down",
    color: "amber",
  },
  {
    id: "attendance-rate",
    label: "Avg Attendance Rate",
    value: "86.7%",
    sub: "▼ 4.8% vs last month",
    icon: "ClipboardCheck",
    trend: "down",
    color: "orange",
  },
  {
    id: "lowest-performing",
    label: "Lowest Performing Area",
    value: "Surigao",
    sub: "Readiness: 56.2%",
    icon: "AlertTriangle",
    trend: "warn",
    color: "red",
  },
];

export const forceDistributionData = [
  { area: "Surigao",    total: 548, active: 288, standby: 254 },
  { area: "Butuan",     total: 621, active: 384, standby: 237 },
  { area: "Tandag",     total: 208, active: 100, standby: 108 },
  { area: "Bayugan",    total: 276, active: 172, standby: 104 },
  { area: "Cabadbaran", total: 449, active: 164, standby: 140 },
  { area: "Others",     total: 677, active: 440, standby: 237 },
];

export const trainingActivityData = [
  { area: "Butuan",     trainings: 36 },
  { area: "Surigao",    trainings: 26 },
  { area: "Tandag",     trainings: 20 },
  { area: "Bayugan",    trainings: 16 },
  { area: "Cabadbaran",       trainings: 16 },
  { area: "Others",     trainings: 10 },
];

export const topGroupsData = [
  { group: "TCG10",              trainings: 62 },
  { group: "Butuan Airbase",     trainings: 28 },
  { group: "Surigao Airbase",    trainings: 24 },
  { group: "Tandag Detachment",  trainings: 18 },
  { group: "Bayugan Detachment", trainings: 12 },
  { group: "Others",             trainings: 12 },
];

export const attendanceTimelineData = [
  { date: "May 1",  rate: 88 },
  { date: "May 8",  rate: 84 },
  { date: "May 15", rate: 91 },
  { date: "May 22", rate: 86 },
  { date: "May 29", rate: 83 },
];

export const attendanceByAreaData = [
  { area: "Butuan",     rate: 92.7 },
  { area: "Bayugan",    rate: 88.7 },
  { area: "Tandag",     rate: 86.2 },
  { area: "Cabadbaran", rate: 84.5 },
  { area: "Others",     rate: 82.8 },
  { area: "Surigao",    rate: 60.3 },
];

export const readinessRankingData = [
  { area: "Butuan",     score: 86.5 },
  { area: "Bayugan",    score: 81.7 },
  { area: "Tandag",     score: 76.9 },
  { area: "Cabadbaran", score: 72.4 },
  { area: "Others",     score: 68.3 },
  { area: "Surigao",    score: 56.2 },
];

export const readinessCompositionData = [
  { name: "Training Participation", value: 40, color: "#6366f1" },
  { name: "Attendance Rate",        value: 30, color: "#10b981" },
  { name: "Active Status Weight",   value: 30, color: "#f59e0b" },
];

export const professionData = [
  { name: "Security Personnel", pct: 38.8 },
  { name: "Engineering",        pct: 22.3 },
  { name: "IT / Communications",pct: 15.6 },
  { name: "Medical / Health",   pct: 12.4 },
  { name: "Administrative",     pct: 9.7  },
  { name: "Others",             pct: 11.2 },
];

export const rankData = [
  { rank: "Private",          count: 1125 },
  { rank: "Corporal",         count: 684  },
  { rank: "Sergeant",         count: 512  },
  { rank: "Staff Sergeant",   count: 276  },
  { rank: "Technical Sergeant",count: 154 },
  { rank: "Others",           count: 95   },
];

export const lowPerformingAreas = [
  { area: "Surigao",    readiness: 56.2, attendance: 60.3, trainings: 1.2, flag: "critical" },
  { area: "Cabadbaran", readiness: 72.4, attendance: 84.5, trainings: 2.1, flag: "warning"  },
  { area: "Others",     readiness: 68.3, attendance: 82.8, trainings: 1.8, flag: "warning"  },
];

export const alertsData = [
  { id: 1, message: "Area Surigao has low readiness score (56.2%). Recommend additional training and support.", time: "Just now", type: "critical" },
  { id: 2, message: "Butuan Airbase conducted the most trainings (48) this month.", time: "1h ago", type: "info" },
  { id: 3, message: "125 reservists have not attended any training in the last 90 days.", time: "2h ago", type: "warning" },
  { id: 4, message: "Supply request from Tandag Detachment is pending approval.", time: "3h ago", type: "warning" },
];

export const filterOptions = {
  dateRanges: [
    "May 1 – May 31, 2025",
    "Apr 1 – Apr 30, 2025",
    "Q1 2025",
    "Q2 2025",
    "Year to Date",
  ],
  groups: ["All Groups", "TCG10", "Butuan Airbase", "Surigao Airbase", "Tandag Detachment", "Bayugan Detachment"],
  areas:  ["All Areas", "Butuan", "Surigao", "Tandag", "Bayugan", "Cabadbaran"],
  statuses: ["All Status", "Active", "Standby", "Inactive"],
  reservistStatuses: ["All Reservist Status", "BCMT", "ADT", "VADT", "ROTC", "Others"],
};
