// API Base URL
const API_URL = window.location.origin;

// Current user state
let currentGuest = null;

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    loadGuests();
    loadComments();
    loadPhotos();
    setupEventListeners();
    checkCurrentUser();
});

// Setup event listeners
function setupEventListeners() {
    // RSVP form
    const rsvpForm = document.getElementById('rsvpForm');
    const buttons = rsvpForm.querySelectorAll('button[type="submit"]');
    
    buttons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const attending = button.dataset.attending === 'true';
            handleRSVP(attending);
        });
    });

    // Comment form
    const commentForm = document.getElementById('commentForm');
    commentForm.addEventListener('submit', (e) => {
        e.preventDefault();
        handleComment();
    });

    // Photo form
    const photoForm = document.getElementById('photoForm');
    photoForm.addEventListener('submit', (e) => {
        e.preventDefault();
        handlePhoto();
    });
}

// Check if user is already logged in (stored in localStorage)
function checkCurrentUser() {
    const storedGuest = localStorage.getItem('currentGuest');
    if (storedGuest) {
        currentGuest = JSON.parse(storedGuest);
        updateUserInterface();
    }
}

// Update UI based on user login state
function updateUserInterface() {
    if (currentGuest) {
        document.getElementById('currentUser').textContent = currentGuest.name;
        document.getElementById('userInfo').style.display = 'block';
        document.getElementById('userInfoPhotos').style.display = 'block';
        document.getElementById('commentForm').style.display = 'block';
        loadComments(); // Reload to show form
    }
}

// Handle RSVP submission
async function handleRSVP(attending) {
    const nameInput = document.getElementById('nameInput');
    const name = nameInput.value.trim();
    
    if (!name) {
        showMessage('Prosím, zadaj svoje meno!', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/rsvp`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name, attending })
        });

        const data = await response.json();
        
        if (response.ok) {
            // Store current guest
            currentGuest = { id: data.id, name: data.name, avatar_color: data.avatar_color };
            localStorage.setItem('currentGuest', JSON.stringify(currentGuest));
            
            showMessage(
                attending ? `Super! Tešíme sa na teba, ${name}! 🎉` : `Škoda, že nemôžeš prísť, ${name} 😢`,
                'success'
            );
            nameInput.value = '';
            loadGuests();
            updateUserInterface();
        } else {
            showMessage('Niečo sa pokazilo: ' + data.error, 'error');
        }
    } catch (error) {
        showMessage('Chyba pri odosielaní: ' + error.message, 'error');
    }
}

// Load and display guests
async function loadGuests() {
    try {
        const response = await fetch(`${API_URL}/api/guests`);
        const guests = await response.json();
        
        displayGuests(guests);
    } catch (error) {
        console.error('Error loading guests:', error);
    }
}

// Display guests in bubbles
function displayGuests(guests) {
    const attendingContainer = document.getElementById('attendingGuests');
    const notAttendingContainer = document.getElementById('notAttendingGuests');
    
    const attending = guests.filter(g => g.attending);
    const notAttending = guests.filter(g => !g.attending);
    
    // Display attending guests
    if (attending.length === 0) {
        attendingContainer.innerHTML = '<div class="loading">Zatiaľ nikto nepotvrdil účasť...</div>';
    } else {
        attendingContainer.innerHTML = attending.map(guest => {
            const initials = getInitials(guest.name);
            return `
                <div class="bubble" style="background-color: ${guest.avatar_color}" title="${guest.name}">
                    ${initials}
                </div>
            `;
        }).join('');
    }
    
    // Display not attending guests
    if (notAttending.length === 0) {
        notAttendingContainer.innerHTML = '<div class="loading">Všetci prídu! 🎉</div>';
    } else {
        notAttendingContainer.innerHTML = notAttending.map(guest => `
            <span class="not-attending-item">${guest.name}</span>
        `).join('');
    }
}

// Handle comment submission
async function handleComment() {
    if (!currentGuest) {
        showMessage('Najprv sa prihlás cez RSVP!', 'error');
        return;
    }

    const commentInput = document.getElementById('commentInput');
    const comment = commentInput.value.trim();
    
    if (!comment) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/comments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                guest_id: currentGuest.id, 
                comment 
            })
        });

        if (response.ok) {
            commentInput.value = '';
            loadComments();
        } else {
            const data = await response.json();
            showMessage('Chyba: ' + data.error, 'error');
        }
    } catch (error) {
        showMessage('Chyba pri odosielaní komentára: ' + error.message, 'error');
    }
}

// Load and display comments
async function loadComments() {
    try {
        const response = await fetch(`${API_URL}/api/comments`);
        const comments = await response.json();
        
        displayComments(comments);
    } catch (error) {
        console.error('Error loading comments:', error);
    }
}

// Display comments
function displayComments(comments) {
    const commentsList = document.getElementById('commentsList');
    
    if (!currentGuest) {
        commentsList.innerHTML = '<div class="loading">Najprv sa prihlás cez RSVP...</div>';
        return;
    }
    
    if (comments.length === 0) {
        commentsList.innerHTML = '<div class="loading">Zatiaľ žiadne komentáre. Buď prvý!</div>';
        return;
    }
    
    commentsList.innerHTML = comments.map(comment => {
        const initials = getInitials(comment.name);
        const timeAgo = getTimeAgo(comment.created_at);
        
        return `
            <div class="comment-item">
                <div class="comment-header">
                    <div class="comment-avatar" style="background-color: ${comment.avatar_color}">
                        ${initials}
                    </div>
                    <span class="comment-author">${comment.name}</span>
                    <span class="comment-time">${timeAgo}</span>
                </div>
                <div class="comment-text">${escapeHtml(comment.comment)}</div>
            </div>
        `;
    }).join('');
}

// Handle photo submission
async function handlePhoto() {
    if (!currentGuest) {
        showMessage('Najprv sa prihlás cez RSVP!', 'error');
        return;
    }

    const photoUrlInput = document.getElementById('photoUrlInput');
    let photoUrl = photoUrlInput.value.trim();
    
    if (!photoUrl) {
        return;
    }

    // Convert Google Drive link to direct image link
    photoUrl = convertGoogleDriveUrl(photoUrl);

    try {
        const response = await fetch(`${API_URL}/api/photos`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                guest_id: currentGuest.id, 
                photo_url: photoUrl 
            })
        });

        if (response.ok) {
            photoUrlInput.value = '';
            loadPhotos();
            showMessage('Fotka pridaná! 📸', 'success');
        } else {
            const data = await response.json();
            showMessage('Chyba: ' + data.error, 'error');
        }
    } catch (error) {
        showMessage('Chyba pri pridávaní fotky: ' + error.message, 'error');
    }
}

// Load and display photos
async function loadPhotos() {
    try {
        const response = await fetch(`${API_URL}/api/photos`);
        const photos = await response.json();
        
        displayPhotos(photos);
    } catch (error) {
        console.error('Error loading photos:', error);
    }
}

// Display photos
function displayPhotos(photos) {
    const photosList = document.getElementById('photosList');
    
    if (photos.length === 0) {
        photosList.innerHTML = '<div class="loading">Zatiaľ žiadne fotky. Pridaj prvú!</div>';
        return;
    }
    
    photosList.innerHTML = photos.map(photo => `
        <div class="photo-item">
            <img src="${photo.photo_url}" alt="Party photo" loading="lazy" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22200%22%3E%3Crect fill=%22%23ddd%22 width=%22200%22 height=%22200%22/%3E%3Ctext fill=%22%23999%22 x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22%3E📷%3C/text%3E%3C/svg%3E'">
            <div class="photo-overlay">
                ${photo.name}
            </div>
        </div>
    `).join('');
}

// Utility functions

function getInitials(name) {
    return name
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);
}

function showMessage(text, type = 'success') {
    const messageDiv = document.getElementById('rsvpMessage');
    messageDiv.textContent = text;
    messageDiv.className = `message ${type} show`;
    
    setTimeout(() => {
        messageDiv.classList.remove('show');
    }, 5000);
}

function getTimeAgo(timestamp) {
    const now = new Date();
    const past = new Date(timestamp);
    const diffMs = now - past;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Práve teraz';
    if (diffMins < 60) return `Pred ${diffMins} min`;
    if (diffHours < 24) return `Pred ${diffHours} hod`;
    return `Pred ${diffDays} dňami`;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function convertGoogleDriveUrl(url) {
    // Convert Google Drive sharing link to direct image link
    const match = url.match(/\/d\/(.+?)\//);
    if (match) {
        return `https://drive.google.com/uc?export=view&id=${match[1]}`;
    }
    return url;
}

