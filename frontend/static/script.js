// Kerala Emergency Route Planner - Frontend Controller

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
    // Run initial dispatch with default A*
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

    const priorityClass = emergency.priority.toUpperCase() === "CRITICAL" ? "priority-critical" : "priority-high";
    const locName = formatName(emergency.location);
    const hospName = formatName(emergency.target_hospital || "Aster_Medcity");

    detailsBox.innerHTML = `
        <div class="meta-row">
            <span class="meta-key">Incident Type:</span>
            <span class="meta-val">${emergency.type}</span>
        </div>
        <div class="meta-row">
            <span class="meta-key">Priority Level:</span>
            <span class="${priorityClass}">${emergency.priority}</span>
        </div>
        <div class="meta-row">
            <span class="meta-key">Incident Location:</span>
            <span class="meta-val">📍 ${locName}, Kochi</span>
        </div>
        <div class="meta-row">
            <span class="meta-key">Destination Hospital:</span>
            <span class="meta-val" style="color: #059669;">🏥 ${hospName}</span>
        </div>
        <div class="meta-row">
            <span class="meta-key">Required Equipment:</span>
            <span class="meta-val">${emergency.required_equipment.join(", ")}</span>
        </div>
        ${emergency.description ? `
        <div style="margin-top: 6px; font-size: 12px; color: #64748b; font-style: italic;">
            "${emergency.description}"
        </div>` : ''}
    `;
}

// Main Dispatch: Executes Focused Route for Selected Algorithm
async function dispatchEmergency() {
    const emergencyId = document.getElementById("emergencySelect").value;
    const algorithm = document.getElementById("dispatchAlgorithm").value;

    const statusBadge = document.getElementById("routeStatusBadge");
    statusBadge.className = "status-badge status-idle";
    statusBadge.innerText = "Computing Route...";

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
            statusBadge.innerText = "Route Generated";
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
    const heading = document.getElementById("activeAlgoHeading");
    const subtext = document.getElementById("activeAlgoCategory");
    const criteriaBox = document.getElementById("algoCriteriaBox");
    const formattedBox = document.getElementById("formattedResultBox");
    const actionsSection = document.getElementById("actionsSection");
    const actionPlanTimeline = document.getElementById("actionPlanTimeline");
    const cspOutput = document.getElementById("cspOutput");
    const kbOutput = document.getElementById("kbOutput");

    const meta = data.algo_metadata || {};

    // 1. Algorithm Identity Header
    heading.innerText = `🎯 Selected Search Algorithm: ${meta.name || data.algorithm}`;
    subtext.innerText = `${meta.category || 'Search Algorithm'} • ${meta.optimality || ''}`;

    // 2. Algorithm Criteria & Working Principle Box
    criteriaBox.innerHTML = `
        <div class="criteria-grid">
            <div class="criteria-card">
                <div class="criteria-title">Evaluation Function</div>
                <div class="criteria-val">${meta.evaluation_fn || 'Standard'}</div>
            </div>
            <div class="criteria-card">
                <div class="criteria-title">Optimality Guarantee</div>
                <div class="criteria-val" style="font-size: 13px; color: ${meta.optimality && meta.optimality.includes('Optimal') ? '#059669' : '#b45309'};">
                    ${meta.optimality || 'Empirical'}
                </div>
            </div>
            <div class="criteria-card">
                <div class="criteria-title">Time & Space Complexity</div>
                <div class="criteria-val" style="font-size: 13px;">T: ${meta.time_complexity || 'O(b^d)'} | S: ${meta.space_complexity || 'O(b^d)'}</div>
            </div>
            <div class="criteria-card">
                <div class="criteria-title">Nodes Expanded</div>
                <div class="criteria-val">${data.expanded !== undefined ? data.expanded + ' junctions' : '—'}</div>
            </div>
        </div>
        <div class="criteria-explanation">
            <div><b>Working Criteria:</b> ${meta.criteria || ''}</div>
            <div style="margin-top: 4px;"><b>Operational Focus:</b> ${meta.operational_focus || ''}</div>
        </div>
    `;

    // 3. CSP Vehicle Allocation Box
    if (data.vehicle) {
        cspOutput.innerHTML = `
            <div>
                <span class="intel-pill pill-vehicle">🚑 ${data.vehicle.id}</span>
                <span style="font-weight: 600; color: #1e293b;">${data.vehicle.name || data.vehicle.type}</span>
            </div>
            <div style="margin-top: 6px; font-size: 12px;">
                <b>Base Location:</b> ${formatName(data.vehicle.location)}
            </div>
            <div style="font-size: 12px;">
                <b>Onboard Equipment:</b> ${data.vehicle.equipment.join(", ")}
            </div>
            <div style="color: #059669; font-weight: 700; font-size: 11px; margin-top: 6px;">
                ✓ Constraint Satisfaction: Equipment matched
            </div>
        `;
    } else {
        cspOutput.innerHTML = `<span style="color: #dc2626;">No vehicle satisfied constraints</span>`;
    }

    // 4. Knowledge Base & Rule Deductions
    if (data.facts && data.facts.length > 0) {
        const pills = data.facts.map(fact => {
            const isRuleConclusion = fact.includes("USE_") || fact.includes("AVOID_") || fact.includes("CAN_BE");
            const cls = isRuleConclusion ? "pill-rule" : "pill-fact";
            return `<span class="intel-pill ${cls}">${fact}</span>`;
        }).join("");
        kbOutput.innerHTML = `
            <div><b>Active Facts & Deductions:</b></div>
            <div style="margin-top: 6px;">${pills}</div>
        `;
    } else {
        kbOutput.innerHTML = `<span class="placeholder-text">No active inferences</span>`;
    }

    // 5. Clean Structured Route Result (Matching User's Specified Format)
    if (data.success) {
        const em = data.emergency || {};
        const v = data.vehicle || {};
        const formattedPath = data.path.map(formatName).join(" → ");

        formattedBox.innerHTML = `
            <div class="result-line">
                <span class="result-label">Emergency:</span>
                <span class="result-value result-highlight">${em.type || 'N/A'}</span>
            </div>
            <div class="result-line">
                <span class="result-label">Priority:</span>
                <span class="result-value">${em.priority || 'N/A'}</span>
            </div>
            <div class="result-line">
                <span class="result-label">Incident Site:</span>
                <span class="result-value">📍 ${formatName(em.location || 'Kakkanad_Infopark')}, Kochi</span>
            </div>
            <div class="result-line">
                <span class="result-label">Destination Hospital:</span>
                <span class="result-value" style="color: #059669; font-weight: 700;">🏥 ${formatName(em.target_hospital || 'Aster_Medcity')}</span>
            </div>
            <div class="result-line">
                <span class="result-label">Assigned Vehicle:</span>
                <span class="result-value result-highlight">${v.id || 'N/A'} (${v.name || v.type})</span>
            </div>
            <div class="result-line">
                <span class="result-label">Algorithm Evaluated:</span>
                <span class="result-value"><b>${meta.name || data.algorithm}</b></span>
            </div>
            <div class="result-line">
                <span class="result-label">Generated Route:</span>
                <span class="result-path">${formattedPath}</span>
            </div>
            <div class="result-line">
                <span class="result-label">Total Road Distance:</span>
                <span class="result-value"><b>${data.cost} km</b></span>
            </div>
            <div class="result-line">
                <span class="result-label">Nodes Expanded:</span>
                <span class="result-value">${data.expanded !== undefined ? data.expanded + ' junctions' : '—'}</span>
            </div>
            <div class="result-line">
                <span class="result-label">Navigation Status:</span>
                <span class="result-value" style="color: #059669; font-weight: 700;">${data.status}</span>
            </div>
        `;

        // 6. Step 8 Action Plan Sequence
        if (data.actions && data.actions.length > 0) {
            actionsSection.style.display = "block";
            actionPlanTimeline.innerHTML = data.actions.map((act, i) => `
                <div class="action-step">
                    <span class="action-badge">Step ${i + 1}</span>
                    <span>MOVE: <b>${formatName(act.from)}</b> → <b>${formatName(act.to)}</b></span>
                </div>
            `).join("");
        } else {
            actionsSection.style.display = "none";
        }
    } else {
        formattedBox.innerHTML = `
            <div class="result-line">
                <span class="result-label">Status:</span>
                <span class="result-value" style="color: #dc2626; font-weight: 700;">${data.status || 'Failed'}</span>
            </div>
            <div class="result-line">
                <span class="result-label">Reason:</span>
                <span class="result-value">${data.message || 'No accessible corridor found to hospital.'}</span>
            </div>
        `;
        actionsSection.style.display = "none";
    }
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
        "dls": { name: "Depth-Limited (DLS)", paradigm: "Uninformed", fn: "Depth Limit = 5", optimal: false },
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
            badgeHtml = `<span class="table-tag tag-optimal">Optimal (Lowest Cost)</span>`;
        } else {
            badgeHtml = `<span class="table-tag tag-suboptimal">Suboptimal (+${item.cost - minCost} km)</span>`;
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
                <td>${item.expanded !== undefined ? item.expanded : '—'}</td>
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
        // Step 9: Dynamic re-routing
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
        container.innerHTML = `<span class="tag tag-empty">No roadblocks (All corridors free)</span>`;
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

// Helper: Format internal node names to human friendly Kerala location names
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
            strokeColor = "#ef4444";
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
                <circle cx="${midX}" cy="${midY}" r="12" fill="#ffffff" stroke="${blocked ? '#ef4444' : (onRoute ? '#2563eb' : '#94a3b8')}" stroke-width="1.5" />
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