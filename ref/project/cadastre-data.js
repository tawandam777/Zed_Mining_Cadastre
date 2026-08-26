/* cadastre-data.js
   Real Zambia geometry + the 15 real mining licences from the original
   "Zambia Mining Cadastre" design, projected into the map coordinate space
   the design component expects (window.CADASTRE_DATA).

   Projection retained from the original file:
     proj(lon,lat) = [ (lon-21.5)*82 + 55 , (-lat-8)*82 + 70 ]  in a 1200x900 space
   folded into the component's { xmin, ymax, scale, cosFactor } form. */
(function () {
  const SX = 82, SY = 82, OX = 55, OY = 70;
  const proj = (lon, lat) => [(lon - 21.5) * SX + OX, (-lat - 8.0) * SY + OY];

  // ---- national outline (WGS84 lon/lat) ----
  const ZAMBIA = [
    [32.759375, -9.230599], [33.231388, -9.676722], [33.485688, -10.525559], [33.31531, -10.79655],
    [33.114289, -11.607198], [33.306422, -12.435778], [32.991764, -12.783871], [32.688165, -13.712858],
    [33.214025, -13.97186], [30.179481, -14.796099], [30.274256, -15.507787], [29.516834, -15.644678],
    [28.947463, -16.043051], [28.825869, -16.389749], [28.467906, -16.4684], [27.598243, -17.290831],
    [27.044427, -17.938026], [26.706773, -17.961229], [26.381935, -17.846042], [25.264226, -17.73654],
    [25.084443, -17.661816], [25.07695, -17.578823], [24.682349, -17.353411], [24.033862, -17.295843],
    [23.215048, -17.523116], [22.562478, -16.898451], [21.887843, -16.08031], [21.933886, -12.898437],
    [24.016137, -12.911046], [23.930922, -12.565848], [24.079905, -12.191297], [23.904154, -11.722282],
    [24.017894, -11.237298], [23.912215, -10.926826], [24.257155, -10.951993], [24.314516, -11.262826],
    [24.78317, -11.238694], [25.418118, -11.330936], [25.75231, -11.784965], [26.553088, -11.92444],
    [27.16442, -11.608748], [27.388799, -12.132747], [28.155109, -12.272481], [28.523562, -12.698604],
    [28.934286, -13.248958], [29.699614, -13.257227], [29.616001, -12.178895], [29.341548, -12.360744],
    [28.642417, -11.971569], [28.372253, -11.793647], [28.49607, -10.789884], [28.673682, -9.605925],
    [28.449871, -9.164918], [28.734867, -8.526559], [29.002912, -8.407032], [30.346086, -8.238257],
    [30.740015, -8.340007], [31.157751, -8.594579], [31.556348, -8.762049], [32.191865, -8.930359]
  ];

  const PROVINCE_LABELS = [
    [24.8, -12.6, "NORTH-WESTERN"], [28.2, -12.0, "COPPERBELT"], [29.4, -11.3, "LUAPULA"],
    [31.0, -9.8, "NORTHERN"], [31.9, -11.7, "MUCHINGA"], [30.0, -13.8, "CENTRAL"],
    [32.4, -13.1, "EASTERN"], [28.9, -15.6, "LUSAKA"], [27.0, -16.4, "SOUTHERN"], [23.2, -15.0, "WESTERN"]
  ];

  const nationalPath =
    "M" + ZAMBIA.map(([lon, lat]) => { const [x, y] = proj(lon, lat); return x.toFixed(1) + "," + y.toFixed(1); }).join(" L") + " Z";

  // One filled entry = national silhouette; the rest are label-only (empty path).
  const provinces = [
    { name: "", d: nationalPath, centroid: [-9999, -9999] },
    ...PROVINCE_LABELS.map(([lon, lat, name]) => { const [x, y] = proj(lon, lat); return { name, d: "", centroid: [x, y] }; })
  ];

  // ---- the 15 real licences (parcel points already in map space) ----
  const RAW = [
    { num: "LSM-2024-0147", holder: "Kabwe Copper Resources Ltd", status: "Active", type: "Large-Scale Mining", mineral: "Copper", ha: 2450, issue: "2024-03-12", expiry: "2049-03-11", district: "Chingola, Copperbelt Province", pts: "560,430 615,425 620,470 565,478" },
    { num: "SSM-2023-0892", holder: "Lukanga Minerals", status: "Active", type: "Small-Scale Mining", mineral: "Cobalt", ha: 320, issue: "2023-07-04", expiry: "2033-07-03", district: "Kitwe, Copperbelt Province", pts: "615,425 660,432 658,475 620,470" },
    { num: "EPL-2024-0231", holder: "Mkushi Exploration Co.", status: "Pending", type: "Exploration", mineral: "Gold", ha: 5600, issue: "2024-09-22", expiry: "2028-09-21", district: "Mkushi, Central Province", pts: "672,536 722,540 726,580 676,576" },
    { num: "ASM-2022-1045", holder: "Broken Hill Artisanal Coop", status: "Active", type: "Artisanal", mineral: "Emerald", ha: 45, issue: "2022-05-18", expiry: "2027-05-17", district: "Lufwanyama, Copperbelt Province", pts: "565,478 620,470 625,512 570,518" },
    { num: "LSM-2021-0067", holder: "Zambezi Metals Plc", status: "Expired", type: "Large-Scale Mining", mineral: "Lead/Zinc", ha: 3100, issue: "2011-02-09", expiry: "2025-02-08", district: "Kabwe, Central Province", pts: "600,578 650,573 654,616 604,622" },
    { num: "MPL-2024-0012", holder: "Central Processing Ltd", status: "Active", type: "Mineral Processing", mineral: "Copper", ha: 180, issue: "2024-01-30", expiry: "2034-01-29", district: "Ndola, Copperbelt Province", pts: "620,470 658,475 665,515 625,512" },
    { num: "EPL-2023-0556", holder: "Kapiri Resources Ltd", status: "Suspended", type: "Exploration", mineral: "Manganese", ha: 4200, issue: "2023-11-14", expiry: "2027-11-13", district: "Kapiri Mposhi, Central Province", pts: "618,540 668,536 672,573 622,576" },
    { num: "SSM-2024-0334", holder: "Ndola West Mining", status: "Pending", type: "Small-Scale Mining", mineral: "Gold", ha: 410, issue: "2024-12-02", expiry: "2034-12-01", district: "Ndola, Copperbelt Province", pts: "658,475 698,470 705,508 665,515" },
    { num: "LSM-2020-0023", holder: "Lufwanyama Holdings", status: "Relinquished", type: "Large-Scale Mining", mineral: "Copper", ha: 2800, issue: "2010-08-11", expiry: "2035-08-10", district: "Solwezi, North-Western Province", pts: "385,378 440,372 448,418 392,425" },
    { num: "ASM-2023-0778", holder: "Mulungushi Gems", status: "Active", type: "Artisanal", mineral: "Emerald", ha: 60, issue: "2023-04-27", expiry: "2028-04-26", district: "Lufwanyama, Copperbelt Province", pts: "522,452 565,446 570,490 527,496" },
    { num: "EPL-2024-0445", holder: "Great North Exploration", status: "Active", type: "Exploration", mineral: "Cobalt", ha: 6100, issue: "2024-06-15", expiry: "2028-06-14", district: "Kalumbila, North-Western Province", pts: "440,372 495,380 498,425 448,418" },
    { num: "SSM-2022-0611", holder: "Chibombo Minerals Ltd", status: "Expired", type: "Small-Scale Mining", mineral: "Manganese", ha: 290, issue: "2012-10-03", expiry: "2024-10-02", district: "Chibombo, Central Province", pts: "566,628 616,624 620,664 570,668" },
    { num: "LSM-2023-0198", holder: "Kabwe Copper Resources Ltd", status: "Pending", type: "Large-Scale Mining", mineral: "Lead/Zinc", ha: 1950, issue: "2023-08-19", expiry: "2048-08-18", district: "Kabwe, Central Province", pts: "554,582 600,578 604,622 558,626" },
    { num: "MPL-2023-0089", holder: "Lukanga Minerals", status: "Active", type: "Mineral Processing", mineral: "Cobalt", ha: 130, issue: "2023-02-21", expiry: "2033-02-20", district: "Kalulushi, Copperbelt Province", pts: "660,432 700,438 698,470 658,475" },
    { num: "EPL-2021-0302", holder: "Mkushi Exploration Co.", status: "Suspended", type: "Exploration", mineral: "Gold", ha: 3750, issue: "2021-09-08", expiry: "2025-09-07", district: "Chipata, Eastern Province", pts: "918,520 968,524 972,566 922,562" }
  ];

  // Map original statuses onto the new design's taxonomy.
  const statusMap = { Active: "Active", Pending: "Pending", Expired: "Expired", Suspended: "Suspended", Relinquished: "Cancelled" };
  const provinceOf = (district) => district.split(",").pop().trim().replace(/\s*Province$/i, "").trim();

  // ---- generated mock licences covering the whole country ----
  // Each entry: [lon, lat, province, commodity, status, type, owner, issueYear, termYears, ha]
  const OWNERS = [
    "Kabwe Copper Resources Ltd", "Lukanga Minerals", "Mkushi Exploration Co.", "Zambezi Metals Plc",
    "Great North Exploration", "Lufwanyama Holdings", "Chibombo Minerals Ltd", "Mulungushi Gems",
    "Kalahari Resources Ltd", "Barotse Mining Company", "Muchinga Metals Ltd", "Serenje Prospecting Co.",
    "Kariba Minerals Plc", "Bangweulu Resources", "Chambeshi Mining Ltd", "Victoria Falls Aggregates",
    "Luapula Copper Ventures", "Eastern Reef Gold Ltd", "Southern Cross Manganese", "Zambezi Rare Earths Co."
  ];
  const EXTRA = [
    // North-Western
    [25.3, -12.2, "North-Western", "Copper", "Active", "Large-Scale Mining", 8, 2014, 25, 3400],
    [24.6, -13.1, "North-Western", "Cobalt", "Active", "Exploration", 4, 2022, 4, 5200],
    [25.9, -11.4, "North-Western", "Gold", "Pending", "Small-Scale Mining", 5, 2024, 10, 460],
    [24.2, -13.8, "North-Western", "Manganese", "Reserved", "Exploration", 8, 2023, 4, 6100],
    [26.0, -13.4, "North-Western", "Copper", "Active", "Large-Scale Mining", 0, 2016, 25, 2900],
    // Copperbelt (fill out)
    [27.9, -12.5, "Copperbelt", "Copper", "Active", "Large-Scale Mining", 0, 2013, 25, 4100],
    [28.5, -13.0, "Copperbelt", "Cobalt", "Suspended", "Small-Scale Mining", 1, 2019, 10, 380],
    [27.6, -13.1, "Copperbelt", "Emerald", "Active", "Artisanal", 7, 2023, 5, 55],
    // Luapula
    [29.1, -10.4, "Luapula", "Manganese", "Active", "Small-Scale Mining", 16, 2021, 10, 340],
    [28.7, -11.3, "Luapula", "Copper", "Pending", "Exploration", 16, 2024, 4, 4800],
    [29.5, -9.8, "Luapula", "Gold", "Active", "Artisanal", 7, 2022, 5, 70],
    [28.9, -10.9, "Luapula", "Cobalt", "Reserved", "Exploration", 4, 2023, 4, 5300],
    // Northern
    [30.6, -9.6, "Northern", "Gold", "Active", "Small-Scale Mining", 14, 2020, 10, 410],
    [31.2, -10.4, "Northern", "Copper", "Pending", "Large-Scale Mining", 13, 2024, 25, 2600],
    [29.8, -9.2, "Northern", "Manganese", "Active", "Exploration", 10, 2023, 4, 5900],
    [31.5, -9.1, "Northern", "Lead/Zinc", "Expired", "Small-Scale Mining", 6, 2012, 12, 300],
    // Muchinga
    [31.7, -11.2, "Muchinga", "Gold", "Active", "Exploration", 10, 2022, 4, 6400],
    [32.2, -10.6, "Muchinga", "Copper", "Reserved", "Large-Scale Mining", 14, 2023, 25, 3100],
    [31.4, -12.2, "Muchinga", "Manganese", "Active", "Small-Scale Mining", 11, 2021, 10, 360],
    // Central
    [29.4, -14.2, "Central", "Gold", "Active", "Exploration", 2, 2022, 4, 5500],
    [27.6, -14.5, "Central", "Lead/Zinc", "Active", "Large-Scale Mining", 3, 2015, 25, 3300],
    [28.8, -13.9, "Central", "Copper", "Pending", "Small-Scale Mining", 11, 2024, 10, 420],
    [26.8, -13.9, "Central", "Manganese", "Suspended", "Exploration", 2, 2019, 4, 4700],
    [29.9, -14.6, "Central", "Emerald", "Active", "Artisanal", 7, 2023, 5, 48],
    // Eastern
    [32.4, -13.0, "Eastern", "Gold", "Active", "Exploration", 17, 2022, 4, 6000],
    [31.9, -13.8, "Eastern", "Copper", "Reserved", "Large-Scale Mining", 17, 2023, 25, 2800],
    [32.9, -12.6, "Eastern", "Manganese", "Active", "Small-Scale Mining", 18, 2021, 10, 390],
    [32.6, -14.2, "Eastern", "Gold", "Pending", "Artisanal", 17, 2024, 5, 62],
    // Lusaka
    [28.6, -15.4, "Lusaka", "Lead/Zinc", "Active", "Large-Scale Mining", 3, 2016, 25, 2400],
    [29.2, -15.7, "Lusaka", "Manganese", "Active", "Small-Scale Mining", 6, 2022, 10, 330],
    [28.2, -15.9, "Lusaka", "Copper", "Cancelled", "Exploration", 0, 2011, 4, 4200],
    // Southern
    [27.2, -16.4, "Southern", "Manganese", "Active", "Large-Scale Mining", 18, 2015, 25, 3600],
    [26.4, -16.9, "Southern", "Copper", "Pending", "Small-Scale Mining", 12, 2024, 10, 440],
    [28.0, -16.8, "Southern", "Lead/Zinc", "Active", "Exploration", 12, 2023, 4, 5100],
    [25.9, -17.3, "Southern", "Gold", "Suspended", "Artisanal", 15, 2019, 5, 58],
    [27.8, -17.2, "Southern", "Manganese", "Active", "Small-Scale Mining", 18, 2021, 10, 370],
    // Western
    [23.3, -14.6, "Western", "Copper", "Reserved", "Exploration", 9, 2023, 4, 6700],
    [22.8, -15.6, "Western", "Gold", "Active", "Small-Scale Mining", 9, 2022, 10, 400],
    [24.1, -15.9, "Western", "Manganese", "Pending", "Exploration", 9, 2024, 4, 5400],
    [23.6, -16.4, "Western", "Copper", "Active", "Large-Scale Mining", 9, 2017, 25, 2700],
    [22.6, -14.2, "Western", "Lead/Zinc", "Expired", "Small-Scale Mining", 13, 2012, 12, 310]
  ];
  const TYPE_PREFIX = { "Large-Scale Mining": "LSM", "Small-Scale Mining": "SSM", "Exploration": "EPL", "Artisanal": "ASM", "Mineral Processing": "MPL" };
  let seq = 500;
  const generated = EXTRA.map(([lon, lat, prov, mineral, status, type, ownerIdx, issueYr, term, ha]) => {
    // square parcel sized loosely from hectares, converted to map space
    const wDeg = Math.max(0.28, Math.min(0.85, Math.sqrt(ha) / 90));
    const corners = [[lon - wDeg / 2, lat + wDeg / 2], [lon + wDeg / 2, lat + wDeg / 2], [lon + wDeg / 2, lat - wDeg / 2], [lon - wDeg / 2, lat - wDeg / 2]];
    const points = corners.map((c) => proj(c[0], c[1]).map((v) => Math.round(v * 10) / 10));
    const cx = points.reduce((s, p) => s + p[0], 0) / points.length;
    const cy = points.reduce((s, p) => s + p[1], 0) / points.length;
    const mm = String((seq % 12) + 1).padStart(2, "0");
    const num = `${TYPE_PREFIX[type]}-${issueYr}-${String(++seq).padStart(4, "0")}`;
    return {
      id: num, number: num, owner: OWNERS[ownerIdx], commodity: mineral, province: prov,
      status, licenceType: type, areaKm2: Math.round((ha / 100) * 10) / 10,
      issueDate: `${issueYr}-${mm}-15`, expiryDate: `${issueYr + term}-${mm}-14`,
      points, centroid: [cx, cy]
    };
  });

  const licenses = RAW.map((l) => {
    const points = l.pts.split(" ").map((p) => p.split(",").map(Number));
    const cx = points.reduce((s, p) => s + p[0], 0) / points.length;
    const cy = points.reduce((s, p) => s + p[1], 0) / points.length;
    return {
      id: l.num,
      number: l.num,
      owner: l.holder,
      commodity: l.mineral,
      province: provinceOf(l.district),
      status: statusMap[l.status] || l.status,
      licenceType: l.type,
      areaKm2: Math.round((l.ha / 100) * 10) / 10,
      issueDate: l.issue,
      expiryDate: l.expiry,
      points,
      centroid: [cx, cy]
    };
  }).concat(generated);
  const geoPath = (coords, close) =>
    coords.map((c, i) => { const [x, y] = proj(c[0], c[1]); return (i ? "L" : "M") + x.toFixed(1) + " " + y.toFixed(1); }).join(" ") + (close ? " Z" : "");

  const ZAMBEZI = [[24.0, -11.4], [23.5, -13.0], [23.0, -14.6], [23.1, -15.3], [23.4, -16.5], [24.2, -17.4], [25.3, -17.85], [26.7, -16.3], [27.8, -16.5], [28.9, -15.85], [30.4, -15.6]];
  const KAFUE = [[27.2, -12.4], [26.6, -13.6], [26.0, -14.8], [26.6, -15.6], [27.6, -15.8], [28.9, -15.85]];
  const LUANGWA = [[32.2, -10.8], [31.6, -12.2], [31.1, -13.4], [30.8, -14.6], [30.4, -15.6]];
  const rivers = [ZAMBEZI, KAFUE, LUANGWA].map((r) => ({ d: geoPath(r, false) }));

  const LAKES = [[28.0, -16.5, 42, 8], [29.8, -11.2, 26, 20], [28.7, -9.1, 12, 26], [30.95, -8.4, 22, 30]];
  const lakes = LAKES.map(([lon, lat, rx, ry]) => { const [x, y] = proj(lon, lat); return { cx: x, cy: y, rx, ry }; });

  const NEIGHBORS = [
    [26.5, -9.3, "DEM. REP. OF THE CONGO"], [21.6, -13.5, "ANGOLA"], [31.8, -8.6, "TANZANIA"],
    [33.9, -12.8, "MALAWI"], [32.0, -16.0, "MOZAMBIQUE"], [28.0, -17.4, "ZIMBABWE"],
    [24.6, -18.1, "BOTSWANA"], [22.8, -17.7, "NAMIBIA"]
  ];
  const neighbors = NEIGHBORS.map(([lon, lat, name]) => { const [x, y] = proj(lon, lat); return { x, y, name }; });

  const PROV_LINES = [
    [[24.3, -11.0], [24.5, -13.0], [24.6, -15.3], [24.3, -17.3]],
    [[24.6, -13.6], [26.4, -13.2], [27.0, -12.3]],
    [[27.0, -12.3], [27.3, -13.4], [28.9, -13.4], [29.2, -12.5]],
    [[24.6, -15.3], [27.0, -15.0], [29.0, -15.2], [30.4, -15.6]],
    [[28.0, -15.0], [28.2, -15.95]],
    [[29.2, -12.5], [29.0, -11.0], [28.4, -9.6]],
    [[30.5, -11.0], [31.0, -12.5], [31.4, -14.0], [31.3, -14.6]],
    [[30.5, -11.0], [29.2, -12.5]],
    [[31.0, -9.6], [30.5, -11.0]]
  ];
  const provinceLines = PROV_LINES.map((l) => ({ d: geoPath(l, false) }));

  const CITIES = [
    [28.28, -15.42, "Lusaka", 2], [28.21, -12.82, "Kitwe", 1], [28.64, -12.97, "Ndola", 1],
    [28.45, -14.45, "Kabwe", 1], [26.39, -12.17, "Solwezi", 0], [25.86, -17.85, "Livingstone", 0],
    [32.65, -13.64, "Chipata", 0], [31.18, -10.21, "Kasama", 0], [23.13, -15.25, "Mongu", 0],
    [28.89, -11.20, "Mansa", 0], [31.33, -8.77, "Mpulungu", 0]
  ];
  const places = CITIES.map(([lon, lat, name, rank]) => { const [x, y] = proj(lon, lat); return { x, y, name, rank, r: rank === 2 ? 4 : rank === 1 ? 3 : 2.4, capital: rank === 2 }; });

  const OCCURRENCES = [
    [26.0, -12.4, "Cu"], [28.3, -12.9, "Co"], [25.3, -13.0, "Cu"], [29.5, -13.8, "Mn"],
    [27.0, -14.6, "Au"], [31.5, -13.2, "Au"], [30.2, -14.0, "Pb"], [24.5, -14.5, "Em"],
    [28.6, -15.6, "Cu"], [26.5, -16.0, "Mn"], [32.0, -12.0, "Au"], [29.0, -11.0, "Co"],
    [23.5, -16.0, "Cu"], [30.8, -10.5, "Mn"]
  ];
  const occurrences = OCCURRENCES.map(([lon, lat, symbol]) => { const [x, y] = proj(lon, lat); return { x, y, symbol }; });

  // relief hillshade blobs for the Terrain basemap (retained from original design)
  const RELIEF = [[31.6, -10.8, 55, 80], [33.0, -9.7, 42, 46], [32.2, -12.4, 46, 60], [27.9, -12.7, 52, 44], [29.2, -9.2, 36, 42], [24.6, -11.4, 46, 54]];
  const reliefBlobs = RELIEF.map(([lon, lat, rx, ry]) => { const [x, y] = proj(lon, lat); return { cx: x, cy: y, rx, ry }; });

  // graticule (degree grid) — the "Grids"
  const graticuleLines = [];
  const graticuleLabels = [];
  [22, 24, 26, 28, 30, 32].forEach((lon) => {
    const x = proj(lon, 0)[0];
    graticuleLines.push({ x1: x, y1: 30, x2: x, y2: 900 });
    graticuleLabels.push({ x: x + 3, y: 52, text: lon + "\u00B0E" });
  });
  [-9, -11, -13, -15, -17].forEach((lat) => {
    const y = proj(0, lat)[1];
    graticuleLines.push({ x1: 0, y1: y, x2: 1200, y2: y });
    graticuleLabels.push({ x: 6, y: y - 4, text: Math.abs(lat) + "\u00B0S" });
  });

  window.CADASTRE_DATA = {
    width: 1200,
    height: 900,
    projection: { xmin: 20.8293, ymax: -7.1463, scale: 82, cosFactor: 1, kmPerDataUnit: 111 / 82 },
    provinces,
    licenses,
    nationalPath,
    reliefBlobs,
    rivers,
    lakes,
    neighbors,
    provinceLines,
    places,
    occurrences,
    graticuleLines,
    graticuleLabels
  };
})();
