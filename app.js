//API KEY
const API_KEY = "b0e8031cb2c94c32c281586b7a9fbb9e";

class SearchComponent {
  constructor() {
    // DOM Elements
    this.container = document.getElementById("search-container");
    this.input = document.getElementById("search-input");
    this.resultsGrid = document.getElementById("results-grid");
    this.statusText = document.getElementById("status-text");

    // State & Orchestration
    this.cache = new Map();
    this.debounceTimer = null;
    this.abortController = null;

    this.init();
  }

  init() {
    this.input.addEventListener("input", (e) => this.handleInput(e));
  }

  handleInput(e) {
    const query = e.target.value.trim();

    // 1. Debounce
    clearTimeout(this.debounceTimer);

    if (!query) {
      this.setState("idle");
      this.resultsGrid.innerHTML = "";
      return;
    }
 // 2. Set the 300ms delay
    this.debounceTimer = setTimeout(() => this.executeSearch(query), 300);
  }

  async executeSearch(query) {
    if (this.cache.has(query.toLowerCase())) {
      console.log(`%c Cache Hit: ${query}`, "color: #00ff00");
      this.render(this.cache.get(query.toLowerCase()));
      return;
    }

    // 3. ABORT PATTERN
    if (this.abortController) {
      this.abortController.abort();
    }

    this.abortController = new AbortController();
    const signal = this.abortController.signal;

    this.setState("loading");
}
}
