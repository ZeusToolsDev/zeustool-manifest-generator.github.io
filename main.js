document.addEventListener('DOMContentLoaded', () => {
    const searchBtn = document.getElementById('searchBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const appidInput = document.getElementById('appid');
    const resultDiv = document.getElementById('result');
    const errorDiv = document.getElementById('error');
    const errorText = document.getElementById('errorText');
    const gameHeader = document.getElementById('gameHeader');
    const gameName = document.getElementById('gameName');
    const gameDescription = document.getElementById('gameDescription');
    const fileCount = document.getElementById('fileCount');
    const fileList = document.getElementById('fileList');
    const searchHistory = document.getElementById('searchHistory');
    const quickLinks = document.getElementById('quickLinks');
    const clearHistoryBtn = document.getElementById('clearHistoryBtn');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const releaseDate = document.getElementById('releaseDate');
    const developer = document.getElementById('developer');
    const genres = document.getElementById('genres');
    const languages = document.getElementById('languages');
    
    let currentAppId = null;
    let searchResults = [];
    
    // Load search history from localStorage
    const loadHistory = () => {
        const history = JSON.parse(localStorage.getItem('searchHistory') || '[]');
        searchHistory.innerHTML = '';
        
        history.forEach(item => {
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item d-flex align-items-center';
            historyItem.innerHTML = `
                <img src="https://cdn.cloudflare.steamstatic.com/steam/apps/${item.appid}/header.jpg" 
                     class="me-3" alt="${item.name}">
                <div>
                    <div class="game-title">${item.name}</div>
                    <div class="game-id">AppID: ${item.appid}</div>
                </div>
            `;
            historyItem.addEventListener('click', () => {
                appidInput.value = item.appid;
                searchBtn.click();
            });
            searchHistory.appendChild(historyItem);
        });
    };
    
    // Add to search history
    const addToHistory = (appid, gameData) => {
        const history = JSON.parse(localStorage.getItem('searchHistory') || '[]');
        const existingIndex = history.findIndex(item => item.appid === appid);
        
        if (existingIndex !== -1) {
            history.splice(existingIndex, 1);
        }
        
        history.unshift({
            appid,
            name: gameData.name,
            timestamp: Date.now()
        });
        
        // Keep only last 10 items
        if (history.length > 10) {
            history.pop();
        }
        
        localStorage.setItem('searchHistory', JSON.stringify(history));
        loadHistory();
    };
    
    // Clear history
    clearHistoryBtn.addEventListener('click', () => {
        localStorage.removeItem('searchHistory');
        loadHistory();
    });
    
    // Update quick links
    const updateQuickLinks = (appid) => {
        const steamStoreUrl = `https://store.steampowered.com/app/${appid}/`;
        const steamDbUrl = `https://steamdb.info/app/${appid}/`;
        
        quickLinks.innerHTML = `
            <a href="${steamStoreUrl}" target="_blank" class="quick-link">
                View on Steam Store
            </a>
            <a href="${steamDbUrl}" target="_blank" class="quick-link">
                View on SteamDB
            </a>
        `;
    };
    
    // Search functionality
    searchBtn.addEventListener('click', async () => {
        const appid = appidInput.value.trim();
        if (!appid) {
            showError('Please enter a Steam AppID');
            return;
        }
        
        if (!/^\d+$/.test(appid)) {
            showError('Invalid AppID format');
            return;
        }
        
        setLoading(true);
        try {
            const response = await fetch(`/api/search/${appid}`);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to search for manifests');
            }
            
            if (data.success) {
                currentAppId = appid;
                searchResults = data.files;
                displayResults(data);
                if (data.game) {
                    addToHistory(appid, data.game);
                    updateQuickLinks(appid);
                }
            }
        } catch (error) {
            showError(error.message);
        } finally {
            setLoading(false);
        }
    });
    
    // Download functionality
    downloadBtn.addEventListener('click', async () => {
        if (!currentAppId) return;
        
        setDownloadLoading(true);
        loadingOverlay.style.display = 'flex';
        
        try {
            const response = await fetch(`/api/download/${currentAppId}`);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to generate download');
            }
            
            if (data.success) {
                window.location.href = data.downloadUrl;
            }
        } catch (error) {
            showError(error.message);
        } finally {
            setDownloadLoading(false);
            loadingOverlay.style.display = 'none';
        }
    });
    
    // Helper functions
    function displayResults(data) {
        resultDiv.style.display = 'block';
        errorDiv.style.display = 'none';
        
        if (data.game) {
            gameHeader.src = `https://cdn.cloudflare.steamstatic.com/steam/apps/${currentAppId}/header.jpg`;
            gameName.textContent = data.game.name;
            gameDescription.textContent = data.game.short_description || 'No description available.';
            
            // Update game details
            releaseDate.textContent = data.game.release_date?.date || 'Unknown';
            developer.textContent = data.game.developers?.[0] || 'Unknown';
            genres.textContent = data.game.genres?.map(g => g.description).join(', ') || 'Unknown';
            languages.textContent = data.game.supported_languages?.split(',')[0] || 'Unknown';
        }
        
        // Update file list
        fileList.innerHTML = '';
        data.files.forEach(file => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            fileItem.innerHTML = `
                <i class="bi bi-file-earmark-text"></i>
                <span class="file-name">${file.name}</span>
            `;
            fileList.appendChild(fileItem);
        });
        
        fileCount.textContent = `Found ${data.filesFound} manifest file(s)`;
        downloadBtn.style.display = data.filesFound > 0 ? 'inline-block' : 'none';
    }
    
    function showError(message) {
        errorText.textContent = message;
        errorDiv.style.display = 'block';
        resultDiv.style.display = 'none';
    }
    
    function setLoading(isLoading) {
        searchBtn.disabled = isLoading;
        appidInput.disabled = isLoading;
        if (isLoading) {
            searchBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Searching...';
        } else {
            searchBtn.innerHTML = '<i class="bi bi-search"></i> Search';
        }
    }
    
    function setDownloadLoading(isLoading) {
        downloadBtn.disabled = isLoading;
        const spinner = downloadBtn.querySelector('.spinner-border');
        if (isLoading) {
            spinner.classList.remove('d-none');
            downloadBtn.innerHTML = `
                <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                Preparing Download...
            `;
        } else {
            spinner.classList.add('d-none');
            downloadBtn.innerHTML = '<i class="bi bi-download"></i> Download Manifests';
        }
    }
    
    // Initialize
    loadHistory();
    
    // Enter key support
    appidInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !searchBtn.disabled) {
            searchBtn.click();
        }
    });

    // Add copyright notice
    const footer = document.createElement('div');
    footer.className = 'text-center mt-4 mb-3 text-muted';
    footer.innerHTML = `
        <hr>
        <small>© ${new Date().getFullYear()} Created by Rxses • 
        <a href="https://discord.gg/bp78Dz6gnN" target="_blank">Join our Discord</a></small>
    `;
    document.body.appendChild(footer);
}); 