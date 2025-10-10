/**
 * student.js
 * This file contains all the JavaScript logic specific to the student dashboard.
 * - Rendering rooms and invites
 * - Handling booking logic
 * - Managing invite countdowns and responses
 * - Creating booking groups and sending invites
 */

document.addEventListener('DOMContentLoaded', () => {
    // Check if we are on the student dashboard page
    if (document.getElementById('student-dashboard')) {
        initStudentDashboard();
    }
});

/**
 * Initializes the student dashboard by fetching and rendering necessary data.
 */
async function initStudentDashboard() {
    await renderRooms();
    await renderInvites();
    
    // Add event listeners to filters
    document.getElementById('room-type-filter').addEventListener('change', renderRooms);
    document.getElementById('date-filter').addEventListener('change', renderRooms);
}

/**
 * Fetches rooms from the API and renders them as cards in the UI.
 */
async function renderRooms() {
    const container = document.getElementById('rooms-container');
    if (!container) return;
    container.innerHTML = '<p class="text-slate-400 col-span-full">Loading rooms...</p>';
    
    const rooms = await api.getRooms();
    const typeFilter = document.getElementById('room-type-filter').value;
    const filteredRooms = rooms.filter(room => typeFilter === 'all' || room.type === typeFilter);

    container.innerHTML = '';
    if (filteredRooms.length === 0) {
        container.innerHTML = '<p class="text-slate-400 col-span-full">No available rooms match criteria.</p>';
        return;
    }

    filteredRooms.forEach(room => {
        const statusStyles = {
            available: { bg: 'bg-blue-900/50', text: 'text-blue-300', border: 'border-blue-500' },
            pending: { bg: 'bg-yellow-900/50', text: 'text-yellow-300', border: 'border-yellow-500' },
            booked: { bg: 'bg-red-900/50', text: 'text-red-400', border: 'border-red-500' },
        };
        const styles = statusStyles[room.status];
        const buttonHtml = room.status === 'available' 
            ? `<button onclick="handleBookRoom(${room.id})" class="mt-4 w-full px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition">Book Now</button>` 
            : `<button class="mt-4 w-full px-4 py-2 bg-slate-600 text-slate-400 rounded-lg cursor-not-allowed" disabled>${room.status.charAt(0).toUpperCase() + room.status.slice(1)}</button>`;
        
        const card = `
            <div class="border rounded-lg p-4 shadow-sm hover:shadow-lg transition-shadow duration-300 ${styles.bg} ${styles.border}">
                <div class="flex justify-between items-center"><h3 class="text-lg font-bold text-slate-100">Room ${room.id}</h3><span class="text-xs font-semibold px-2 py-1 rounded-full ${styles.bg} ${styles.text}">${room.status}</span></div>
                <p class="text-slate-400 capitalize">${room.type} Room</p>
                <p class="text-slate-200 font-semibold mt-2">₹${room.price}/month</p>
                ${buttonHtml}
            </div>`;
        container.insertAdjacentHTML('beforeend', card);
    });
}

/**
 * Handles the room booking process.
 * @param {number} roomId - The ID of the room to book.
 */
function handleBookRoom(roomId) {
    showToast(`Simulating booking for Room ${roomId}...`, 'info');
    api.bookRoom(roomId).then(res => {
        if (res.success) { 
            showToast(`Room ${roomId} booked successfully!`, 'success'); 
            renderRooms(); 
        } else { 
            showToast(res.message, 'error'); 
        }
    });
}

/**
 * Fetches and renders pending group invites.
 */
async function renderInvites() {
    const container = document.getElementById('invites-container');
    if (!container) return;
    container.innerHTML = '<p class="text-slate-400">Loading invites...</p>';
    
    const invites = await api.getInvites();
    
    // Clear any existing timers before re-rendering
    APP_STATE.timers.forEach(timerId => clearInterval(timerId));
    APP_STATE.timers = [];

    container.innerHTML = '';
    if (invites.length === 0) {
        container.innerHTML = '<p class="text-slate-400">No pending invites.</p>';
        return;
    }
    
    invites.forEach(invite => {
        const card = document.createElement('div');
        card.className = 'border border-slate-700 rounded-lg p-4 flex items-center justify-between shadow-sm bg-yellow-500/10';
        card.innerHTML = `
            <div>
                <p class="font-semibold text-slate-200">Invite from <span class="text-yellow-300">${invite.from}</span></p>
                <p class="text-sm text-slate-400">Group: ${invite.group}</p>
            </div>
            <div class="text-right">
                <div id="countdown-${invite.id}" class="text-sm font-mono text-red-400 mb-2"></div>
                <div class="flex space-x-2">
                    <button onclick="handleInviteResponse(${invite.id}, 'accepted')" class="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600 transition">Accept</button>
                    <button onclick="handleInviteResponse(${invite.id}, 'declined')" class="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition">Decline</button>
                </div>
            </div>`;
        container.appendChild(card);
        startInviteCountdown(invite);
    });
}

/**
 * Starts a 10-minute countdown timer for an invite.
 * @param {object} invite - The invite object.
 */
function startInviteCountdown(invite) {
    const el = document.getElementById(`countdown-${invite.id}`);
    const endTime = new Date(invite.createdAt).getTime() + 10 * 60 * 1000;
    
    const timerId = setInterval(() => {
        const distance = endTime - Date.now();
        if (distance < 0) {
            clearInterval(timerId);
            el.textContent = "Expired";
            el.parentElement.querySelector('.flex').innerHTML = '<p class="text-xs text-red-500">This invite has expired.</p>';
            return;
        }
        const minutes = Math.floor(distance / 60000);
        const seconds = Math.floor((distance % 60000) / 1000);
        el.textContent = `Expires in: ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
    }, 1000);
    
    APP_STATE.timers.push(timerId);
}

/**
 * Handles the user's response to an invite (accept/decline).
 * @param {number} inviteId - The ID of the invite.
 * @param {string} status - The response status ('accepted' or 'declined').
 */
function handleInviteResponse(inviteId, status) {
    api.updateInviteStatus(inviteId, status).then(() => {
        showToast(`Invite ${status}!`, status === 'accepted' ? 'success' : 'info');
        renderInvites();
    });
}

/**
 * Opens a modal for creating a new booking group and inviting members.
 */
function openCreateGroupModal() {
    const modalContent = `
        <div class="space-y-4">
            <div>
                <label for="group-name" class="block text-sm font-medium text-slate-300">Group Name</label>
                <input type="text" id="group-name" class="mt-1 block w-full rounded-md shadow-sm dark-input">
            </div>
            <div>
                <label for="invite-email" class="block text-sm font-medium text-slate-300">Invite Roommate (by email)</label>
                <input type="email" id="invite-email" class="mt-1 block w-full rounded-md shadow-sm dark-input">
            </div>
            <button onclick="handleSendInvite()" class="w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition">Send Invite</button>
        </div>`;
    openModal(modalContent, 'Create a Booking Group');
}

/**
 * Simulates sending an invite from the create group modal.
 */
function handleSendInvite() {
    const groupName = document.getElementById('group-name').value;
    const email = document.getElementById('invite-email').value;
    if (!groupName || !email) { 
        showToast('Please fill in all fields.', 'error'); 
        return; 
    }
    api.logStudentAction(`Sent invite to ${email} for group "${groupName}"`);
    showToast(`Invite sent to ${email} for group "${groupName}"!`, 'success');
    closeModal(document.querySelector('.fixed.inset-0').id);
}

/**
 * Renders the student's audit log in a modal.
 */
async function renderStudentAuditLog() {
    const logData = await api.getAuditLog('student');
    let logHtml = `<div class="space-y-2 max-h-96 overflow-y-auto">`;
    logData.forEach(log => {
        logHtml += `<div class="p-2 border-b border-slate-700"><p class="font-semibold text-sm text-slate-200">${log.action}</p><p class="text-xs text-slate-400">${new Date(log.timestamp).toLocaleString()}</p></div>`;
    });
    openModal(logHtml + '</div>', 'Student Activity Log');
}
