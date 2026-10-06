// Emergency Route Planner - Frontend Logic

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
    // Automatically perform initial dispatch for Cardiac Emergency E002
    dispatchEmergency();
});

// Fetch latest network state from backend
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

    detailsBox.innerHTML = `
        <div class="meta-row">
            <span class="meta-key">Type:</span>
            <span class="meta-val">${emergency.type}</span>
        </div>
        <div class="meta-row">
            <span class="meta-key">Priority:</span>
            <span class="${priorityClass}">${emergency.priority}</span>
        </div>
        <div class="meta-row">
            <span class="meta-key">Incident Location:</span>
            <span class="meta-val">${emergency.location}</span>
        </div>
        <div class="meta-row">
            <span class="meta-key">Required Equipment:</span>
            <span class="meta-val">${emergency.required_equipment.join(", ")}</span>
        </div>
    `;
}

// Main Dispatch: Executes Steps 1 - 9
async function dispatchEmergency() {
    const emergencyId = document.getElementById("emergencySelect").value;
    const algorithm = document.getElementById("dispatchAlgorithm").value;

    const statusBadge = document.getElementById("routeStatusBadge");
    statusBadge.className = "status-badge status-idle";
    statusBadge.innerText = "Processing...";

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

        renderDispatchOutput(data);
        renderComparisonTable(data.comparisons, data.algorithm);
        updateBlockedRoadsUi();

        if (data.success) {
            currentRoutePath = data.path || [];
            statusBadge.className = "status-badge status-success";
            statusBadge.innerText = "Route Generated";
        } else {
            currentRoutePath = [];
            statusBadge.className = "status-badge status-danger";
            statusBadge.innerText = "Dispatch Failed";
        }

        renderNetworkSvg();
    } catch (err) {
        console.error("Dispatch error:", err);
        statusBadge.className = "status-badge status-danger";
        statusBadge.innerText = "Network Error";
    }
}

// Render formatted result card, CSP & Knowledge Base panels
function renderDispatchOutput(data) {
    const cspOutput = document.getElementById("cspOutput");
    const kbOutput = document.getElementById("kbOutput");
    const formattedBox = document.getElementById("formattedResultBox");
    const actionsSection = document.getElementById("actionsSection");
    const actionPlanTimeline = document.getElementById("actionPlanTimeline");

    // 1. CSP Vehicle Allocation Box
    if (data.vehicle) {
        cspOutput.innerHTML = `
            <div>
                <span class="intel-pill pill-vehicle">🚑 ${data.vehicle.id}</span>
                <span style="color: #94a3b8;">${data.vehicle.type}</span>
            </div>
            <div style="margin-top: 4px; font-size: 11px;">
                <b>Stationed:</b> ${data.vehicle.location}
            </div>
            <div style="font-size: 11px;">
                <b>Equipment:</b> ${data.vehicle.equipment.join(", ")}
            </div>
            <div style="color: #34d399; font-size: 11px; margin-top: 4px;">
                ✓ Constraints Satisfied
            </div>
        `;
    } else {
        cspOutput.innerHTML = `<span style="color: #ef4444;">No vehicle satisfied constraints</span>`;
    }

    // 2. Knowledge Base & Rule Deductions
    if (data.facts && data.facts.length > 0) {
        const pills = data.facts.map(fact => {
            const isRuleConclusion = fact.includes("USE_") || fact.includes("AVOID_") || fact.includes("CAN_BE");
            const cls = isRuleConclusion ? "pill-rule" : "pill-fact";
            return `<span class="intel-pill ${cls}">${fact}</span>`;
        }).join("");
        kbOutput.innerHTML = `
            <div><b>Active Facts & Inferences:</b></div>
            <div style="margin-top: 4px;">${pills}</div>
        `;
    } else {
        kbOutput.innerHTML = `<span class="placeholder-text">No active inferences</span>`;
    }

    // 3. Formatted Result Box (Exact Format from user prompt)
    if (data.success) {
        const em = data.emergency || {};
        const v = data.vehicle || {};
        const pathFormatted = data.path.join(" → ");

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
                <span class="result-label">Vehicle:</span>
                <span class="result-value result-highlight">${v.id || 'N/A'} (${v.type || ''})</span>
            </div>
            <div class="result-line">
                <span class="result-label">Route:</span>
                <span class="result-path">${pathFormatted}</span>
            </div>
            <div class="result-line">
                <span class="result-label">Total Cost:</span>
                <span class="result-value">${data.cost}</span>
            </div>
            <div class="result-line">
                <span class="result-label">Algorithm:</span>
                <span class="result-value">${data.algorithm}</span>
            </div>
            <div class="result-line">
                <span class="result-label">Nodes Expanded:</span>
                <span class="result-value">${data.expanded !== undefined ? data.expanded : 'N/A'}</span>
            </div>
            <div class="result-line">
                <span class="result-label">Status:</span>
                <span class="result-value" style="color: #34d399;">${data.status}</span>
            </div>
        `;

        // 4. Action sequence
        if (data.actions && data.actions.length > 0) {
            actionsSection.style.display = "block";
            actionPlanTimeline.innerHTML = data.actions.map((act, i) => `
                <div class="action-step">
                    <span class="action-badge">Step ${i + 1}</span>
                    <span>MOVE: <b>${act.from}</b> → <b>${act.to}</b></span>
                </div>
            `).join("");
        } else {
            actionsSection.style.display = "none";
        }
    } else {
        formattedBox.innerHTML = `
            <div class="result-line">
                <span class="result-label">Status:</span>
                <span class="result-value" style="color: #ef4444;">${data.status || 'Failed'}</span>
            </div>
            <div class="result-line">
                <span class="result-label">Message:</span>
                <span class="result-value">${data.message || 'No route available'}</span>
            </div>
        `;
        actionsSection.style.display = "none";
    }
}

// Render comparative analysis across all 6 search algorithms
function renderComparisonTable(comparisons, activeAlgo) {
    const tbody = document.getElementById("benchmarkTbody");
    if (!comparisons || comparisons.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">No comparison data available</td></tr>`;
        return;
    }

    const algoMeta = {
        "bfs": { name: "BFS", type: "Uninformed", optimal: true },
        "dfs": { name: "DFS", type: "Uninformed", optimal: false },
        "dls": { name: "DLS", type: "Uninformed", optimal: false },
        "iddfs": { name: "IDDFS", type: "Uninformed", optimal: true },
        "greedy": { name: "Greedy Best-First", type: "Informed", optimal: false },
        "astar": { name: "A* Search", type: "Informed", optimal: true }
    };

    // Find minimum cost among successful routes
    const successfulCosts = comparisons.filter(c => c.success).map(c => c.cost);
    const minCost = successfulCosts.length > 0 ? Math.min(...successfulCosts) : null;

    tbody.innerHTML = comparisons.map(item => {
        const algoKey = (item.algorithm || "").toLowerCase();
        const meta = algoMeta[algoKey] || { name: item.algorithm, type: "Search", optimal: false };
        const isOptimal = item.success && item.cost === minCost;

        let badgeHtml = "";
        if (!item.success) {
            badgeHtml = `<span class="table-tag tag-failed">No Route</span>`;
        } else if (isOptimal) {
            badgeHtml = `<span class="table-tag tag-optimal">Optimal</span>`;
        } else {
            badgeHtml = `<span class="table-tag tag-suboptimal">Suboptimal</span>`;
        }

        const typeTag = meta.type === "Informed" ? "tag-informed" : "tag-uninformed";
        const pathStr = item.success ? item.path.join(" → ") : "—";

        return `
            <tr>
                <td><b>${meta.name}</b></td>
                <td><span class="table-tag ${typeTag}">${meta.type}</span></td>
                <td style="font-family: var(--font-mono); font-size: 12px;">${pathStr}</td>
                <td><b>${item.success ? item.cost : '—'}</b></td>
                <td>${item.expanded !== undefined ? item.expanded : '—'}</td>
                <td>${badgeHtml}</td>
            </tr>
        `;
    }).join("");
}

// Re-run comparative analysis explicitly
async function runComparativeAnalysis() {
    await dispatchEmergency();
}

// Block / Open road from select dropdown
async function toggleBlockSelectedRoad(isBlock) {
    const val = document.getElementById("blockRoadSelect").value;
    const [source, destination] = val.split("|");
    await performRoadToggle(source, destination, isBlock);
}

// Toggle road by source and destination
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
        // Dynamically re-calculate route (Step 9)
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
        container.innerHTML = `<span class="tag tag-empty">No blocked roads (All roads clear)</span>`;
        return;
    }

    container.innerHTML = currentBlockedRoads.map(([u, v]) => `
        <span class="road-tag">
            🚧 ${u} ⟷ ${v}
            <span class="road-tag-close" onclick="performRoadToggle('${u}', '${v}', false)" title="Unblock">×</span>
        </span>
    `).join("");
}

// Helper: check if a road is blocked
function isRoadBlocked(u, v) {
    const key = [u, v].sort().join("|");
    return currentBlockedRoads.some(([a, b]) => [a, b].sort().join("|") === key);
}

// Helper: check if a road segment is part of the active route
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

// Coordinate projection from heuristic grid into SVG viewBox
function projectCoord(node) {
    const coords = networkData.coordinates || {};
    const pt = coords[node] || [0, 0];
    const x = pt[0];
    const y = pt[1];

    // X ranges from 0 (Hospital) to 10 (Emergency) -> project to [90, 750]
    const svgX = 90 + (x / 10) * 660;

    // Y ranges from -2 (Junction_C, F) to 4 (Junction_B)
    // In SVG, y=0 is top. Let's map y=-2 to 340, y=0 to 210, y=4 to 70.
    const svgY = 210 - (y / 3) * 105;

    return { x: svgX, y: svgY };
}

// Render Interactive SVG Network Map (White Theme)
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

    // 1. Draw Road Edges
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
                <!-- Road cost badge -->
                <circle cx="${midX}" cy="${midY}" r="11" fill="#ffffff" stroke="${blocked ? '#ef4444' : (onRoute ? '#2563eb' : '#94a3b8')}" stroke-width="1.5" />
                <text x="${midX}" y="${midY + 4}" fill="${blocked ? '#dc2626' : (onRoute ? '#1d4ed8' : '#475569')}" 
                      font-size="11" font-family="'JetBrains Mono', monospace" font-weight="700" text-anchor="middle">${blocked ? '✕' : road.cost}</text>
            </g>
        `;
    });

    // 2. Draw Nodes (Junctions, Hospital, Emergency)
    const nodes = Object.keys(networkData.coordinates || {});
    nodes.forEach(node => {
        const p = projectCoord(node);
        const isHospital = node === "Hospital";
        const isEmergency = node === "Emergency";
        const onRoute = currentRoutePath.includes(node);

        let fillColor = "#ffffff";
        let strokeColor = "#64748b";
        let radius = 16;
        let icon = "";

        if (isHospital) {
            fillColor = "#ecfdf5";
            strokeColor = "#059669";
            radius = 20;
            icon = "🏥";
        } else if (isEmergency) {
            fillColor = "#fef2f2";
            strokeColor = "#dc2626";
            radius = 20;
            icon = "🚨";
        } else if (onRoute) {
            fillColor = "#eff6ff";
            strokeColor = "#2563eb";
            radius = 17;
        }

        // Clean label without prefix
        const displayLabel = node.replace("Junction_", "J-");

        svgHtml += `
            <g class="node-group">
                <circle cx="${p.x}" cy="${p.y}" r="${radius}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2.5" />
                ${icon ? `
                    <text x="${p.x}" y="${p.y + 6}" font-size="15" text-anchor="middle">${icon}</text>
                ` : `
                    <circle cx="${p.x}" cy="${p.y}" r="4" fill="${onRoute ? '#2563eb' : '#64748b'}" />
                `}
                <text x="${p.x}" y="${p.y + radius + 15}" fill="#0f172a" font-size="12" font-weight="700" text-anchor="middle">
                    ${displayLabel}
                </text>
            </g>
        `;
    });

    svg.innerHTML = svgHtml;
}