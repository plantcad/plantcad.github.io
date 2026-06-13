const HUGGING_FACE_DOWNLOADS_CONFIG = {
    SNAPSHOT_URL: 'downloads.json',
};

function formatNumber(value) {
    return new Intl.NumberFormat('en-US').format(value);
}

function formatLoadedAt(date) {
    return new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(date);
}

function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function animateTotal(total) {
    const totalElement = document.getElementById('downloads-total');

    if (prefersReducedMotion()) {
        totalElement.textContent = formatNumber(total);
        return;
    }

    const duration = 900;
    const startedAt = performance.now();

    function step(now) {
        const elapsed = now - startedAt;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        totalElement.textContent = formatNumber(Math.round(total * eased));

        if (progress < 1) {
            requestAnimationFrame(step);
        }
    }

    requestAnimationFrame(step);
}

function showStatus(message, isError) {
    const status = document.getElementById('downloads-status');
    status.innerHTML = message;
    status.classList.toggle('is-error', Boolean(isError));
    status.classList.remove('is-hidden');
}

function hideStatus() {
    document.getElementById('downloads-status').classList.add('is-hidden');
}

function renderModels(models) {
    const trackList = document.getElementById('downloads-models');
    const maxDownloads = Math.max.apply(null, models.map(function(model) {
        return model.downloads;
    }));
    trackList.innerHTML = '';

    models.forEach(function(model) {
        const row = document.createElement('a');
        const modelId = document.createElement('span');
        const track = document.createElement('span');
        const fill = document.createElement('span');
        const downloads = document.createElement('span');
        const percent = maxDownloads > 0 ? (model.downloads / maxDownloads) * 100 : 0;

        row.href = `https://huggingface.co/${model.id}`;
        row.target = '_blank';
        row.rel = 'noopener';
        row.className = 'downloads-track-row';
        row.setAttribute('role', 'listitem');
        row.setAttribute('aria-label', `${model.id}: ${formatNumber(model.downloads)} all-time downloads on Hugging Face`);

        modelId.className = 'downloads-track-model';
        modelId.textContent = model.id;

        track.className = 'downloads-track';
        fill.className = 'downloads-track-fill';
        fill.style.setProperty('--download-share', `${percent}%`);
        track.appendChild(fill);

        downloads.className = 'downloads-track-count';
        downloads.textContent = formatNumber(model.downloads);

        row.appendChild(modelId);
        row.appendChild(track);
        row.appendChild(downloads);
        trackList.appendChild(row);
    });
}

function renderEndpoint(endpoint) {
    const endpointLink = document.getElementById('downloads-endpoint-link');
    endpointLink.href = endpoint;
    endpointLink.textContent = endpoint;
}

function renderDownloads(snapshot) {
    const updatedAt = new Date(snapshot.updated);
    const models = snapshot.models;
    const total = Number.isInteger(snapshot.total) ? snapshot.total : models.reduce(function(sum, model) {
        return sum + model.downloads;
    }, 0);

    animateTotal(total);
    document.getElementById('downloads-live-copy').innerHTML =
        `Updated <time datetime="${updatedAt.toISOString()}">${formatLoadedAt(updatedAt)}</time> (refreshed daily)`;
    document.getElementById('downloads-meta').textContent =
        `${formatNumber(snapshot.count || models.length)} PlantCAD models`;
    document.getElementById('downloads-loaded-at').textContent = formatLoadedAt(updatedAt);
    document.getElementById('downloads-loaded-at').dateTime = updatedAt.toISOString();

    renderModels(models);
    renderEndpoint(snapshot.source);
    hideStatus();
    document.getElementById('downloads-results').classList.remove('is-hidden');
    document.body.classList.add('downloads-results-ready');
}

function isValidSnapshot(snapshot) {
    return snapshot
        && typeof snapshot.updated === 'string'
        && typeof snapshot.source === 'string'
        && Array.isArray(snapshot.models)
        && snapshot.models.every(function(model) {
            return model
                && typeof model.id === 'string'
                && Number.isInteger(model.downloads);
        });
}

async function fetchDownloadSnapshot() {
    const response = await fetch(HUGGING_FACE_DOWNLOADS_CONFIG.SNAPSHOT_URL, { cache: 'no-store' });
    if (!response.ok) {
        throw new Error(`downloads.json returned ${response.status}`);
    }

    const snapshot = await response.json();
    if (!isValidSnapshot(snapshot)) {
        throw new Error('downloads.json is missing required fields');
    }

    return snapshot;
}

document.addEventListener('DOMContentLoaded', async function() {
    try {
        const snapshot = await fetchDownloadSnapshot();

        if (snapshot.models.length === 0) {
            showStatus(
                `No matching PlantCAD model repositories are present in the local download snapshot. View the source endpoint at <a href="${snapshot.source}" target="_blank" rel="noopener">${snapshot.source}</a>.`,
                false
            );
            return;
        }

        renderDownloads(snapshot);
    } catch (error) {
        showStatus(
            `Couldn't load <code>${HUGGING_FACE_DOWNLOADS_CONFIG.SNAPSHOT_URL}</code>. The static download snapshot is missing or invalid; rerun the GitHub Actions refresh workflow to regenerate it.`,
            true
        );
    }
});
