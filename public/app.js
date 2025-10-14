const API_URL = window.location.origin;
let currentGuest = null;

document.addEventListener('DOMContentLoaded', () => {
    loadGuests();
    loadComments();
    loadPhotos();
    loadPoll();
    setupEventListeners();
    checkCurrentUser();
});

function setupEventListeners() {
    const buttons = document.querySelectorAll('#rsvpForm button[type="submit"]');
    buttons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            handleRSVP(btn.dataset.attending === 'true');
        });
    });

    document.getElementById('commentForm').addEventListener('submit', (e) => {
        e.preventDefault();
        handleComment();
    });

    document.getElementById('photoForm').addEventListener('submit', (e) => {
        e.preventDefault();
        handlePhoto();
    });
}

function checkCurrentUser() {
    const storedGuest = localStorage.getItem('currentGuest');
    if (storedGuest) {
        currentGuest = JSON.parse(storedGuest);
        updateUserInterface();
    }
}

function updateUserInterface() {
    if (currentGuest) {
        document.getElementById('currentUser').textContent = currentGuest.name;
        document.getElementById('userInfo').style.display = 'block';
        document.getElementById('userInfoPhotos').style.display = 'block';
        document.getElementById('commentForm').style.display = 'block';
        document.getElementById('addOptionForm').style.display = 'block';
        loadComments();
        loadPoll();
    }
}

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
            currentGuest = { id: data.id, name: data.name, avatar_color: data.avatar_color };
            localStorage.setItem('currentGuest', JSON.stringify(currentGuest));
            showMessage(attending ? `Super! Tešíme sa na teba, ${name}! 🎉` : `Škoda ${name} 😢`, 'success');
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

async function loadGuests() {
    try {
        const response = await fetch(`${API_URL}/api/guests`);
        const guests = await response.json();
        
        displayGuests(guests);
    } catch (error) {
        console.error('Error loading guests:', error);
    }
}

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
            const emoji = getQuirkyEmoji(guest.name);
            return `
                <div class="bubble" style="background-color: ${guest.avatar_color}" title="${guest.name}">
                    <div class="bubble-emoji">${emoji}</div>
                    <div class="bubble-name">${guest.name.split(' ')[0]}</div>
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

async function loadComments() {
    try {
        const response = await fetch(`${API_URL}/api/comments`);
        const comments = await response.json();
        
        displayComments(comments);
    } catch (error) {
        console.error('Error loading comments:', error);
    }
}

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
        const emoji = getQuirkyEmoji(comment.name);
        const timeAgo = getTimeAgo(comment.created_at);
        
        return `
            <div class="comment-item">
                <div class="comment-header">
                    <div class="comment-avatar" style="background-color: ${comment.avatar_color}">
                        ${emoji}
                    </div>
                    <span class="comment-author">${comment.name}</span>
                    <span class="comment-time">${timeAgo}</span>
                </div>
                <div class="comment-text">${escapeHtml(comment.comment)}</div>
            </div>
        `;
    }).join('');
}

async function handlePhoto() {
    if (!currentGuest) {
        showMessage('Najprv sa prihlás cez RSVP!', 'error');
        return;
    }

    const input = document.getElementById('photoUrlInput');
    let photoUrl = input.value.trim();
    if (!photoUrl) return;
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
            input.value = '';
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

async function loadPhotos() {
    try {
        const response = await fetch(`${API_URL}/api/photos`);
        const photos = await response.json();
        
        displayPhotos(photos);
    } catch (error) {
        console.error('Error loading photos:', error);
    }
}

function displayPhotos(photos) {
    const photosList = document.getElementById('photosList');
    
    if (photos.length === 0) {
        photosList.innerHTML = '<div class="loading">Zatiaľ žiadne fotky. Pridaj prvú!</div>';
        return;
    }
    
    photosList.innerHTML = photos.map(photo => `
        <div class="photo-item">
            <img src="${photo.photo_url}" 
                 alt="Party photo" 
                 loading="lazy" 
                 onclick="openLightbox('${photo.photo_url}', '${photo.name}')"
                 onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22200%22%3E%3Crect fill=%22%23ddd%22 width=%22200%22 height=%22200%22/%3E%3Ctext fill=%22%23999%22 x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22%3E📷%3C/text%3E%3C/svg%3E'">
            <div class="photo-overlay">
                ${photo.name}
            </div>
        </div>
    `).join('');
}

function openLightbox(imageUrl, caption) {
    const lightbox = document.getElementById('photoLightbox');
    const lightboxImg = document.getElementById('lightboxImage');
    const lightboxCaption = document.getElementById('lightboxCaption');
    
    lightbox.classList.add('active');
    lightboxImg.src = imageUrl;
    lightboxCaption.textContent = `Pridané: ${caption}`;
    document.body.style.overflow = 'hidden';
}

function closeLightbox() {
    document.getElementById('photoLightbox').classList.remove('active');
    document.body.style.overflow = 'auto';
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeLightbox();
});

function getInitials(name) {
    return name
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);
}

function getQuirkyEmoji(name) {
    const quirkyEmojis = [
        '🦖', '🦕', '🦄', '🦙', '🦥', '🦦', '🦨', '🦔', '🦇', '🐙', 
        '🦑', '🦞', '🦀', '🐡', '🦐', '🦚', '🦜', '🦩', '🦢', '🐧',
        '🦭', '🦈', '🐊', '🦎', '🐍', '🐢', '🦗', '🦟', '🦠', '🧫',
        '🍄', '🌵', '🌶️', '🥑', '🍆', '🥔', '🧄', '🧅', '🥨', '🧇',
        '🎩', '👑', '🎪', '🎭', '🎨', '🎯', '🎲', '🎰', '🧲', '🔮',
        '🌮', '🌯', '🥙', '🧆', '🥘', '🍕', '🌭', '🍔', '🍟', '🥐',
        '🦴', '👾', '🤖', '👽', '🛸', '🚀', '🛹', '🎸', '🥁', '🎺',
        '🧩', '🎮', '🕹️', '🎲', '🧸', '🪀', '🪁', '🎪', '🎡', '🎢',
        '🧙', '🧚', '🧛', '🧜', '🧝', '🧞', '🧟', '🦸', '🦹', '🥷'
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return quirkyEmojis[Math.abs(hash) % quirkyEmojis.length];
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
    const match = url.match(/\/d\/(.+?)\//);
    return match ? `https://drive.google.com/uc?export=view&id=${match[1]}` : url;
}

function addToGoogleCalendar() {
    const e = {
        text: 'Dekolaudačka 🎉',
        dates: '20251024T190000/20251024T230000',
        details: 'Posledná párty pred odchodom z domu! Nezabudni prísť! 🎊',
        location: 'Horovo náměstí 1074/2, Prague',
        ctz: 'Europe/Prague'
    };
    window.open(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(e.text)}&dates=${e.dates}&details=${encodeURIComponent(e.details)}&location=${encodeURIComponent(e.location)}&ctz=${e.ctz}`, '_blank');
}

function downloadICS() {
    const e = {
        title: 'Dekolaudačka 🎉',
        start: '20251024T190000',
        end: '20251024T230000',
        description: 'Posledná párty pred odchodom z domu!',
        location: 'Horovo náměstí 1074/2, Prague'
    };
    const ics = `BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nDTSTART:${e.start}\nDTEND:${e.end}\nSUMMARY:${e.title}\nDESCRIPTION:${e.description}\nLOCATION:${e.location}\nEND:VEVENT\nEND:VCALENDAR`;
    const blob = new Blob([ics], { type: 'text/calendar' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'dekolaudacka.ics';
    a.click();
}

async function loadPoll() {
    try {
        const res = await fetch(`${API_URL}/api/poll`);
        displayPoll(await res.json());
    } catch (e) {
        console.error(e);
    }
}

function displayPoll(data) {
    const pollOptions = document.getElementById('pollOptions');
    if (!data || data.length === 0) {
        pollOptions.innerHTML = '<div class="loading">Žiadne možnosti...</div>';
        return;
    }
    const totalVotes = data.reduce((sum, o) => sum + o.vote_count, 0);
    
    pollOptions.innerHTML = data.map(o => {
        const pct = totalVotes > 0 ? (o.vote_count / totalVotes * 100).toFixed(0) : 0;
        const voted = currentGuest && o.voters && o.voters.includes(currentGuest.name);
        const voters = o.voters || [];
        
        return `<div class="poll-option ${voted ? 'voted' : ''} ${!currentGuest ? 'disabled' : ''}" onclick="handlePollVote(${o.id})">
            <div class="poll-option-bar" style="width: ${pct}%"></div>
            <div class="poll-option-header">
                <div class="poll-option-label"><span>${o.name}</span></div>
                <span class="poll-option-votes">${o.vote_count} ${o.vote_count === 1 ? 'hlas' : o.vote_count < 5 ? 'hlasy' : 'hlasov'}</span>
            </div>
            ${voters.length ? `<div class="poll-option-voters">👥 ${voters.join(', ')}</div>` : ''}
        </div>`;
    }).join('');
    
    if (!currentGuest) {
        pollOptions.innerHTML += '<p style="text-align: center; color: #868e96; margin-top: 15px; font-size: 0.9rem;">💡 Najprv sa prihlás cez RSVP, aby si mohol hlasovať</p>';
    }
}

async function handlePollVote(optionId) {
    if (!currentGuest) {
        showPollMessage('Najprv sa prihlás cez RSVP!', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/poll/vote`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                guest_id: currentGuest.id,
                option_id: optionId
            })
        });

        const data = await response.json();
        
        if (response.ok) {
            loadPoll(); // Reload poll to show updated votes
            if (data.action === 'added') {
                showPollMessage('Hlas pridaný! 👍', 'success');
            } else {
                showPollMessage('Hlas odobratý', 'success');
            }
        } else {
            showPollMessage('Chyba: ' + data.error, 'error');
        }
    } catch (error) {
        showPollMessage('Chyba pri hlasovaní: ' + error.message, 'error');
    }
}

function showPollMessage(text, type = 'success') {
    const messageDiv = document.getElementById('pollMessage');
    messageDiv.textContent = text;
    messageDiv.className = `message ${type} show`;
    
    setTimeout(() => {
        messageDiv.classList.remove('show');
    }, 3000);
}

async function addCustomOption() {
    if (!currentGuest) {
        showPollMessage('Najprv sa prihlás cez RSVP!', 'error');
        return;
    }

    const nameInput = document.getElementById('customOptionName');
    const name = nameInput.value.trim();

    if (!name) {
        showPollMessage('Zadaj názov jedla!', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/poll/add-option`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                name,
                emoji: '',
                guest_id: currentGuest.id
            })
        });

        const data = await response.json();
        
        if (response.ok) {
            nameInput.value = '';
            loadPoll();
            showPollMessage(`Možnosť "${name}" pridaná! 🎉`, 'success');
        } else {
            showPollMessage('Chyba: ' + data.error, 'error');
        }
    } catch (error) {
        showPollMessage('Chyba pri pridávaní: ' + error.message, 'error');
    }
}

