const bcrypt = require('bcryptjs');
const { db, isMongo, connectDatabase } = require('./db');
const { UserRepository, ProblemRepository, ChallengeRepository, SolutionRepository } = require('../models/schema');
const { User } = require('../models/mongoModels');

async function seedDatabase() {
  console.log('Checking ProblemBridge AI database seeding...');

  // Ensure DB is connected
  await connectDatabase();

  let existingUsers = 0;
  if (isMongo()) {
    existingUsers = await User.countDocuments();
  } else {
    existingUsers = db.prepare('SELECT COUNT(*) AS count FROM users').get().count;
  }

  if (existingUsers > 0) {
    console.log(`Database already has records (${isMongo() ? 'MongoDB' : 'SQLite'}). Skipping initial seeding.`);
    return;
  }

  const defaultPasswordHash = await bcrypt.hash('password123', 10);

  // 2. Seed Users
  const citizen = await UserRepository.createUser({
    id: 'usr_citizen_01',
    fullName: 'Priya Sharma',
    email: 'citizen@problembridge.test',
    passwordHash: defaultPasswordHash,
    role: 'Citizen',
    mobileNumber: '+91 98765 43210'
  });

  const innovator = await UserRepository.createUser({
    id: 'usr_innovator_01',
    fullName: 'Rahul Verma',
    email: 'innovator@problembridge.test',
    passwordHash: defaultPasswordHash,
    role: 'Student / Innovator',
    mobileNumber: '+91 91234 56789'
  });

  const authority = await UserRepository.createUser({
    id: 'usr_authority_01',
    fullName: 'Dr. K. Srinivas (GHMC Officer)',
    email: 'authority@ghmc.gov.in',
    passwordHash: defaultPasswordHash,
    role: 'Authority / Organization',
    mobileNumber: '+91 99887 76655'
  });

  const admin = await UserRepository.createUser({
    id: 'usr_admin_01',
    fullName: 'Administrator',
    email: 'admin@problembridge.test',
    passwordHash: defaultPasswordHash,
    role: 'Admin / Reviewer',
    mobileNumber: '+91 90000 00001'
  });

  console.log('Users seeded: Citizen, Innovator, Authority, Admin');

  // 3. Seed Problems
  const problemHospital = await ProblemRepository.createProblem({
    id: 'prb_hospital_01',
    title: 'Difficulty Finding Available Hospital Beds',
    description: 'People in my area face difficulty finding real-time information about available hospital beds. Patients and their families have to contact multiple hospitals, which wastes time during emergencies.',
    category: 'Healthcare',
    location: 'Hyderabad',
    evidenceUrl: '',
    contact: 'priya.sharma@example.com',
    authorId: citizen.id,
    authorName: citizen.fullName,
    route: 'innovation',
    urgency: 'HIGH',
    score: 88,
    duplicate: false,
    recurring: true,
    similarReports: 47,
    assignedAuthority: 'District Health & Medical Services Office',
    recommendation: 'The problem affects access to essential healthcare services and appears to need a new technology, system, or process rather than a single repair.',
    peopleAffected: 'Thousands across the region',
    innovationPotential: 'HIGH',
    rootCauses: [
      'Lack of centralized real-time resource discovery across public and private facilities',
      'Fragmented emergency communication channels leading to critical delays',
      'Absence of automated bed and ICU occupancy telemetry',
      'High concentration of patient flow toward specific tertiary care hospitals'
    ],
    techSuggestions: [
      'Web Technologies (React / Node.js)',
      'Cloud Database (MongoDB / PostgreSQL)',
      'Real-time WebSockets / Push Notifications',
      'Mobile App Development (React Native / Flutter)',
      'Artificial Intelligence & Predictive Analytics'
    ],
    authorityStatus: 'Forwarded to Concerned Authority',
    citizenVerification: '',
    supportCount: 47
  });

  const problemDrainage = await ProblemRepository.createProblem({
    id: 'prb_drainage_01',
    title: 'Severe Drainage Blockage and Water Logging on Main Market Road',
    description: 'The underground stormwater drain overflows after every heavy rain, submerging pedestrian walkways and flooding small vendor shops with wastewater.',
    category: 'Public Infrastructure',
    location: 'Ameerpet Market, Hyderabad',
    evidenceUrl: '',
    contact: '',
    authorId: citizen.id,
    authorName: citizen.fullName,
    route: 'dual',
    urgency: 'CRITICAL',
    score: 86,
    duplicate: false,
    recurring: true,
    similarReports: 247,
    assignedAuthority: 'Greater Hyderabad Municipal Corporation (GHMC)',
    recommendation: 'This urgent operational issue is being sent to GHMC for emergency desilting, while the recurring pattern across 3 wards is framed as an IoT Smart Drainage monitoring challenge.',
    peopleAffected: 'Residents, vendors and commuters in Ameerpet area',
    innovationPotential: 'HIGH',
    rootCauses: [
      'Accumulation of unsegregated plastic waste obstructing drain choke points',
      'Insufficient gradient in legacy storm drain pipelines',
      'Absence of early warning water-level telemetry sensors'
    ],
    techSuggestions: [
      'IoT Sensor Telemetry (Ultrasonic water level sensors)',
      'Microcontroller Hardware (ESP32 / LoRaWAN)',
      'GIS Mapping & Municipal Alert Dashboard'
    ],
    authorityStatus: 'Resolution in Progress',
    citizenVerification: '',
    supportCount: 247
  });

  // 4. Seed Challenges
  const challenges = [
    {
      id: 'hospital',
      problemId: problemHospital.id,
      title: 'Real-Time Hospital Resource Availability System',
      category: 'Healthcare Technology',
      problem: 'People struggle to find real-time information about hospital bed availability during emergencies.',
      challengeQuestion: 'How can a technology-based system provide patients and healthcare providers with real-time information about hospital bed and critical resource availability?',
      skills: ['Web Development', 'Mobile Development', 'Database', 'AI', 'Cloud Computing'],
      expectedImpact: 'Faster access to hospital information and reduced delays during emergencies.',
      watchersCount: 24,
      featured: true
    },
    {
      id: 'irrigation',
      problemId: null,
      title: 'Smart Irrigation System',
      category: 'Agriculture',
      problem: 'Farmers do not always know when crops require irrigation.',
      challengeQuestion: 'How can IoT sensors and mobile apps guide farmers on optimal watering schedules to conserve groundwater and maximize yield?',
      skills: ['IoT', 'AI', 'Mobile App Development', 'Embedded Hardware'],
      expectedImpact: '30-40% water conservation and improved crop yield for dryland farmers.',
      watchersCount: 19,
      featured: false
    },
    {
      id: 'flood',
      problemId: null,
      title: 'Flood Early Warning System',
      category: 'Public Safety',
      problem: 'Communities do not receive timely warnings when water levels rise in canals and reservoirs.',
      challengeQuestion: 'How can an automated sensor network detect rising water levels and issue localized voice and SMS alerts to vulnerable settlements?',
      skills: ['IoT', 'Sensors', 'Software Development', 'Data Analytics'],
      expectedImpact: 'Timely evacuation and asset protection for flood-prone riverbank settlements.',
      watchersCount: 31,
      featured: false
    },
    {
      id: 'orders',
      problemId: null,
      title: 'Simple Business Order Management',
      category: 'Software',
      problem: 'Small local businesses find existing enterprise order management systems overly complicated.',
      challengeQuestion: 'How can an intuitive, mobile-first inventory and order tracker simplify daily sales for micro-retailers without training?',
      skills: ['Web Development', 'Database', 'UX Design', 'PWA'],
      expectedImpact: 'Save micro-merchants hours daily and reduce lost order incidents.',
      watchersCount: 14,
      featured: false
    }
  ];

  for (const c of challenges) {
    await ChallengeRepository.createChallenge(c);
  }
  console.log('Challenges seeded: 4 challenges created.');

  // 5. Seed Solution for Hospital
  await SolutionRepository.createSolution({
    id: 'sol_hospitalconnect_01',
    challengeId: 'hospital',
    problemId: problemHospital.id,
    authorId: innovator.id,
    authorName: innovator.fullName,
    title: 'HospitalConnect',
    description: 'A web and mobile platform that allows hospitals to update bed availability in real time and enables patients to search nearby hospitals by emergency acuity, ICU capacity, and insurance empanelment.',
    technology: 'React, Node.js, Express, MongoDB, WebSocket API',
    team: 'Team Lifeline (Rahul Verma, Ananya Sen)',
    impact: 'A faster, calmer way for families to find care when every minute matters. Reduces emergency admission turnaround from 45 minutes to 8 minutes.',
    status: 'Ready for Review',
    websiteUrl: 'https://hospitalconnect.example',
    sourceCodeUrl: 'https://github.com/example/hospital-connect',
    demoUrl: 'https://youtube.com/watch?v=demo-hospital-connect',
    evidenceFiles: ['architecture_diagram.pdf', 'user_flow_mockup.png']
  });

  console.log(`ProblemBridge AI database (${isMongo() ? 'MongoDB' : 'SQLite'}) seeding completed successfully!`);
}

if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Failed to seed database:', err);
      process.exit(1);
    });
}

module.exports = { seedDatabase };
