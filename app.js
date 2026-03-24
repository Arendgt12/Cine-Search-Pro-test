const API_KEY = "b0e8031cb2c94c32c281586b7a9fbb9e";
const BASE_URL = 'https://api.themoviedb.org/3';

function SearchComponent() {
  // DOM Elements
  const input = document.getElementById('search-input');
  const resultList = document.getElementById('result-list');
  const detailPanel = document.getElementById('detail-panel');
  const template = document.getElementById('movie-card-template');
  const searchContainer = document.getElementById('search-container');

  if (!input || !resultList || !detailPanel || !template || !searchContainer) return;
  
  // App State
  let activeIndex = -1;
  const cache = new Map();
  let timerId = null;
  let controller = null;

  // Rate-limiting search to save bandwidth (Debounce)
  function onInput() {
    clearTimeout(timerId);
    timerId = setTimeout(() => {
      const query = input.value.trim();
      if (query.length < 2) return;
      search(query);
    }, 300);
  }

  // Network orchestration and data fetching
  async function search(query) {
    const cacheKey = query.toLowerCase();

    if (cache.has(cacheKey)) {
      render(cache.get(cacheKey), query);
      return;
    }

    //(Abort Pattern)
    if (controller) controller.abort();
    controller = new AbortController();

    try {
      searchContainer.dataset.state = 'loading';
      const res = await fetch(
        `${BASE_URL}/search/movie?query=${encodeURIComponent(query)}&api_key=${API_KEY}`,
        { signal: controller.signal }
      );

      if (!res.ok) throw new Error('API error');

      const data = await res.json(); 
      cache.set(cacheKey, data.results);
      render(data.results, query);

    } catch (err) {
      if (err.name === 'AbortError') return;
      searchContainer.dataset.state = 'error';
    } finally {
      //Reset UI state only if not aborted
      if (searchContainer.dataset.state === 'loading') {
          searchContainer.dataset.state = 'success';
      }
    }
  }

  // Efficient DOM rendering
  function render(results, query) {
    activeIndex = -1;
    resultList.textContent = '';
    const frag = new DocumentFragment(); 

    results.forEach(movie => {
        const clone = template.content.cloneNode(true);
        const cardTitle = clone.querySelector('.card-title');
        cardTitle.append(buildHighlightedTitle(movie.title, query)); 

        const img = clone.querySelector('.card-poster');
        img.src = movie.poster_path 
            ? `https://image.tmdb.org/t/p/w92${movie.poster_path}` 
            : 'https://via.placeholder.com/92x138?text=No+Image';
    
        const li = clone.querySelector('.movie-card');
        li.addEventListener("click", () => fetchDetails(movie.id));

        frag.appendChild(clone);
    });

    resultList.appendChild(frag);
    searchContainer.dataset.state = results.length ? 'success' : 'empty';
  }

  // Concurrent fetching for deep-dive movie info
  async function fetchDetails(id) {
    searchContainer.dataset.state = 'loading';
    try {
      const endpoints = [
        `${BASE_URL}/movie/${id}?api_key=${API_KEY}`,
        `${BASE_URL}/movie/${id}/credits?api_key=${API_KEY}`
      ];

      // Execute network requests
      const results = await Promise.allSettled(endpoints.map(url => 
          fetch(url).then(res => res.ok ? res.json() : null)
      ));

      const [details, credits] = results.map(r => r.status === 'fulfilled' ? r.value : null);

      if (!details) throw new Error("Crucial data missing");

      detailPanel.textContent = '';
      
      // Navigation: Back button to return to the search results grid
      const backBtn = document.createElement('button');
      backBtn.textContent = "← Back to Results";
      backBtn.className = "back-button";
      backBtn.onclick = () => searchContainer.dataset.state = 'success';
      detailPanel.append(backBtn);

      const h2 = document.createElement('h2');
      h2.textContent = details.title;
      detailPanel.append(h2);

      const p = document.createElement('p');
      p.textContent = details.overview;
      detailPanel.append(p);

      if (credits && credits.cast.length) {
          const cast = document.createElement('p');
          cast.innerHTML = `<strong>Cast:</strong> ` + credits.cast.slice(0, 5).map(a => a.name).join(', ');
          detailPanel.append(cast);
      }

      // Switch to 'details' state to persist the view and hide the grid
      searchContainer.dataset.state = 'details';

    } catch (err) {
      console.error('Details failed:', err);
      searchContainer.dataset.state = 'error';
    }
  }

  // Keyboard accessibility
  function onKeyDown(e) {
    const items = resultList.querySelectorAll('.movie-card');
    if (e.key === 'ArrowDown') {
      activeIndex = Math.min(activeIndex + 1, items.length - 1);
    } else if (e.key === 'ArrowUp') {
      activeIndex = Math.max(activeIndex - 1, 0);
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      items[activeIndex].click();
    }

    items.forEach((item, idx) => item.classList.toggle('active', idx === activeIndex));
  }

  input.addEventListener('input', onInput);
  input.addEventListener('keydown', onKeyDown);
}

// UI Polish
function buildHighlightedTitle(title, query) {
  const container = document.createElement('span');
  const idx = title.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) { container.textContent = title; return container; }  
  
  const before = document.createTextNode(title.slice(0, idx));  
  const match = document.createElement('span');  
  match.className = 'highlight';  
  match.textContent = title.slice(idx, idx + query.length);
  const after = document.createTextNode(title.slice(idx + query.length)); 
  
  container.append(before, match, after);  
  return container;
}

SearchComponent();