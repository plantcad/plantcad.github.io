const HUGGING_FACE_DOWNLOADS_CONFIG = {
    ORGS: ['kuleshov-group'],
    MODEL_REPO_NAME_PATTERNS: ['plantcad', 'plantcaduceus'],
    API_BASE_URL: 'https://huggingface.co/api/models',
    LIMIT: 1000,
};

function buildDownloadsEndpoint(org) {
    return `${HUGGING_FACE_DOWNLOADS_CONFIG.API_BASE_URL}?author=${encodeURIComponent(org)}&expand[]=downloadsAllTime&limit=${HUGGING_FACE_DOWNLOADS_CONFIG.LIMIT}`;
}

function modelMatchesConfig(model) {
    if (!model || typeof model.id !== 'string') {
        return false;
    }

    const repoName = model.id.split('/').pop().toLowerCase();
    return HUGGING_FACE_DOWNLOADS_CONFIG.MODEL_REPO_NAME_PATTERNS.some(function(pattern) {
        return repoName.includes(pattern.toLowerCase());
    });
}

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
        return model.downloadsAllTime;
    }));
    trackList.innerHTML = '';

    models.forEach(function(model) {
        const row = document.createElement('a');
        const modelId = document.createElement('span');
        const track = document.createElement('span');
        const fill = document.createElement('span');
        const downloads = document.createElement('span');
        const percent = maxDownloads > 0 ? (model.downloadsAllTime / maxDownloads) * 100 : 0;

        row.href = `https://huggingface.co/${model.id}`;
        row.target = '_blank';
        row.rel = 'noopener';
        row.className = 'downloads-track-row';
        row.setAttribute('role', 'listitem');
        row.setAttribute('aria-label', `${model.id}: ${formatNumber(model.downloadsAllTime)} all-time downloads on Hugging Face`);

        modelId.className = 'downloads-track-model';
        modelId.textContent = model.id;

        track.className = 'downloads-track';
        fill.className = 'downloads-track-fill';
        fill.style.setProperty('--download-share', `${percent}%`);
        track.appendChild(fill);

        downloads.className = 'downloads-track-count';
        downloads.textContent = formatNumber(model.downloadsAllTime);

        row.appendChild(modelId);
        row.appendChild(track);
        row.appendChild(downloads);
        trackList.appendChild(row);
    });
}

function renderEndpoint(endpoints) {
    const endpointLink = document.getElementById('downloads-endpoint-link');
    endpointLink.href = endpoints[0];
    endpointLink.textContent = endpoints[0];
}

function renderDownloads(models, endpoints, loadedAt) {
    const total = models.reduce(function(sum, model) {
        return sum + model.downloadsAllTime;
    }, 0);

    animateTotal(total);
    document.getElementById('downloads-live-copy').innerHTML =
        `live from the Hugging Face API &middot; updated <time datetime="${loadedAt.toISOString()}">${formatLoadedAt(loadedAt)}</time>`;
    document.getElementById('downloads-meta').textContent =
        `${formatNumber(models.length)} PlantCAD models`;
    document.getElementById('downloads-loaded-at').textContent = formatLoadedAt(loadedAt);
    document.getElementById('downloads-loaded-at').dateTime = loadedAt.toISOString();

    renderModels(models);
    renderEndpoint(endpoints);
    hideStatus();
    document.getElementById('downloads-results').classList.remove('is-hidden');
    document.body.classList.add('downloads-results-ready');
}

async function fetchModelDownloads() {
    const endpoints = HUGGING_FACE_DOWNLOADS_CONFIG.ORGS.map(buildDownloadsEndpoint);
    const responses = await Promise.all(endpoints.map(function(endpoint) {
        return fetch(endpoint);
    }));

    responses.forEach(function(response) {
        if (!response.ok) {
            throw new Error(`Hugging Face API returned ${response.status}`);
        }
    });

    const payloads = await Promise.all(responses.map(function(response) {
        return response.json();
    }));

    const models = payloads
        .flat()
        .filter(modelMatchesConfig)
        .map(function(model) {
            return {
                id: model.id,
                downloadsAllTime: Number.isInteger(model.downloadsAllTime) ? model.downloadsAllTime : 0,
            };
        })
        .sort(function(a, b) {
            return b.downloadsAllTime - a.downloadsAllTime || a.id.localeCompare(b.id);
        });

    return { endpoints, models };
}

document.addEventListener('DOMContentLoaded', async function() {
    try {
        const loadedAt = new Date();
        const result = await fetchModelDownloads();

        if (result.models.length === 0) {
            showStatus(
                `No matching PlantCAD model repositories were found in the Hugging Face API response. View the source data at <a href="${result.endpoints[0]}" target="_blank" rel="noopener">${result.endpoints[0]}</a>.`,
                false
            );
            return;
        }

        renderDownloads(result.models, result.endpoints, loadedAt);
    } catch (error) {
        const endpoint = buildDownloadsEndpoint(HUGGING_FACE_DOWNLOADS_CONFIG.ORGS[0]);
        showStatus(
            `Couldn't reach the Hugging Face API — refresh to try again, or view the data at <a href="${endpoint}" target="_blank" rel="noopener">${endpoint}</a>.`,
            true
        );
    }
});
