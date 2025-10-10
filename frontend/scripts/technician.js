/**
 * technician.js
 * This file contains all JavaScript logic specific to the technician dashboard.
 * - Rendering the hostel floor plan heatmap
 * - Displaying and managing assigned work orders
 */

document.addEventListener('DOMContentLoaded', () => {
    // Check if we are on the technician dashboard page
    if (document.getElementById('technician-dashboard')) {
        initTechnicianDashboard();
    }
});

/**
 * Initializes the technician dashboard.
 */
async function initTechnicianDashboard() {
    renderHostelMapSVG();
    await renderHeatmap();
    await renderTasksList();
}

/**
 * Renders the SVG for the hostel floor plan.
 */
function renderHostelMapSVG() {
    const container = document.getElementById('heatmap-container');
    if (!container) return;
    container.innerHTML = `
        <svg class="hostel-map-svg" viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg">
            <rect class="room" id="room-101" x="10" y="10" width="80" height="80" data-room-id="101" /><text x="50" y="55" font-size="12" text-anchor="middle" fill="#ccc" pointer-events="none">101</text>
            <rect class="room" id="room-102" x="100" y="10" width="80" height="80" data-room-id="102"/><text x="140" y="55" font-size="12" text-anchor="middle" fill="#ccc" pointer-events="none">102</text>
            <rect class="room" id="room-103" x="190" y="10" width="80" height="80" data-room-id="103"/><text x="230" y="55" font-size="12" text-anchor="middle" fill="#ccc" pointer-events="none">103</text>
            <rect class="room" id="room-104" x="280" y="10" width="80" height="80" data-room-id="104"/><text x="320" y="55" font-size="12" text-anchor="middle" fill="#ccc" pointer-events="none">104</text>
            <rect class="room" id="room-201" x="10" y="110" width="80" height="80" data-room-id="201"/><text x="50" y="155" font-size="12" text-anchor="middle" fill="#ccc" pointer-events="none">201</text>
            <rect class="room" id="room-202" x="100" y="110" width="80" height="80" data-room-id="202"/><text x="140" y="155" font-size="12" text-anchor="middle" fill="#ccc" pointer-events="none">202</text>
            <rect class="room" id="room-203" x="190" y="110" width="80" height="80" data-room-id="203"/><text x="230" y="155" font-size="12" text-anchor="middle" fill="#ccc" pointer-events="none">203</text>
            <rect class="room" id="room-204" x="280" y="110" width="80" height="80" data-room-id="204"/><text x="320" y="155" font-size="12" text-anchor="middle" fill="#ccc" pointer-events="none">204</text>
        </svg>`;
}

/**
 * Calculates and applies colors to the heatmap based on work order density.
 */
async function renderHeatmap() {
    const workOrders = await api.getWorkOrders();
    const roomTaskCount = workOrders.reduce((acc, order) => {
        if (order.status !== 'completed') {
            acc[order.roomId] = (acc[order.roomId] || 0) + 1;
        }
        return acc;
    }, {});

    const colorScale = {
        1: '#22c55e90', // Low density (green)
        2: '#f59e0b90', // Medium density (yellow)
        3: '#ef444490', // High density (red)
    };
    
    document.querySelectorAll('.hostel-map-svg .room').forEach(roomEl => {
        const roomId = roomEl.dataset.roomId;
        const taskCount = roomTaskCount[roomId] || 0;
        roomEl.style.fill = colorScale[taskCount] || (taskCount > 3 ? '#ef4444' : '#334155'); // Default or very high
        
        const tooltip = document.getElementById('heatmap-tooltip');
        roomEl.addEventListener('mousemove', e => {
            const roomOrders = workOrders.filter(o => o.roomId == roomId && o.status !== 'completed');
            tooltip.innerHTML = `<b>Room ${roomId}</b>${roomOrders.length > 0 ? `<br/>Tasks: ${roomOrders.map(o => o.task).join(', ')}` : `<br/>No pending tasks.`}`;
            tooltip.style.display = 'block';
            tooltip.style.left = `${e.pageX + 15}px`;
            tooltip.style.top = `${e.pageY + 15}px`;
        });
        roomEl.addEventListener('mouseleave', () => { tooltip.style.display = 'none'; });
    });
}

/**
 * Fetches and renders the list of assigned tasks for the technician.
 */
async function renderTasksList() {
    const container = document.getElementById('tasks-container');
    if (!container) return;
    container.innerHTML = '<p class="text-slate-400">Loading tasks...</p>';
    
    const workOrders = (await api.getWorkOrders()).filter(o => o.status !== 'completed');
    container.innerHTML = '';
    
    if (workOrders.length === 0) {
        container.innerHTML = '<p class="text-slate-400">No pending tasks. Great job!</p>';
        return;
    }

    const priorityStyles = { high: 'border-red-500', medium: 'border-yellow-500', low: 'border-blue-500' };
    const statusStyles = { pending: 'bg-yellow-500/20 text-yellow-300', 'in-progress': 'bg-blue-500/20 text-blue-300' };
    
    workOrders.forEach(order => {
        const card = `
            <div class="p-4 rounded-lg bg-slate-700/50 border-l-4 ${priorityStyles[order.priority]}">
                <div class="flex justify-between items-start">
                    <div>
                        <p class="font-bold text-slate-200">Room ${order.roomId}: ${order.task}</p>
                        <p class="text-xs text-slate-400">Priority: <span class="font-semibold capitalize">${order.priority}</span></p>
                    </div>
                    <span class="text-xs font-semibold px-2 py-1 rounded-full ${statusStyles[order.status]}">${order.status}</span>
                </div>
                <div class="mt-3 flex justify-end space-x-2">
                    ${order.status === 'pending' ? `<button onclick="updateTaskStatus(${order.id}, 'in-progress')" class="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">Start</button>` : ''}
                    ${order.status === 'in-progress' ? `<button onclick="updateTaskStatus(${order.id}, 'completed')" class="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700">Complete</button>` : ''}
                </div>
            </div>`;
        container.insertAdjacentHTML('beforeend', card);
    });
}

/**
 * Updates the status of a work order.
 * @param {number} orderId - The ID of the work order.
 * @param {string} status - The new status ('in-progress' or 'completed').
 */
function updateTaskStatus(orderId, status) {
    api.updateWorkOrderStatus(orderId, status).then(() => {
        showToast(`Task status updated to ${status}.`, 'success');
        renderTasksList();
        renderHeatmap();
    });
}
