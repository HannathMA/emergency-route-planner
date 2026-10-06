// Kerala Emergency Route Planner - Professional Frontend Controller

let networkData = window.INITIAL_DATA || {
    roads: [],
    vehicles: [],
    emergencies: [],
    hospitals: [],
    coordinates: {}
};

let currentRoutePath = [];
let currentBlockedRoads = [];
let lastDispatchResult = null;

// Initialize on page load
document.addEventListener("DOMContentLoaded", async () => {
    onEmergencyChange();
    await fetchNetworkState();
    renderNetworkSvg();
    // Initial dispatch execution
    dispatchEmergency();
});

// Fetch current network state
async function fetchNetworkState() {
    try {
        const res = await fetch("/api/network");
        if (res.ok) {
            const data = await res.json();
            networkData = data;
            currentBlockedRoads = data.blocked || [];
            updateBlockedRoadsUi();
        }
    } catch (err) {
        console.error("Failed to load network state:", err);
    }
}

// When selected emergency changes in dropdown
function onEmergencyChange() {
    const select = document.getElementById("emergencySelect");
    const emergencyId = select.value;
    const emergency = networkData.emergencies.find(e => e.id === emergencyId);

    const detailsBox = document.getElementById("emergencyDetailsBox");
    if (!emergency) {
        detailsBox.innerHTML = "<p>No emergency selected</p>";
        return;
    }

    const priorityBadge = emergency.priority.toUpperCase() === "CRITICAL" ? 
        '<span class="status-badge status-danger">CRITICAL PRIORITY</span>' : 
        '<span class="status-badge status-idle" style="color: #b45309; background: #fffbeb;">HIGH PRIORITY</span>';
    
    const locName = formatName(emergency.location);
    const hospName = formatName(emergency.target_hospital || "Aster_Medcity");

    detailsBox.innerHTML = `
        <div class="summary-pill">
            <span class="summary-label">Incident Type:</span>
            <span class="summary-value">${emergency.type}</span>
        </div>
        <div class="summary-pill">
            <span class="summary-label">Priority Level:</span>
            ${priorityBadge}
        </div>
        <div class="summary-pill">
            <span class="summary-label">Incident Site:</span>
            <span class="summary-value">📍 ${locName}, Kochi</span>
        </div>
        <div class="summary-pill">
            <span class="summary-label">Target Hospital:</span>
            <span class="summary-value" style="color: #059669;">🏥 ${hospName}</span>
        </div>
        <div class="summary-pill">
            <span class="summary-label">Required Equipment:</span>
            <span class="summary-value">${emergency.required_equipment.join(", ")}</span>
        </div>
    `;
}

// Helper to look up segment cost between two nodes
function getRoadSegmentCost(source, dest) {
    if (!networkData.roads) return 0;
    const road = networkData.roads.find(r => 
        (r.source === source && r.destination === dest) ||
        (r.source === dest && r.destination === source)
    );
    return road ? road.cost : 0;
}

// Main Dispatch: Executes Focused Route for Selected Algorithm
async function dispatchEmergency() {
    const emergencyId = document.getElementById("emergencySelect").value;
    const algorithm = document.getElementById("dispatchAlgorithm").value;

    const statusBadge = document.getElementById("routeStatusBadge");
    statusBadge.className = "status-badge status-idle";
    statusBadge.innerText = "Computing Navigation...";

    try {
        const response = await fetch("/api/emergency/dispatch", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                emergency_id: emergencyId,
                algorithm: algorithm
            })
        });

        const data = await response.json();
        lastDispatchResult = data;
        currentBlockedRoads = data.blocked || [];

        // 1. Render primary focused output (Active Algorithm Deep-Dive)
        renderFocusedAlgorithmOutput(data, algorithm);

        // 2. Render separate benchmarking section (Comparative Study)
        renderBenchmarkTable(data.comparisons);

        updateBlockedRoadsUi();

        if (data.success) {
            currentRoutePath = data.path || [];
            statusBadge.className = "status-badge status-success";
            statusBadge.innerText = "Optimal Route Ready";
        } else {
            currentRoutePath = [];
            statusBadge.className = "status-badge status-danger";
            statusBadge.innerText = "No Route Available";
        }

        renderNetworkSvg();
    } catch (err) {
        console.error("Dispatch error:", err);
        statusBadge.className = "status-badge status-danger";
        statusBadge.innerText = "Server Error";
    }
}

// Render Focused Algorithm Output (Direct focus on selected algorithm)
function renderFocusedAlgorithmOutput(data, selectedAlgo) {
    const meta = data.algo_metadata || {};
    const em = data.emergency || {};
    const v = data.vehicle || {};

    // 1. Mission Header & Metrics
    const heading = document.getElementById("activeRouteHeading");
    heading.innerText = `${em.type || 'Emergency'} → ${formatName(em.target_hospital || 'Aster_Medcity')}`;

    const metricCost = document.getElementById("metricCost");
    const metricCostSub = document.getElementById("metricCostSub");
    const metricAlgo = document.getElementById("metricAlgo");
    const metricParadigm = document.getElementById("metricParadigm");
    const metricExpanded = document.getElementById("metricExpanded");
    const metricOptimality = document.getElementById("metricOptimality");

    if (data.success) {
        metricCost.innerText = `${data.cost} km`;
        metricCostSub.innerText = `Total Travel Distance`;
        metricAlgo.innerText = meta.badge || data.algorithm;
        metricParadigm.innerText = meta.category || 'Search Algorithm';
        metricExpanded.innerText = `${data.expanded !== undefined ? data.expanded : '—'} Nodes`;
        metricOptimality.innerText = meta.optimality && meta.optimality.includes("Optimal") ? "Optimal" : "Suboptimal";
        metricOptimality.className = meta.optimality && meta.optimality.includes("Optimal") ? "metric-val text-success" : "metric-val" ;
    } else {
        metricCost.innerText = "—";
        metricCostSub.innerText = "Route Blocked";
        metricAlgo.innerText = meta.badge || data.algorithm;
        metricParadigm.innerText = meta.category || 'Search Algorithm';
        metricExpanded.innerText = "—";
        metricOptimality.innerText = "Failed";
        metricOptimality.className = "metric-val" ;
    }

    // 2. Visual Corridor Highway Progression Path
    const corridorWrapper = document.getElementById("corridorPathWrapper");
    if (data.success && data.path && data.path.length > 0) {
        let corridorHtml = "";
        for (let i = 0; i < data.path.length; i++) {
            const node = data.path[i];
            const isFirst = (i === 0);
            const isLast = (i === data.path.length - 1);

            let chipClass = "node-chip";
            let icon = "";
            if (isFirst) {
                chipClass += " chip-emergency";
                icon = "🚨 ";
            } else if (isLast) {
                chipClass += " chip-hospital";
                icon = "🏥 ";
            }

            corridorHtml += `<div class="${chipClass}">${icon}${formatName(node)}</div>`;

            if (!isLast) {
                const segCost = getRoadSegmentCost(node, data.path[i + 1]);
                corridorHtml += `
                    <div class="path-arrow-step">
                        <span>→</span>
                        <span>${segCost} km</span>
                    </div>
                `;
            }
        }
        corridorWrapper.innerHTML = corridorHtml;
    } else {
        corridorWrapper.innerHTML = `<span style="color: #dc2626; font-size: 13px; font-weight: 600;">No clear path to destination hospital. Corridors obstructed.</span>`;
    }

    // 3. Turn-by-Turn Maneuvers (Step 8 Action Plan)
    const actionPlanTimeline = document.getElementById("actionPlanTimeline");
    const actionsSection = document.getElementById("actionsSection");

    if (data.success && data.actions && data.actions.length > 0) {
        actionsSection.style.display = "block";
        actionPlanTimeline.innerHTML = data.actions.map((act, i) => {
            const segCost = getRoadSegmentCost(act.from, act.to);
            return `
                <div class="action-step-item">
                    <div class="action-step-main">
                        <span class="step-badge">Stage ${i + 1}</span>
                        <span>Proceed via highway from <b>${formatName(act.from)}</b> to <b>${formatName(act.to)}</b></span>
                    </div>
                    <span class="step-dist-badge">${segCost} km</span>
                </div>
            `;
        }).join("");
    } else {
        actionsSection.style.display = "none";
    }

    // 4. Vehicle Assignment (CSP) Box
    const cspOutput = document.getElementById("cspOutput");
    if (data.vehicle) {
        cspOutput.innerHTML = `
            <div class="vehicle-callout">
                <span class="vehicle-id-badge">${data.vehicle.id}</span>
                <span style="font-weight: 700; color: #0f172a; margin-top: 2px;">${data.vehicle.name || data.vehicle.type}</span>
            </div>
            <div style="font-size: 12px; color: #475569;">
                <b>Stationed At:</b> ${formatName(data.vehicle.location)} • <b>Fleet Type:</b> ${data.vehicle.type}
            </div>
            <div style="font-size: 12px; color: #475569;">
                <b>Onboard Units:</b> ${data.vehicle.equipment.join(", ")}
            </div>
            <div style="color: #059669; font-weight: 700; font-size: 11px; margin-top: 4px;">
                ✓ Constraint Satisfaction: Equipment matched
            </div>
        `;
    } else {
        cspOutput.innerHTML = `<span style="color: #dc2626;">No vehicle satisfied equipment requirements.</span>`;
    }

    // 5. Knowledge Base & Rule Deductions Box
    const kbOutput = document.getElementById("kbOutput");
    if (data.facts && data.facts.length > 0) {
        const pills = data.facts.map(fact => {
            const isRuleConclusion = fact.includes("USE_") || fact.includes("AVOID_") || fact.includes("CAN_BE");
            const cls = isRuleConclusion ? "pill-rule" : "pill-fact";
            return `<span class="intel-pill ${cls}">${fact}</span>`;
        }).join("");
        kbOutput.innerHTML = `
            <div><b>Active Facts & Deductions:</b></div>
            <div style="margin-top: 4px;">${pills}</div>
        `;
    } else {
        kbOutput.innerHTML = `<span class="placeholder-text">No active inferences</span>`;
    }

    // 6. Selected Algorithm Deep-Dive Box
    const algoHeading = document.getElementById("activeAlgoHeading");
    const algoBadge = document.getElementById("activeAlgoParadigmBadge");
    const algoCriteriaBox = document.getElementById("algoCriteriaBox");

    algoHeading.innerText = `${meta.name || data.algorithm} Strategy`;
    algoBadge.innerText = meta.category || 'Search Paradigm';

    algoCriteriaBox.innerHTML = `
        <div class="algo-stats-grid">
            <div class="algo-stat-item">
                <div class="algo-stat-label">Evaluation Metric</div>
                <div class="algo-stat-val">${meta.evaluation_fn || 'Standard'}</div>
            </div>
            <div class="algo-stat-item">
                <div class="algo-stat-label">Complexity</div>
                <div class="algo-stat-val" style="font-size: 12px;">T: ${meta.time_complexity || 'O(b^d)'} | S: ${meta.space_complexity || 'O(b^d)'}</div>
            </div>
            <div class="algo-stat-item">
                <div class="algo-stat-label">Corridor Hops</div>
                <div class="algo-stat-val">${data.expanded !== undefined ? data.expanded + ' Junctions' : '—'}</div>
            </div>
        </div>
        <div class="algo-text-block">
            <div><b>Decision Criteria:</b> ${meta.criteria || ''}</div>
            <div style="margin-top: 6px;"><b>Operational Rationale:</b> ${meta.operational_focus || ''}</div>
        </div>
    `;
}

// Render Benchmark Comparison in the Separate Section
function renderBenchmarkTable(comparisons) {
    const tbody = document.getElementById("benchmarkTbody");
    if (!comparisons || comparisons.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted">No comparison data available</td></tr>`;
        return;
    }

    const algoConfig = {
        "astar": { name: "A* Search", paradigm: "Informed", fn: "f = g + h", optimal: true },
        "greedy": { name: "Greedy Best-First", paradigm: "Informed", fn: "f = h", optimal: false },
        "bfs": { name: "Breadth-First (BFS)", paradigm: "Uninformed", fn: "Queue (FIFO)", optimal: false },
        "iddfs": { name: "Iterative Deepening (IDDFS)", paradigm: "Uninformed", fn: "Iterative Depth", optimal: false },
        "dls": { name: "Depth-Limited (DLS)", paradigm: "Uninformed", fn: "Depth Bound = 5", optimal: false },
        "dfs": { name: "Depth-First (DFS)", paradigm: "Uninformed", fn: "Stack (LIFO)", optimal: false }
    };

    const successfulCosts = comparisons.filter(c => c.success).map(c => c.cost);
    const minCost = successfulCosts.length > 0 ? Math.min(...successfulCosts) : null;

    tbody.innerHTML = comparisons.map(item => {
        const key = (item.algorithm || "").toLowerCase();
        const conf = algoConfig[key] || { name: item.algorithm, paradigm: "Search", fn: "Standard", optimal: false };
        const isOptimal = item.success && item.cost === minCost;

        let badgeHtml = "";
        if (!item.success) {
            badgeHtml = `<span class="table-tag tag-failed">No Route</span>`;
        } else if (isOptimal) {
            badgeHtml = `<span class="table-tag tag-optimal">Optimal (${item.cost} km)</span>`;
        } else {
            badgeHtml = `<span class="table-tag tag-suboptimal">+${item.cost - minCost} km Detour</span>`;
        }

        const paradigmClass = conf.paradigm === "Informed" ? "tag-informed" : "tag-uninformed";
        const pathFormatted = item.success ? item.path.map(formatName).join(" → ") : "—";

        return `
            <tr>
                <td><b>${conf.name}</b></td>
                <td><span class="table-tag ${paradigmClass}">${conf.paradigm}</span></td>
                <td style="font-family: var(--font-mono); font-size: 12px; color: #475569;">${conf.fn}</td>
                <td style="font-family: var(--font-mono); font-size: 12px;">${pathFormatted}</td>
                <td><b>${item.success ? item.cost + ' km' : '—'}</b></td>
                <td>${item.expanded !== undefined ? item.expanded + ' nodes' : '—'}</td>
                <td>${badgeHtml}</td>
            </tr>
        `;
    }).join("");
}

// Re-run benchmark explicitly
async function runComparativeAnalysis() {
    await dispatchEmergency();
}

// Block / Open road from select dropdown
async function toggleBlockSelectedRoad(isBlock) {
    const val = document.getElementById("blockRoadSelect").value;
    const [source, destination] = val.split("|");
    await performRoadToggle(source, destination, isBlock);
}

// Perform road toggle via API
async function performRoadToggle(source, destination, isBlock) {
    const endpoint = isBlock ? "/api/block" : "/api/unblock";
    try {
        const res = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ source, destination })
        });
        const data = await res.json();
        currentBlockedRoads = data.blocked || [];
        updateBlockedRoadsUi();
        // Dynamic re-routing (Step 9)
        await dispatchEmergency();
    } catch (err) {
        console.error("Error toggling road:", err);
    }
}

// Clear all roadblocks
async function clearAllBlocks() {
    try {
        const res = await fetch("/api/clear_blocks", { method: "POST" });
        const data = await res.json();
        currentBlockedRoads = data.blocked || [];
        updateBlockedRoadsUi();
        await dispatchEmergency();
    } catch (err) {
        console.error("Error clearing roadblocks:", err);
    }
}

// Update UI tags for currently blocked roads
function updateBlockedRoadsUi() {
    const container = document.getElementById("blockedRoadsList");
    if (!currentBlockedRoads || currentBlockedRoads.length === 0) {
        container.innerHTML = `<span class="tag-empty">All corridors open</span>`;
        return;
    }

    container.innerHTML = currentBlockedRoads.map(([u, v]) => `
        <span class="road-tag">
            🚧 ${formatName(u)} ⟷ ${formatName(v)}
            <span class="road-tag-close" onclick="performRoadToggle('${u}', '${v}', false)" title="Unblock">×</span>
        </span>
    `).join("");
}

function isRoadBlocked(u, v) {
    const key = [u, v].sort().join("|");
    return currentBlockedRoads.some(([a, b]) => [a, b].sort().join("|") === key);
}

function isRoadInCurrentRoute(u, v) {
    if (!currentRoutePath || currentRoutePath.length < 2) return false;
    for (let i = 0; i < currentRoutePath.length - 1; i++) {
        const p1 = currentRoutePath[i];
        const p2 = currentRoutePath[i + 1];
        if ((p1 === u && p2 === v) || (p1 === v && p2 === u)) {
            return true;
        }
    }
    return false;
}

// Helper: Format node names for clean display
function formatName(name) {
    if (!name) return "";
    return name.replace(/_/g, " ");
}

// Coordinate projection for Kochi Road Network SVG Map
function projectCoord(node) {
    const coords = networkData.coordinates || {};
    const pt = coords[node] || [0, 0];
    const x = pt[0];
    const y = pt[1];

    // X ranges from 0 (Aster Medcity) to 9 (Kakkanad Infopark) -> project to [90, 750]
    const svgX = 90 + (x / 9.2) * 660;

    // Y ranges from -3 (Kaloor, Vyttila) to +3 (Kalamassery)
    const svgY = 210 - (y / 3.4) * 110;

    return { x: svgX, y: svgY };
}

// Render Interactive SVG Road Network Map
function renderNetworkSvg() {
    const svg = document.getElementById("networkSvg");
    if (!svg || !networkData.roads) return;

    let svgHtml = `
        <defs>
            <filter id="glow-route" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                </feMerge>
            </filter>
        </defs>
    `;

    // 1. Draw Roads
    networkData.roads.forEach(road => {
        const p1 = projectCoord(road.source);
        const p2 = projectCoord(road.destination);
        const blocked = isRoadBlocked(road.source, road.destination);
        const onRoute = isRoadInCurrentRoute(road.source, road.destination);

        let strokeColor = "#cbd5e1";
        let strokeWidth = 3;
        let strokeDash = "none";
        let filterAttr = "";

        if (blocked) {
            strokeColor = "#dc2626";
            strokeWidth = 4;
            strokeDash = "6,4";
        } else if (onRoute) {
            strokeColor = "#2563eb";
            strokeWidth = 5;
            filterAttr = 'filter="url(#glow-route)"';
        }

        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;

        svgHtml += `
            <g class="road-group" style="cursor: pointer;" onclick="performRoadToggle('${road.source}', '${road.destination}', ${!blocked})">
                <line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" 
                      stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-dasharray="${strokeDash}" ${filterAttr} />
                <!-- Click hit target -->
                <line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" 
                      stroke="transparent" stroke-width="16" />
                <!-- Distance cost badge -->
                <circle cx="${midX}" cy="${midY}" r="12" fill="#ffffff" stroke="${blocked ? '#dc2626' : (onRoute ? '#2563eb' : '#cbd5e1')}" stroke-width="1.5" />
                <text x="${midX}" y="${midY + 4}" fill="${blocked ? '#dc2626' : (onRoute ? '#1d4ed8' : '#475569')}" 
                      font-size="11" font-family="'JetBrains Mono', monospace" font-weight="700" text-anchor="middle">${blocked ? '✕' : road.cost + 'k'}</text>
            </g>
        `;
    });

    // 2. Draw Junction Nodes
    const nodes = Object.keys(networkData.coordinates || {});
    nodes.forEach(node => {
        const p = projectCoord(node);
        const isHospital = node.includes("Hospital") || node.includes("Medcity");
        const isEmergency = node.includes("Infopark") || node.includes("Emergency");
        const onRoute = currentRoutePath.includes(node);

        let fillColor = "#ffffff";
        let strokeColor = "#64748b";
        let radius = 16;
        let icon = "";

        if (isHospital) {
            fillColor = "#ecfdf5";
            strokeColor = "#059669";
            radius = 21;
            icon = "🏥";
        } else if (isEmergency) {
            fillColor = "#fef2f2";
            strokeColor = "#dc2626";
            radius = 21;
            icon = "🚨";
        } else if (onRoute) {
            fillColor = "#eff6ff";
            strokeColor = "#2563eb";
            radius = 17;
        }

        const displayLabel = formatName(node);

        svgHtml += `
            <g class="node-group">
                <circle cx="${p.x}" cy="${p.y}" r="${radius}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2.5" />
                ${icon ? `
                    <text x="${p.x}" y="${p.y + 6}" font-size="15" text-anchor="middle">${icon}</text>
                ` : `
                    <circle cx="${p.x}" cy="${p.y}" r="4" fill="${onRoute ? '#2563eb' : '#64748b'}" />
                `}
                <text x="${p.x}" y="${p.y + radius + 15}" fill="#0f172a" font-size="11.5" font-weight="700" text-anchor="middle">
                    ${displayLabel}
                </text>
            </g>
        `;
    });

    svg.innerHTML = svgHtml;
}