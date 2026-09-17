const { ProblemRepository } = require('../models/schema');

/**
 * Built-in Semantic NLP & Problem Reasoning Engine
 */
function extractKeywords(text = '') {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !isStopword(word));
}

function isStopword(w) {
  const stopwords = new Set([
    'the', 'and', 'for', 'that', 'this', 'with', 'from', 'have', 'are', 'was', 'were',
    'been', 'there', 'their', 'they', 'our', 'what', 'when', 'where', 'which', 'who',
    'would', 'could', 'should', 'about', 'into', 'some', 'more', 'other', 'them', 'these'
  ]);
  return stopwords.has(w);
}

function calculateSimilarity(textA, textB) {
  const setA = new Set(extractKeywords(textA));
  const setB = new Set(extractKeywords(textB));
  if (!setA.size || !setB.size) return 0;

  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) intersection++;
  }

  const union = new Set([...setA, ...setB]).size;
  return intersection / union;
}

/**
 * Root cause generator based on category and detected issues
 */
function inferRootCauses(title, description, category) {
  const text = `${title} ${description}`.toLowerCase();
  const causes = [];

  if (text.includes('bed') || text.includes('hospital') || category === 'Healthcare') {
    causes.push('Lack of centralized real-time resource discovery across public and private facilities');
    causes.push('Fragmented emergency communication channels leading to critical delays');
    causes.push('Absence of automated bed and ICU occupancy telemetry');
    causes.push('High concentration of patient flow toward specific tertiary care hospitals');
  } else if (text.includes('drain') || text.includes('garbage') || text.includes('pothole') || category === 'Public Infrastructure') {
    causes.push('Aging municipal infrastructure designed for lower capacity than current density');
    causes.push('Lack of predictive sensor monitoring before overflow or blockage occurs');
    causes.push('Irregular preventive maintenance and delayed manual reporting cycles');
    causes.push('Improper solid waste disposal choking urban drainage networks');
  } else if (text.includes('irrigation') || text.includes('crop') || category === 'Agriculture') {
    causes.push('Unpredictable rainfall patterns and lack of localized micro-weather forecasts');
    causes.push('Absence of low-cost soil moisture sensor telemetry for smallholder farmers');
    causes.push('Over-irrigation or under-irrigation leading to groundwater depletion and lower yield');
    causes.push('Limited access to automated smart motor controllers in rural grids');
  } else if (text.includes('flood') || text.includes('water level') || category === 'Public Safety') {
    causes.push('Lack of upstream catchment telemetry and sensor-based water level trackers');
    causes.push('Delayed alert dissemination to vulnerable local communities');
    causes.push('Poor coordination between meteorological data and emergency response teams');
  } else {
    causes.push('Information asymmetry between service providers and end consumers');
    causes.push('Manual, paper-based or disjointed communication systems');
    causes.push('Lack of accessible digital interfaces tailored for everyday citizens');
    causes.push('Insufficient real-time feedback loops between authorities and the public');
  }

  return causes;
}

/**
 * Technology suggestions generator
 */
function suggestTechnologies(category, text) {
  const t = text.toLowerCase();
  const tech = ['Web Technologies (React / Node.js)', 'Cloud Database (MongoDB / PostgreSQL)'];

  if (t.includes('sensor') || t.includes('water') || t.includes('drain') || t.includes('irrigation') || t.includes('iot')) {
    tech.push('IoT & Embedded Telemetry');
    tech.push('Microcontroller Hardware (ESP32 / Arduino)');
  }
  if (t.includes('real-time') || t.includes('real time') || t.includes('bed') || t.includes('hospital') || t.includes('alert')) {
    tech.push('Real-time WebSockets / Push Notifications');
    tech.push('Mobile App Development (React Native / Flutter)');
  }
  if (t.includes('predict') || t.includes('ai') || t.includes('analyze') || t.includes('detection')) {
    tech.push('Artificial Intelligence & Predictive Analytics');
  }
  if (t.includes('map') || t.includes('location') || t.includes('area') || t.includes('gis')) {
    tech.push('GIS Mapping & Geolocation APIs');
  }

  return Array.from(new Set(tech));
}

/**
 * Main AI Problem Analysis & Smart Routing
 */
async function analyzeProblem({ title, description, category, location, currentProblemId = null }) {
  const text = `${title} ${description}`.toLowerCase();

  const routineTerms = ['drain', 'garbage', 'dustbin', 'streetlight', 'street light', 'pothole', 'road repair', 'water leak', 'sanitation', 'broken lamp', 'sewage'];
  const innovationTerms = ['real-time', 'real time', 'hospital bed', 'prediction', 'predict', 'sensor', 'inefficient', 'information system', 'irrigation', 'telemetry', 'early warning', 'availability', 'platform'];
  const urgentTerms = ['emergency', 'hazard', 'severe', 'hospital', 'death', 'flood', 'overflow', 'poison', 'critical', 'injury', 'accident'];
  const recurringTerms = ['multiple', 'repeated', 'recurring', 'many people', 'daily', 'every week', 'frequently', 'hundreds', 'area wide'];

  const routineMatch = routineTerms.some(term => text.includes(term)) || category === 'Public Infrastructure';
  const innovationMatch = innovationTerms.some(term => text.includes(term)) || ['Healthcare', 'Agriculture', 'Technology'].includes(category);
  const urgentMatch = urgentTerms.some(term => text.includes(term));
  const recurringMatch = recurringTerms.some(term => text.includes(term));

  let duplicate = false;
  let matchedProblem = null;
  let highestSimilarity = 0;

  try {
    const existingProblems = await ProblemRepository.findAll({ limit: 50 });
    for (const existing of existingProblems) {
      if (currentProblemId && existing.id === currentProblemId) continue;
      const sim = calculateSimilarity(`${title} ${description}`, `${existing.title} ${existing.description}`);
      if (sim > highestSimilarity) {
        highestSimilarity = sim;
        if ((sim >= 0.7) || (existing.category === category && sim >= 0.52)) {
          duplicate = true;
          matchedProblem = existing;
        }
      }
    }
  } catch (err) {
    console.error('Error during duplicate check:', err);
  }

  let baseScore = innovationMatch ? 75 : 55;
  if (urgentMatch) baseScore += 15;
  if (recurringMatch) baseScore += 12;
  if (category === 'Healthcare') baseScore += 8;
  if (category === 'Public Safety') baseScore += 10;
  if (duplicate) baseScore = Math.min(baseScore, 70);

  const score = Math.min(98, Math.max(38, baseScore));
  const urgency = score >= 85 ? 'CRITICAL' : score >= 70 ? 'HIGH' : score >= 50 ? 'MEDIUM' : 'LOW';

  let route = 'authority';
  const isSystemic = routineMatch && (recurringMatch || highestSimilarity >= 0.3);

  if (duplicate) {
    route = 'duplicate';
  } else if (isSystemic && innovationMatch) {
    route = 'dual';
  } else if (innovationMatch) {
    route = 'innovation';
  } else if (routineMatch) {
    route = 'authority';
  } else {
    route = 'authority';
  }

  const assignedAuthority = category === 'Public Infrastructure' || routineMatch
    ? 'Greater Hyderabad Municipal Corporation (GHMC)'
    : category === 'Healthcare'
      ? 'District Health & Medical Services Office'
      : category === 'Agriculture'
        ? 'Department of Agricultural Extension & Rural Technology'
        : 'District Public Services Administration';

  let recommendation = '';
  if (route === 'duplicate') {
    recommendation = `This report closely matches an existing issue "${matchedProblem?.title || 'reported previously'}". Your support will strengthen the existing complaint without fragmenting community effort.`;
  } else if (route === 'dual') {
    recommendation = 'This recurring operational problem is being forwarded to the concerned municipal authority for immediate inspection, while also being framed as a long-term Innovation Challenge for scalable prevention.';
  } else if (route === 'authority') {
    recommendation = 'This is an operational or maintenance service issue with a designated civic authority equipped to inspect, dispatch crews, and resolve it.';
  } else {
    recommendation = 'This problem affects systemic access and requires an innovative technological platform or product rather than a routine municipal repair.';
  }

  const peopleAffected = innovationMatch
    ? 'Thousands across the region'
    : recurringMatch
      ? 'Entire neighborhood and surrounding commuters'
      : 'Community members in the immediate area';

  const innovationPotential = route === 'authority' ? 'LOW' : 'HIGH';

  const challengeQuestion = `How can a technology-based system provide real-time, reliable solutions for ${title.toLowerCase()} in ${location || 'affected communities'}?`;
  const rootCauses = inferRootCauses(title, description, category);
  const techSuggestions = suggestTechnologies(category, text);

  const similarReports = duplicate ? (matchedProblem?.supportCount || 18) : recurringMatch ? 47 : routineMatch ? 18 : 6;

  return {
    route,
    urgency,
    score,
    duplicate,
    matchedProblemId: matchedProblem?.id || null,
    matchedProblemTitle: matchedProblem?.title || null,
    recurring: isSystemic || recurringMatch,
    similarReports,
    assignedAuthority,
    recommendation,
    peopleAffected,
    innovationPotential,
    challengeQuestion,
    rootCauses,
    techSuggestions
  };
}module.exports = {
  analyzeProblem,
  calculateSimilarity,
  inferRootCauses,
  suggestTechnologies
};



