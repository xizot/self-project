import { FamilyMember, FamilyRelationship, Gender } from '@/lib/types';

/**
 * Vietnamese Kinship Calculator
 *
 * Correctly determines Vietnamese kinship terms based on:
 * - Generation gap (ancestor/descendant/same-gen/cross-gen)
 * - Gender of both persons
 * - Paternal (nội) vs maternal (ngoại) side from junior's perspective
 * - Elder/younger status compared with the connecting parent/sibling
 * - Regional dialect (Bắc/Trung/Nam)
 */

export type Region = 'bac' | 'trung' | 'nam';

interface MemberMap {
  [id: number]: FamilyMember;
}

interface AdjacencyList {
  children: number[];
  parents: number[];
  spouse: number | null;
}

interface Graph {
  [id: number]: AdjacencyList;
}

export interface KinshipResult {
  aCallsB: string;
  bCallsA: string;
  path: number[];
  lcaId: number | null;
  stepsA: number;
  stepsB: number;
  side: 'paternal' | 'maternal' | 'direct' | 'spouse' | 'in-law';
  description: string;
}

// ==================== Graph Building ====================

function buildGraph(
  members: FamilyMember[],
  relationships: FamilyRelationship[]
): { graph: Graph; memberMap: MemberMap } {
  const memberMap: MemberMap = {};
  const graph: Graph = {};

  for (const m of members) {
    memberMap[m.id] = m;
    graph[m.id] = { children: [], parents: [], spouse: null };
  }

  for (const rel of relationships) {
    if (!graph[rel.person_id] || !graph[rel.related_person_id]) continue;

    if (rel.relationship_type === 'parent_child') {
      graph[rel.person_id].children.push(rel.related_person_id);
      graph[rel.related_person_id].parents.push(rel.person_id);
    } else if (rel.relationship_type === 'spouse') {
      graph[rel.person_id].spouse = rel.related_person_id;
      graph[rel.related_person_id].spouse = rel.person_id;
    }
  }

  return { graph, memberMap };
}

// ==================== LCA Finding ====================

function getAncestors(
  personId: number,
  graph: Graph
): Map<number, { distance: number; path: number[] }> {
  const ancestors = new Map<number, { distance: number; path: number[] }>();
  const queue: Array<{ id: number; distance: number; path: number[] }> = [
    { id: personId, distance: 0, path: [personId] },
  ];

  ancestors.set(personId, { distance: 0, path: [personId] });

  while (queue.length > 0) {
    const current = queue.shift()!;
    const node = graph[current.id];
    if (!node) continue;

    for (const parentId of node.parents) {
      if (!ancestors.has(parentId)) {
        const newPath = [...current.path, parentId];
        ancestors.set(parentId, {
          distance: current.distance + 1,
          path: newPath,
        });
        queue.push({
          id: parentId,
          distance: current.distance + 1,
          path: newPath,
        });
      }
    }
  }

  return ancestors;
}

function findLCA(
  personAId: number,
  personBId: number,
  graph: Graph
): {
  lcaId: number | null;
  stepsA: number;
  stepsB: number;
  pathA: number[];
  pathB: number[];
} {
  const ancestorsA = getAncestors(personAId, graph);
  const ancestorsB = getAncestors(personBId, graph);

  let bestLca: number | null = null;
  let bestTotal = Infinity;
  let bestStepsA = 0;
  let bestStepsB = 0;
  let bestPathA: number[] = [];
  let bestPathB: number[] = [];

  for (const [ancestorId, infoA] of ancestorsA) {
    const infoB = ancestorsB.get(ancestorId);
    if (infoB) {
      const total = infoA.distance + infoB.distance;
      if (total < bestTotal) {
        bestTotal = total;
        bestLca = ancestorId;
        bestStepsA = infoA.distance;
        bestStepsB = infoB.distance;
        bestPathA = infoA.path;
        bestPathB = infoB.path;
      }
    }
  }

  return {
    lcaId: bestLca,
    stepsA: bestStepsA,
    stepsB: bestStepsB,
    pathA: bestPathA,
    pathB: bestPathB,
  };
}

// ==================== Helpers ====================

function determineSide(
  pathToLca: number[],
  memberMap: MemberMap
): 'paternal' | 'maternal' | 'direct' {
  if (pathToLca.length < 2) return 'direct';
  const firstParent = memberMap[pathToLca[1]];
  if (!firstParent) return 'direct';
  return firstParent.gender === 'male' ? 'paternal' : 'maternal';
}

function isElder(personA: FamilyMember, personB: FamilyMember): boolean {
  if (personA.birth_order != null && personB.birth_order != null) {
    return personA.birth_order < personB.birth_order;
  }
  if (personA.birth_date && personB.birth_date) {
    return personA.birth_date < personB.birth_date;
  }
  return true;
}

// ==================== Vietnamese Term Functions ====================

/** Cha/Mẹ theo vùng miền */
function parentTerm(gender: Gender, region: Region): string {
  if (gender === 'male') {
    return ({ bac: 'bố', trung: 'cha', nam: 'ba' } as const)[region];
  }
  return ({ bac: 'mẹ', trung: 'mạ', nam: 'má' } as const)[region];
}

/** Ông/Bà với nội/ngoại, Cụ/Kỵ/Tổ */
function ancestorTerm(
  gen: number,
  gender: Gender,
  side: 'paternal' | 'maternal' | 'direct'
): string {
  if (gen === 2) {
    const suffix =
      side === 'paternal' ? ' nội' : side === 'maternal' ? ' ngoại' : '';
    return (gender === 'male' ? 'ông' : 'bà') + suffix;
  }
  if (gen === 3) return gender === 'male' ? 'cụ ông' : 'cụ bà';
  if (gen === 4) return gender === 'male' ? 'kỵ ông' : 'kỵ bà';
  if (gen === 5) return gender === 'male' ? 'tổ ông' : 'tổ bà';
  return `tổ tiên đời ${gen}`;
}

/** Con trai/Con gái, Cháu, Chắt, Chút, Chít */
function descendantTerm(gen: number, gender: Gender): string {
  if (gen === 1) return gender === 'male' ? 'con trai' : 'con gái';
  if (gen === 2) return 'cháu';
  if (gen === 3) return 'chắt';
  if (gen === 4) return 'chút';
  if (gen === 5) return 'chít';
  return `hậu duệ đời ${gen}`;
}

/** Anh/Chị (người lớn hơn) */
function elderSiblingTerm(gender: Gender): string {
  return gender === 'male' ? 'anh' : 'chị';
}

/** Em trai/Em gái (người nhỏ hơn) */
function youngerSiblingTerm(gender: Gender): string {
  return gender === 'male' ? 'em trai' : 'em gái';
}

/**
 * Xưng hô chú/bác/cô/o/cậu/dì theo:
 * - Giới tính của người được gọi
 * - Bên nội (paternal) hay bên ngoại (maternal)
 * - Lớn hơn hay nhỏ hơn cha/mẹ (của người gọi)
 * - Vùng miền
 */
function uncleAuntTerm(
  gender: Gender,
  side: 'paternal' | 'maternal' | 'direct',
  elderThanParent: boolean,
  region: Region
): string {
  if (side === 'paternal' || side === 'direct') {
    // Bên nội
    if (elderThanParent) {
      // Anh/chị của cha lớn tuổi hơn cha → bác (mọi giới tính, mọi vùng)
      return 'bác';
    }
    // Em của cha
    if (gender === 'male') return 'chú';
    // Em gái của cha: cô (Bắc/Nam) / o (Trung)
    return ({ bac: 'cô', trung: 'o', nam: 'cô' } as const)[region];
  }
  // Bên ngoại
  if (gender === 'male') return 'cậu';
  return 'dì';
}

// ==================== Kinship Computation ====================

interface KinshipParams {
  stepsA: number;
  stepsB: number;
  personA: FamilyMember;
  personB: FamilyMember;
  sideFromJunior: 'paternal' | 'maternal' | 'direct';
  elderThanSibling: boolean;
  isAElderThanB: boolean;
  region: Region;
  parentContextId?: number; // id of parent whose sibling is being called
}

function computeKinship(params: KinshipParams): {
  aCallsB: string;
  bCallsA: string;
  description: string;
} {
  const {
    stepsA,
    stepsB,
    personA,
    personB,
    sideFromJunior,
    elderThanSibling,
    isAElderThanB,
    region,
    parentContextId,
  } = params;

  // Cùng một người
  if (stepsA === 0 && stepsB === 0) {
    return {
      aCallsB: 'chính mình',
      bCallsA: 'chính mình',
      description: 'Cùng một người',
    };
  }

  // === TRỰC HỆ: A là tổ tiên của B ===
  if (stepsA === 0) {
    const gen = stepsB;
    let aCallsB: string;
    let bCallsA: string;

    if (gen === 1) {
      aCallsB = descendantTerm(1, personB.gender);
      bCallsA = parentTerm(personA.gender, region);
    } else {
      aCallsB = descendantTerm(gen, personB.gender);
      bCallsA = ancestorTerm(gen, personA.gender, sideFromJunior);
    }

    return {
      aCallsB,
      bCallsA,
      description: `${bCallsA} - ${aCallsB} (${gen} đời)`,
    };
  }

  // === TRỰC HỆ: B là tổ tiên của A ===
  if (stepsB === 0) {
    const gen = stepsA;
    let aCallsB: string;
    let bCallsA: string;

    if (gen === 1) {
      aCallsB = parentTerm(personB.gender, region);
      bCallsA = descendantTerm(1, personA.gender);
    } else {
      aCallsB = ancestorTerm(gen, personB.gender, sideFromJunior);
      bCallsA = descendantTerm(gen, personA.gender);
    }

    return {
      aCallsB,
      bCallsA,
      description: `${aCallsB} - ${bCallsA} (${gen} đời)`,
    };
  }

  // === CÙNG THẾ HỆ ===
  if (stepsA === stepsB) {
    const isSibling = stepsA === 1;
    const suffix = isSibling ? '' : ' họ';

    // Nếu là anh/chị/em của cha hoặc mẹ
    if (isSibling && parentContextId) {
      // Xác định là anh/em của cha hay mẹ
      const parentGender =
        parentContextId &&
        parentContextId !== personA.id &&
        parentContextId !== personB.id
          ? personA.id === parentContextId
            ? personB.gender
            : personA.gender
          : undefined;
      // Nếu parent là mẹ => bên ngoại, cha => bên nội
      let side: 'paternal' | 'maternal' = 'paternal';
      if (parentContextId && parentGender) {
        side = parentGender === 'male' ? 'paternal' : 'maternal';
      }
      // Dùng uncleAuntTerm để gọi đúng
      if (isAElderThanB) {
        return {
          aCallsB: youngerSiblingTerm(personB.gender) + suffix,
          bCallsA: uncleAuntTerm(personA.gender, side, true, region),
          description: `Anh/chị/em của cha/mẹ`,
        };
      } else {
        return {
          aCallsB: uncleAuntTerm(personB.gender, side, true, region),
          bCallsA: youngerSiblingTerm(personA.gender) + suffix,
          description: `Anh/chị/em của cha/mẹ`,
        };
      }
    }

    if (isAElderThanB) {
      return {
        aCallsB: youngerSiblingTerm(personB.gender) + suffix,
        bCallsA: elderSiblingTerm(personA.gender) + suffix,
        description: isSibling
          ? 'Anh chị em ruột'
          : `Anh chị em họ (cách ${stepsA} đời)`,
      };
    } else {
      return {
        aCallsB: elderSiblingTerm(personB.gender) + suffix,
        bCallsA: youngerSiblingTerm(personA.gender) + suffix,
        description: isSibling
          ? 'Anh chị em ruột'
          : `Anh chị em họ (cách ${stepsA} đời)`,
      };
    }
  }

  // === KHÁC THẾ HỆ (chú/bác - cháu) ===
  if (stepsA < stepsB) {
    // A là bề trên (chú/bác/cô/cậu/dì), B là cháu
    const seniorTitle = buildUncleAuntTitle(
      personA.gender,
      sideFromJunior,
      elderThanSibling,
      stepsA,
      stepsB - stepsA,
      region
    );
    return {
      aCallsB: 'cháu',
      bCallsA: seniorTitle,
      description: `${seniorTitle} - cháu`,
    };
  } else {
    // B là bề trên, A là cháu
    const seniorTitle = buildUncleAuntTitle(
      personB.gender,
      sideFromJunior,
      elderThanSibling,
      stepsB,
      stepsA - stepsB,
      region
    );
    return {
      aCallsB: seniorTitle,
      bCallsA: 'cháu',
      description: `cháu - ${seniorTitle}`,
    };
  }
}

/**
 * Xây dựng cách gọi đầy đủ cho chú/bác/cô...
 * bao gồm tiền tố thế hệ (ông/bà/cụ) và hậu tố họ
 */
function buildUncleAuntTitle(
  gender: Gender,
  side: 'paternal' | 'maternal' | 'direct',
  elderThanSibling: boolean,
  seniorSteps: number,
  genDiff: number,
  region: Region
): string {
  let title = uncleAuntTerm(gender, side, elderThanSibling, region);

  // Anh chị em họ (không cùng cha mẹ với cha/mẹ)
  if (seniorSteps > 1) {
    title += ' họ';
  }

  // Cách nhiều thế hệ: thêm tiền tố
  if (genDiff >= 2) {
    if (genDiff === 2) {
      title = (gender === 'male' ? 'ông ' : 'bà ') + title;
    } else if (genDiff === 3) {
      title = 'cụ ' + title;
    } else {
      title = 'tổ ' + title;
    }
  }

  return title;
}

// ==================== Public API ====================

export function findRelationship(
  personAId: number,
  personBId: number,
  members: FamilyMember[],
  relationships: FamilyRelationship[],
  region: Region = 'bac'
): KinshipResult | null {
  const { graph, memberMap } = buildGraph(members, relationships);

  const personA = memberMap[personAId];
  const personB = memberMap[personBId];
  if (!personA || !personB) return null;

  // Vợ chồng
  if (graph[personAId]?.spouse === personBId) {
    return {
      aCallsB: personB.gender === 'male' ? 'chồng' : 'vợ',
      bCallsA: personA.gender === 'male' ? 'chồng' : 'vợ',
      path: [personAId, personBId],
      lcaId: null,
      stepsA: 0,
      stepsB: 0,
      side: 'spouse',
      description: 'Vợ chồng',
    };
  }

  // Tìm LCA
  const { lcaId, stepsA, stepsB, pathA, pathB } = findLCA(
    personAId,
    personBId,
    graph
  );

  if (lcaId === null) {
    // Chỉ gọi findInLawRelationship nếu KHÔNG có bất kỳ ancestor chung nào (tức là không cùng huyết thống)
    // Nếu có ancestor chung nhưng không phải cha mẹ, chú bác, dì cậu, anh chị em họ... thì KHÔNG gọi thông gia
    // Nếu không có ancestor chung, mới xét thông gia
    return findInLawRelationship(
      personAId,
      personBId,
      graph,
      memberMap,
      region
    );
  }

  // Nếu có LCA nhưng stepsA, stepsB đều lớn hơn 0, kiểm tra nếu không phải quan hệ huyết thống gần (tức là không phải ancestor/descendant/sibling/uncle/aunt/cousin)
  // Nếu stepsA > 3 && stepsB > 3 thì có thể là họ rất xa hoặc không nên gọi là thông gia
  // Tuy nhiên, các trường hợp như cháu gọi cậu phải được xử lý đúng ở computeKinship, không rơi vào thông gia

  // Xác định bên nội/ngoại từ góc nhìn của người thế hệ dưới
  let sideFromJunior: 'paternal' | 'maternal' | 'direct' = 'direct';
  if (stepsA === 0 && stepsB >= 2) {
    sideFromJunior = determineSide(pathB, memberMap);
  } else if (stepsB === 0 && stepsA >= 2) {
    sideFromJunior = determineSide(pathA, memberMap);
  } else if (stepsA > 0 && stepsB > 0) {
    // Người dưới (nhiều steps hơn) quyết định nội/ngoại
    sideFromJunior =
      stepsB >= stepsA
        ? determineSide(pathB, memberMap)
        : determineSide(pathA, memberMap);
  }

  // Xác định lớn/nhỏ hơn anh chị em kết nối (cho chú/bác)
  let elderThanSibling = true;
  let parentContextId: number | undefined = undefined;
  if (stepsA !== stepsB && stepsA > 0 && stepsB > 0) {
    if (stepsA < stepsB) {
      // A là bề trên, so sánh A với người cùng thế hệ trên đường B
      const correspondingId = pathB[stepsB - stepsA];
      const corresponding = memberMap[correspondingId];
      if (corresponding) elderThanSibling = isElder(personA, corresponding);
      // Nếu là anh/em của cha/mẹ thì lưu lại parentId
      if (stepsA === 1 && stepsB === 2)
        parentContextId = pathB[stepsB - stepsA + 1];
    } else {
      // B là bề trên
      const correspondingId = pathA[stepsA - stepsB];
      const corresponding = memberMap[correspondingId];
      if (corresponding) elderThanSibling = isElder(personB, corresponding);
      if (stepsB === 1 && stepsA === 2)
        parentContextId = pathA[stepsA - stepsB + 1];
    }
  }

  const isAElderThanB = isElder(personA, personB);

  // Đường đi: A → LCA → B (không mutate pathB)
  const fullPath = [...pathA, ...[...pathB].reverse().slice(1)];

  const kinship = computeKinship({
    stepsA,
    stepsB,
    personA,
    personB,
    sideFromJunior,
    elderThanSibling,
    isAElderThanB,
    region,
    parentContextId,
  });

  return {
    ...kinship,
    path: fullPath,
    lcaId,
    stepsA,
    stepsB,
    side: sideFromJunior,
  };
}

/**
 * Compute structural data (LCA, steps, side, elder) between two members
 */
function computeStructuralData(
  personAId: number,
  personBId: number,
  graph: Graph,
  memberMap: MemberMap
): {
  lcaId: number;
  stepsA: number;
  stepsB: number;
  pathA: number[];
  pathB: number[];
  sideFromJunior: 'paternal' | 'maternal' | 'direct';
  elderThanSibling: boolean;
  fullPath: number[];
} | null {
  const personA = memberMap[personAId];
  const personB = memberMap[personBId];
  if (!personA || !personB) return null;

  const { lcaId, stepsA, stepsB, pathA, pathB } = findLCA(
    personAId,
    personBId,
    graph
  );
  if (lcaId === null) return null;

  let sideFromJunior: 'paternal' | 'maternal' | 'direct' = 'direct';
  if (stepsA === 0 && stepsB >= 2) {
    sideFromJunior = determineSide(pathB, memberMap);
  } else if (stepsB === 0 && stepsA >= 2) {
    sideFromJunior = determineSide(pathA, memberMap);
  } else if (stepsA > 0 && stepsB > 0) {
    sideFromJunior =
      stepsB >= stepsA
        ? determineSide(pathB, memberMap)
        : determineSide(pathA, memberMap);
  }

  let elderThanSibling = true;
  if (stepsA !== stepsB && stepsA > 0 && stepsB > 0) {
    if (stepsA < stepsB) {
      const corresponding = memberMap[pathB[stepsB - stepsA]];
      if (corresponding) elderThanSibling = isElder(personA, corresponding);
    } else {
      const corresponding = memberMap[pathA[stepsA - stepsB]];
      if (corresponding) elderThanSibling = isElder(personB, corresponding);
    }
  }

  const fullPath = [...pathA, ...[...pathB].reverse().slice(1)];

  return {
    lcaId,
    stepsA,
    stepsB,
    pathA,
    pathB,
    sideFromJunior,
    elderThanSibling,
    fullPath,
  };
}

/**
 * Chuyển đổi cách gọi huyết thống → cách gọi qua hôn nhân (in-law)
 * - Bên huyết thống gọi in-law: con trai→con rể, con gái→con dâu, anh→anh rể, chị→chị dâu
 * - In-law gọi bên huyết thống: thêm hậu tố chồng/vợ (bố→bố vợ, mẹ→mẹ chồng)
 */
function toInLawDescendant(term: string, inLawGender: Gender): string {
  if (term === 'con trai' || term === 'con gái')
    return inLawGender === 'male' ? 'con rể' : 'con dâu';
  if (term === 'cháu') return inLawGender === 'male' ? 'cháu rể' : 'cháu dâu';
  if (term === 'chắt' || term === 'chút' || term === 'chít')
    return term + (inLawGender === 'male' ? ' rể' : ' dâu');
  if (
    term === 'anh' ||
    term === 'anh họ' ||
    term === 'chị' ||
    term === 'chị họ'
  )
    return inLawGender === 'male' ? 'anh rể' : 'chị dâu';
  if (term.startsWith('em')) return inLawGender === 'male' ? 'em rể' : 'em dâu';
  return term;
}

function transformInLawTerms(
  aCallsB: string,
  bCallsA: string,
  bridgeSpouseGender: Gender,
  inLawPersonGender: Gender,
  whichIsInLaw: 'a' | 'b'
): { aCallsB: string; bCallsA: string } {
  const suffix = bridgeSpouseGender === 'male' ? ' chồng' : ' vợ';

  if (whichIsInLaw === 'b') {
    // B là người dâu/rể, A là bên huyết thống
    return {
      aCallsB: toInLawDescendant(aCallsB, inLawPersonGender),
      bCallsA: bCallsA + suffix,
    };
  } else {
    // A là người dâu/rể, B là bên huyết thống
    return {
      aCallsB: aCallsB + suffix,
      bCallsA: toInLawDescendant(bCallsA, inLawPersonGender),
    };
  }
}

/**
 * Tìm quan hệ qua hôn nhân (in-law)
 */
function findInLawRelationship(
  personAId: number,
  personBId: number,
  graph: Graph,
  memberMap: MemberMap,
  region: Region
): KinshipResult | null {
  const personA = memberMap[personAId];
  const personB = memberMap[personBId];
  if (!personA || !personB) return null;

  // Case 1: Qua vợ/chồng của A (A là dâu/rể)
  const spouseA = graph[personAId]?.spouse;
  if (spouseA) {
    const structural = computeStructuralData(
      spouseA,
      personBId,
      graph,
      memberMap
    );
    if (structural) {
      const spouseAMember = memberMap[spouseA]!;
      const kinship = computeKinship({
        stepsA: structural.stepsA,
        stepsB: structural.stepsB,
        personA,
        personB,
        sideFromJunior: structural.sideFromJunior,
        elderThanSibling: structural.elderThanSibling,
        isAElderThanB: isElder(spouseAMember, personB),
        region,
      });
      const transformed = transformInLawTerms(
        kinship.aCallsB,
        kinship.bCallsA,
        spouseAMember.gender,
        personA.gender,
        'a'
      );
      return {
        aCallsB: transformed.aCallsB,
        bCallsA: transformed.bCallsA,
        path: [personAId, spouseA, ...structural.fullPath.slice(1)],
        lcaId: structural.lcaId,
        stepsA: structural.stepsA,
        stepsB: structural.stepsB,
        side: 'in-law',
        description: `${transformed.bCallsA} - ${transformed.aCallsB}`,
      };
    }
  }

  // Case 2: Qua vợ/chồng của B (B là dâu/rể)
  const spouseB = graph[personBId]?.spouse;
  if (spouseB) {
    const structural = computeStructuralData(
      personAId,
      spouseB,
      graph,
      memberMap
    );
    if (structural) {
      const spouseBMember = memberMap[spouseB]!;
      const kinship = computeKinship({
        stepsA: structural.stepsA,
        stepsB: structural.stepsB,
        personA,
        personB,
        sideFromJunior: structural.sideFromJunior,
        elderThanSibling: structural.elderThanSibling,
        isAElderThanB: isElder(personA, spouseBMember),
        region,
      });
      const transformed = transformInLawTerms(
        kinship.aCallsB,
        kinship.bCallsA,
        spouseBMember.gender,
        personB.gender,
        'b'
      );
      return {
        aCallsB: transformed.aCallsB,
        bCallsA: transformed.bCallsA,
        path: [...structural.fullPath.slice(0, -1), spouseB, personBId],
        lcaId: structural.lcaId,
        stepsA: structural.stepsA,
        stepsB: structural.stepsB,
        side: 'in-law',
        description: `${transformed.bCallsA} - ${transformed.aCallsB}`,
      };
    }
  }

  // Case 3: Thông gia - tìm cầu nối hôn nhân ở giữa
  // Duyệt mọi cặp vợ chồng (X, Y), nếu A có quan hệ huyết thống với X
  // và B có quan hệ huyết thống với Y thì A và B là thông gia
  let bestResult: KinshipResult | null = null;
  let bestTotal = Infinity;

  for (const memberId in graph) {
    const node = graph[memberId];
    if (!node.spouse) continue;

    const xId = parseInt(memberId);
    const yId = node.spouse;
    if (xId > yId) continue; // tránh xét trùng cặp

    // Thử A→X, B→Y
    const structAX = computeStructuralData(personAId, xId, graph, memberMap);
    const structBY = computeStructuralData(personBId, yId, graph, memberMap);
    if (structAX && structBY) {
      const total =
        structAX.stepsA + structAX.stepsB + structBY.stepsA + structBY.stepsB;
      if (total < bestTotal) {
        bestTotal = total;
        bestResult = buildThongGiaResult(
          personA,
          personB,
          xId,
          yId,
          structAX,
          structBY,
          memberMap
        );
      }
    }

    // Thử A→Y, B→X
    const structAY = computeStructuralData(personAId, yId, graph, memberMap);
    const structBX = computeStructuralData(personBId, xId, graph, memberMap);
    if (structAY && structBX) {
      const total =
        structAY.stepsA + structAY.stepsB + structBX.stepsA + structBX.stepsB;
      if (total < bestTotal) {
        bestTotal = total;
        bestResult = buildThongGiaResult(
          personA,
          personB,
          yId,
          xId,
          structAY,
          structBX,
          memberMap
        );
      }
    }
  }

  return bestResult;
}

/**
 * Xây dựng kết quả thông gia
 */
function buildThongGiaResult(
  personA: FamilyMember,
  personB: FamilyMember,
  bridgeAId: number,
  bridgeBId: number,
  structA: NonNullable<ReturnType<typeof computeStructuralData>>,
  structB: NonNullable<ReturnType<typeof computeStructuralData>>,
  memberMap: MemberMap
): KinshipResult {
  const bridgeA = memberMap[bridgeAId];
  const bridgeB = memberMap[bridgeBId];
  const bridgeAName = bridgeA?.full_name || 'N/A';
  const bridgeBName = bridgeB?.full_name || 'N/A';

  // Đường đi: A → ... → bridgeA ←spouse→ bridgeB → ... → B
  const pathA = structA.fullPath;
  const pathB = [...structB.fullPath].reverse(); // B...bridgeB → reverse to bridgeB...B

  const fullPath = [...pathA, ...pathB];

  return {
    aCallsB: 'thông gia',
    bCallsA: 'thông gia',
    path: fullPath,
    lcaId: null,
    stepsA: structA.stepsA + structA.stepsB,
    stepsB: structB.stepsA + structB.stepsB,
    side: 'in-law',
    description: `Thông gia (qua ${bridgeAName} và ${bridgeBName})`,
  };
}

/**
 * Tìm quan hệ trực tiếp (không qua hôn nhân, tránh đệ quy vô hạn)
 */
function findRelationshipDirect(
  personAId: number,
  personBId: number,
  graph: Graph,
  memberMap: MemberMap,
  region: Region
): KinshipResult | null {
  const personA = memberMap[personAId];
  const personB = memberMap[personBId];
  if (!personA || !personB) return null;

  const structural = computeStructuralData(
    personAId,
    personBId,
    graph,
    memberMap
  );
  if (!structural) return null;

  const kinship = computeKinship({
    stepsA: structural.stepsA,
    stepsB: structural.stepsB,
    personA,
    personB,
    sideFromJunior: structural.sideFromJunior,
    elderThanSibling: structural.elderThanSibling,
    isAElderThanB: isElder(personA, personB),
    region,
  });

  return {
    ...kinship,
    path: structural.fullPath,
    lcaId: structural.lcaId,
    stepsA: structural.stepsA,
    stepsB: structural.stepsB,
    side: structural.sideFromJunior,
  };
}

// ==================== Tree Building (for visualization) ====================

export function buildFamilyTree(
  members: FamilyMember[],
  relationships: FamilyRelationship[]
): {
  roots: FamilyMember[];
  childrenMap: Map<number, number[]>;
  spouseMap: Map<number, number>;
  parentMap: Map<number, number[]>;
} {
  const childrenMap = new Map<number, number[]>();
  const spouseMap = new Map<number, number>();
  const parentMap = new Map<number, number[]>();
  const hasParent = new Set<number>();

  for (const rel of relationships) {
    if (rel.relationship_type === 'parent_child') {
      const children = childrenMap.get(rel.person_id) || [];
      children.push(rel.related_person_id);
      childrenMap.set(rel.person_id, children);

      const parents = parentMap.get(rel.related_person_id) || [];
      parents.push(rel.person_id);
      parentMap.set(rel.related_person_id, parents);

      hasParent.add(rel.related_person_id);
    } else if (rel.relationship_type === 'spouse') {
      spouseMap.set(rel.person_id, rel.related_person_id);
      spouseMap.set(rel.related_person_id, rel.person_id);
    }
  }

  const spouseOfParent = new Set<number>();
  for (const [, spouseId] of spouseMap) {
    if (hasParent.has(spouseId)) continue;
  }

  const roots = members.filter(
    (m) => !hasParent.has(m.id) && !spouseOfParent.has(m.id)
  );

  const rootIds = new Set(roots.map((r) => r.id));
  const filteredRoots = roots.filter((r) => {
    const spouseId = spouseMap.get(r.id);
    if (spouseId && rootIds.has(spouseId)) {
      if (r.gender === 'male') return true;
      if (
        r.gender === 'female' &&
        members.find((m) => m.id === spouseId)?.gender === 'female'
      ) {
        return r.id < spouseId;
      }
      return false;
    }
    return true;
  });

  return { roots: filteredRoots, childrenMap, spouseMap, parentMap };
}
