import type { Challenge } from '@/types';

const FALLBACK = '/assets/jharkhand-community-hero.jpg';

const IMAGE_BY_TOPIC: Array<[RegExp, string]> = [
  [/water|drinking|hand ?pump|well|contaminat/i, 'photo-1723156716505-fefc66dfabc6'],
  [/street ?lights?|lighting/i, 'photo-1688124968558-974cf707348b'],
  [/road|pothole|crossing|bridge/i, 'photo-1786077219580-e9f3f27ed54b'],
  [/waste|garbage|rubbish|sanitation|litter/i, 'photo-1532996122724-e3c354a0b15b'],
  [/health|clinic|hospital|medical/i, 'photo-1576091160399-112ba8d25d1d'],
  [/agri|farm|crop|irrigation|livestock/i, 'photo-1500382017468-9049fed747ef'],
  [/education|school|classroom|student|teacher/i, 'photo-1509062522246-3755977927d7'],
  [/electric|power|solar|energy|grid/i, 'photo-1473341304170-971dccb5ac1e'],
  [/drain|flood|waterlog|monsoon/i, 'photo-1518837695005-2083093ee35b'],
  [/transport|bus|traffic|mobility/i, 'photo-1494783367193-149034c05e8f'],
  [/environment|forest|pollut|tree|wildlife/i, 'photo-1441974231531-c6227db76b6e'],
  [/housing|home|house|roof/i, 'photo-1518780664697-55e3ad937233'],
  [/safety|crime|unsafe|security/i, 'photo-1519608487953-e999c86e7455'],
];

function isImageUrl(url: string, type = '') {
  if (type.toLowerCase().startsWith('image/')) return true;
  try {
    const decoded = decodeURIComponent(url);
    return /\.(avif|gif|jpe?g|png|webp)(?:[?#]|$)/i.test(decoded);
  } catch {
    return /\.(avif|gif|jpe?g|png|webp)(?:[?#]|$)/i.test(url);
  }
}

function storageImage(problem: Challenge) {
  const evidence = Array.isArray(problem.evidence) ? problem.evidence : [];
  const evidenceUrls = Array.isArray(problem.evidence_urls) ? problem.evidence_urls : [];
  const candidates = [
    ...evidence.map((item: any) => typeof item === 'string'
      ? { url: item, type: '' }
      : { url: item?.url || item?.downloadURL || item?.downloadUrl || '', type: item?.type || item?.contentType || '' }),
    ...evidenceUrls.map(url => ({ url, type: 'image/*' })),
  ];
  const evidenceImage = candidates.find(candidate => candidate.url && isImageUrl(candidate.url, candidate.type));
  if (evidenceImage) return evidenceImage.url;
  return undefined;
}

export function getProblemFallbackImage(problem: Partial<Challenge>) {
  const primaryTopic = [
    problem.title,
    problem.ai_title,
    problem.subdomain,
    problem.ai_domain,
    problem.domain,
    ...(problem.tags || []),
  ].filter(Boolean).join(' ');
  const details = [
    problem.ai_issue_type,
    problem.description,
    problem.ai_description,
  ].filter(Boolean).join(' ');
  const match = IMAGE_BY_TOPIC.find(([pattern]) => pattern.test(primaryTopic))
    || IMAGE_BY_TOPIC.find(([pattern]) => pattern.test(details));
  return match
    ? `https://images.unsplash.com/${match[1]}?auto=format&fit=crop&w=1000&q=80`
    : FALLBACK;
}

export function getProblemImage(problem: Challenge) {
  return storageImage(problem) || getProblemFallbackImage(problem);
}